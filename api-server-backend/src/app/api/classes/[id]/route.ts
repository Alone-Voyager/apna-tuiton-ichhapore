import { NextRequest, NextResponse } from 'next/server';
import { createServerClient, type CookieOptions } from '@supabase/ssr';

// DELETE /api/classes/[id] - Delete a class (hard delete - permanently removes from database)
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Await params in Next.js 15
    const { id: classId } = await params;

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
      console.error('DELETE /api/classes/[id] - Error fetching user profile:', userError);
      return NextResponse.json(
        { error: 'Organization not found' },
        { status: 404 }
      );
    }

    if (!classId) {
      return NextResponse.json(
        { error: 'Class ID is required' },
        { status: 400 }
      );
    }

    // Verify the class belongs to the user's organization
    const { data: classData, error: classError } = await supabase
      .from('classes')
      .select('id, organization_id, name')
      .eq('id', classId)
      .eq('organization_id', userData.organization_id)
      .single();

    if (classError || !classData) {
      return NextResponse.json(
        { error: 'Class not found or access denied' },
        { status: 404 }
      );
    }

    // Check if there are students in this class
    const { data: students, error: studentsError, count } = await supabase
      .from('students')
      .select('id', { count: 'exact', head: true })
      .eq('class_id', classId)
      .eq('is_active', true);

    if (studentsError) {
      console.error('Error checking students:', studentsError);
    }

    // Prevent deletion if there are active students in the class
    if (count && count > 0) {
      return NextResponse.json(
        { error: `Cannot delete class. There are ${count} active student(s) in this class. Please reassign or remove them first.` },
        { status: 400 }
      );
    }

    // Hard delete the class (permanently remove from database)
    const { error: deleteError } = await supabase
      .from('classes')
      .delete()
      .eq('id', classId)
      .eq('organization_id', userData.organization_id);

    if (deleteError) {
      console.error('Error deleting class:', deleteError);
      return NextResponse.json(
        { error: 'Failed to delete class' },
        { status: 500 }
      );
    }

    return NextResponse.json(
      { 
        success: true, 
        message: `Class "${classData.name}" deleted successfully` 
      },
      { status: 200, headers: response.headers }
    );
  } catch (error) {
    console.error('Unexpected error in DELETE /api/classes/[id]:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
