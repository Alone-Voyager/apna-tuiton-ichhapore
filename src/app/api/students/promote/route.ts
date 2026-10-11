import { NextRequest, NextResponse } from 'next/server';
import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { supabaseAdmin } from '../../../../lib/supabase/client';

// POST /api/students/promote - Promote a student to a different class
export async function POST(request: NextRequest) {
  try {
    const response = NextResponse.json({ success: true });

    const supabase = createServerClient(
      'https://cgbwcayquqpgbnyxnyzw.supabase.co',
      'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNnYndjYXlxdXFwZ2JueXhueXp3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjIwNTkzNTgsImV4cCI6MjA3NzYzNTM1OH0._KmePMak2LvDcnCe8M8_70NeZmyTfp7iw69gw6acoNg',
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

    // Get request body
    const body = await request.json();
    const { studentId, newClassId, oldClassId } = body;

    if (!studentId || !newClassId) {
      return NextResponse.json(
        { error: 'Student ID and new class ID are required' },
        { status: 400 }
      );
    }

    // Verify student exists
    const { data: student, error: studentError } = await supabaseAdmin
      .from('students')
      .select('id, class_id')
      .eq('id', studentId)
      .single();

    if (studentError || !student) {
      return NextResponse.json(
        { error: 'Student not found' },
        { status: 404 }
      );
    }

    // Verify new class exists
    const { data: newClass, error: classError } = await supabaseAdmin
      .from('classes')
      .select('id, total_students')
      .eq('id', newClassId)
      .single();

    if (classError || !newClass) {
      return NextResponse.json(
        { error: 'Class not found' },
        { status: 404 }
      );
    }

    // Start the promotion process
    // Step 1: Update student's class_id
    const { error: updateError } = await supabaseAdmin
      .from('students')
      .update({ 
        class_id: newClassId,
        updated_at: new Date().toISOString()
      })
      .eq('id', studentId);

    if (updateError) {
      console.error('Error updating student class:', updateError);
      return NextResponse.json(
        { error: 'Failed to update student class' },
        { status: 500 }
      );
    }

    // Step 2: Decrement old class student count (if student had a class)
    if (oldClassId) {
      const { error: decrementError } = await supabaseAdmin.rpc('decrement_class_student_count', {
        class_id: oldClassId
      });

      if (decrementError) {
        console.error('Error decrementing old class count:', decrementError);
        // Try manual decrement as fallback
        const { data: oldClass } = await supabaseAdmin
          .from('classes')
          .select('total_students')
          .eq('id', oldClassId)
          .single();

        if (oldClass) {
          await supabaseAdmin
            .from('classes')
            .update({ 
              total_students: Math.max(0, (oldClass.total_students || 1) - 1),
              updated_at: new Date().toISOString()
            })
            .eq('id', oldClassId);
        }
      }
    }

    // Step 3: Increment new class student count
    const { error: incrementError } = await supabaseAdmin.rpc('increment_class_student_count', {
      class_id: newClassId
    });

    if (incrementError) {
      console.error('Error incrementing new class count:', incrementError);
      // Try manual increment as fallback
      await supabaseAdmin
        .from('classes')
        .update({ 
          total_students: (newClass.total_students || 0) + 1,
          updated_at: new Date().toISOString()
        })
        .eq('id', newClassId);
    }

    return NextResponse.json(
      { 
        success: true,
        message: 'Student promoted successfully',
        data: {
          studentId,
          newClassId,
          oldClassId
        }
      },
      { status: 200 }
    );

  } catch (error) {
    console.error('Error in promote student API:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
