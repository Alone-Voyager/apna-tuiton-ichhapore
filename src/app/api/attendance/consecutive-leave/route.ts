import { NextRequest, NextResponse } from 'next/server';
import { createServerClient, type CookieOptions } from '@supabase/ssr';

/**
 * GET /api/attendance/consecutive-leave
 * Get students at risk of suspension due to consecutive leave days
 */
export async function GET(request: NextRequest) {
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
    
    // Get organization_id from query params or session
    const { searchParams } = new URL(request.url);
    const organizationId = searchParams.get('organization_id');
    
    if (!organizationId) {
      return NextResponse.json(
        { error: 'Organization ID is required' },
        { status: 400 }
      );
    }

    // Get students at risk (5-6 consecutive leaves)
    const { data: atRiskStudents, error: riskError } = await supabase
      .rpc('get_students_at_risk_of_suspension', {
        p_organization_id: organizationId
      });

    if (riskError) {
      console.error('Error fetching at-risk students:', riskError);
      return NextResponse.json(
        { error: 'Failed to fetch at-risk students' },
        { status: 500 }
      );
    }

    // Get suspended students
    const { data: suspendedStudents, error: suspendedError } = await supabase
      .from('students')
      .select('id, name, roll_number, status, updated_at, notes')
      .eq('organization_id', organizationId)
      .eq('status', 'suspended')
      .order('updated_at', { ascending: false });

    if (suspendedError) {
      console.error('Error fetching suspended students:', suspendedError);
      return NextResponse.json(
        { error: 'Failed to fetch suspended students' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      data: {
        atRiskStudents: atRiskStudents || [],
        suspendedStudents: suspendedStudents || [],
        summary: {
          totalAtRisk: atRiskStudents?.length || 0,
          totalSuspended: suspendedStudents?.length || 0
        }
      }
    }, {
      headers: response.headers
    });
  } catch (error) {
    console.error('Error in consecutive leave API:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/attendance/consecutive-leave
 * Check specific student's consecutive leave status
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
    const { studentId } = body;

    if (!studentId) {
      return NextResponse.json(
        { error: 'Student ID is required' },
        { status: 400 }
      );
    }

    // Get student's consecutive leave status
    const { data, error } = await supabase
      .rpc('get_student_consecutive_leave_status', {
        p_student_id: studentId
      });

    if (error) {
      console.error('Error checking student leave status:', error);
      return NextResponse.json(
        { error: 'Failed to check student leave status' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      data: data?.[0] || null
    }, {
      headers: response.headers
    });
  } catch (error) {
    console.error('Error in consecutive leave check:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
