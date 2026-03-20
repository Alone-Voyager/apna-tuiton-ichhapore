import { NextRequest, NextResponse } from 'next/server';
import { createServerClient, type CookieOptions } from '@supabase/ssr';

/**
 * POST /api/attendance/reactivate-student
 * Reactivate a suspended student
 */
export async function POST(request: NextRequest) {
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

    const body = await request.json();
    const { studentId, adminId, reason } = body;

    if (!studentId || !adminId) {
      return NextResponse.json(
        { error: 'Student ID and Admin ID are required' },
        { status: 400 }
      );
    }

    // Call the reactivation function
    const { data, error } = await supabase
      .rpc('reactivate_suspended_student', {
        p_student_id: studentId,
        p_admin_id: adminId,
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
    }, {
      headers: response.headers
    });
  } catch (error) {
    console.error('Error in student reactivation:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
