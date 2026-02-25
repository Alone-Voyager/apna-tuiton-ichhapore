import { NextRequest, NextResponse } from 'next/server';
import { createServerClient, type CookieOptions } from '@supabase/ssr';

// DELETE /api/students/[id] - Delete a student (soft delete by default, hard delete optional)
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const response = NextResponse.json({ success: true });

    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          get(name: string) {
            return request.cookies.get(name)?.value;
          },
          set(name: string, value: string, options: CookieOptions) {
            response.cookies.set({
              name,
              value,
              ...options,
            });
          },
          remove(name: string, options: CookieOptions) {
            response.cookies.set({
              name,
              value: '',
              ...options,
            });
          },
        },
      }
    );

    // Get the authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Get user's organization_id from the admin_profiles table
    const { data: userData, error: userError } = await supabase
      .from('admin_profiles')
      .select('organization_id, id')
      .eq('user_id', user.id)
      .single();

    if (userError || !userData?.organization_id) {
      console.error('DELETE /api/students/[id] - Error fetching user profile:', userError);
      return NextResponse.json(
        { error: 'Organization not found' },
        { status: 404 }
      );
    }

    // Get student ID from params
    const resolvedParams = await params;
    const studentId = resolvedParams.id;

    if (!studentId) {
      return NextResponse.json(
        { error: 'Student ID is required' },
        { status: 400 }
      );
    }

    // Check if the student exists and belongs to the user's organization
    const { data: student, error: studentError } = await supabase
      .from('students')
      .select('id, name, class_id, organization_id, status, classes(name)')
      .eq('id', studentId)
      .eq('organization_id', userData.organization_id)
      .single();

    if (studentError || !student) {
      console.error('Student not found or access denied:', studentError);
      return NextResponse.json(
        { error: 'Student not found or you do not have permission to delete this student' },
        { status: 404 }
      );
    }

    // Parse query parameters to check delete type
    const { searchParams } = new URL(request.url);
    const deleteType = searchParams.get('type') || 'soft'; // 'soft' or 'hard'

    if (deleteType === 'hard') {
      // HARD DELETE - Permanently remove from database
      // This will cascade delete all related records (attendance, fees, etc.)
      
      const { error: deleteError } = await supabase
        .from('students')
        .delete()
        .eq('id', studentId)
        .eq('organization_id', userData.organization_id);

      if (deleteError) {
        console.error('Error deleting student (hard):', deleteError);
        return NextResponse.json(
          { error: 'Failed to delete student' },
          { status: 500 }
        );
      }

      // Update class student count if student was in a class
      if (student.class_id) {
        const { data: classData, error: classError } = await supabase
          .from('classes')
          .select('total_students')
          .eq('id', student.class_id)
          .single();

        if (!classError && classData) {
          const newCount = Math.max((classData.total_students || 1) - 1, 0);
          await supabase
            .from('classes')
            .update({ total_students: newCount })
            .eq('id', student.class_id);
        }
      }

      // Log activity
      await supabase
        .from('activity_logs')
        .insert({
          organization_id: userData.organization_id,
          activity_type: 'student_deletion',
          description: `Student "${student.name}" permanently deleted from ${(student as any).classes?.name || 'system'}`,
          related_entity_type: 'student',
          related_entity_id: studentId,
          performed_by: userData.id,
          metadata: {
            student_name: student.name,
            class_id: student.class_id,
            delete_type: 'hard'
          }
        });

      return NextResponse.json(
        { 
          success: true, 
          message: 'Student permanently deleted',
          deleteType: 'hard'
        },
        { status: 200, headers: response.headers }
      );

    } else {
      // SOFT DELETE - Mark as inactive (default and recommended)
      
      const { error: updateError } = await supabase
        .from('students')
        .update({ 
          is_active: false,
          status: 'inactive',
          updated_at: new Date().toISOString()
        })
        .eq('id', studentId)
        .eq('organization_id', userData.organization_id);

      if (updateError) {
        console.error('Error deleting student (soft):', updateError);
        return NextResponse.json(
          { error: 'Failed to deactivate student' },
          { status: 500 }
        );
      }

      // Update class student count if student was in a class
      if (student.class_id) {
        const { data: classData, error: classError } = await supabase
          .from('classes')
          .select('total_students')
          .eq('id', student.class_id)
          .single();

        if (!classError && classData) {
          const newCount = Math.max((classData.total_students || 1) - 1, 0);
          await supabase
            .from('classes')
            .update({ total_students: newCount })
            .eq('id', student.class_id);
        }
      }

      // Log activity
      await supabase
        .from('activity_logs')
        .insert({
          organization_id: userData.organization_id,
          activity_type: 'student_status_change',
          description: `Student "${student.name}" marked as inactive`,
          related_entity_type: 'student',
          related_entity_id: studentId,
          performed_by: userData.id,
          metadata: {
            student_name: student.name,
            class_id: student.class_id,
            previous_status: student.status,
            new_status: 'inactive',
            delete_type: 'soft'
          }
        });

      return NextResponse.json(
        { 
          success: true, 
          message: 'Student deactivated successfully',
          deleteType: 'soft'
        },
        { status: 200, headers: response.headers }
      );
    }

  } catch (error) {
    console.error('Unexpected error in DELETE /api/students/[id]:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// PATCH /api/students/[id] - Update student details
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const response = NextResponse.json({ success: true });

    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          get(name: string) {
            return request.cookies.get(name)?.value;
          },
          set(name: string, value: string, options: CookieOptions) {
            response.cookies.set({
              name,
              value,
              ...options,
            });
          },
          remove(name: string, options: CookieOptions) {
            response.cookies.set({
              name,
              value: '',
              ...options,
            });
          },
        },
      }
    );

    // Get the authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Get user's organization_id from the admin_profiles table
    const { data: userData, error: userError } = await supabase
      .from('admin_profiles')
      .select('organization_id')
      .eq('user_id', user.id)
      .single();

    if (userError || !userData?.organization_id) {
      return NextResponse.json(
        { error: 'User organization not found' },
        { status: 403 }
      );
    }

    const organizationId = userData.organization_id;
    const { id: studentId } = await params;

    // Get request body
    const body = await request.json();
    const {
      name,
      admission_date,
      date_of_birth,
      gender,
      email,
      address,
      monthly_fee,
      status,
      notes,
    } = body;

    // Validate required fields
    if (!name || !monthly_fee) {
      return NextResponse.json(
        { error: 'Name and monthly fee are required' },
        { status: 400 }
      );
    }

    // Verify student belongs to the organization
    const { data: existingStudent, error: studentError } = await supabase
      .from('students')
      .select('id, organization_id')
      .eq('id', studentId)
      .eq('organization_id', organizationId)
      .single();

    if (studentError || !existingStudent) {
      return NextResponse.json(
        { error: 'Student not found' },
        { status: 404 }
      );
    }

    // Update student details
    const { data: updatedStudent, error: updateError } = await supabase
      .from('students')
      .update({
        name,
        admission_date,
        date_of_birth,
        gender,
        email,
        address,
        monthly_fee: parseFloat(monthly_fee),
        status,
        notes,
        updated_at: new Date().toISOString(),
      })
      .eq('id', studentId)
      .select()
      .single();

    if (updateError) {
      console.error('Error updating student:', updateError);
      return NextResponse.json(
        { error: 'Failed to update student details' },
        { status: 500 }
      );
    }

    return NextResponse.json(
      {
        success: true,
        message: 'Student details updated successfully',
        data: updatedStudent,
      },
      { status: 200 }
    );

  } catch (error) {
    console.error('Error in update student API:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
