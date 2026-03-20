import { NextRequest, NextResponse } from 'next/server';
import { getRequestOrgContext } from '../../../../lib/supabase/server';

/**
 * POST /api/attendance/reactivate-student
 * Reactivate a suspended student
 */
export async function POST(request: NextRequest) {
  try {
    const { supabase, user } = await getRequestOrgContext(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { studentId, reason } = body;

    if (!studentId) {
      return NextResponse.json(
        { error: 'Student ID is required' },
        { status: 400 }
      );
    }

    const { data: adminProfile } = await supabase
      .from('admin_profiles')
      .select('id')
      .eq('user_id', user.id)
      .eq('is_active', true)
      .maybeSingle();

    if (!adminProfile?.id) {
      return NextResponse.json({ error: 'Admin profile not found' }, { status: 403 });
    }

    // Call the reactivation function
    const { data, error } = await supabase
      .rpc('reactivate_suspended_student', {
        p_student_id: studentId,
        p_admin_id: adminProfile.id,
        p_reason: reason || 'Manual reactivation by admin'
      });

    if (error) {
      console.error('Error reactivating student:', error);
      return NextResponse.json(
        { error: 'Failed to reactivate student', details: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: data,
      message: data ? 'Student reactivated successfully' : 'Student not found or not suspended'
    });
  } catch (error) {
    console.error('Error in student reactivation:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
