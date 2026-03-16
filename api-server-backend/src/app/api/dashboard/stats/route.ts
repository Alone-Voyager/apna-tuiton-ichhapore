import { NextRequest, NextResponse } from 'next/server';
import { createServerClient, type CookieOptions } from '@supabase/ssr';

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

    if (userError || !userData) {
      return NextResponse.json(
        { error: 'User profile not found' },
        { status: 404 }
      );
    }

    const organizationId = userData.organization_id;
    const today = new Date().toISOString().split('T')[0]; // Get today's date in YYYY-MM-DD format

    // 1. Get total registered students count
    const { count: totalStudents, error: studentsError } = await supabase
      .from('students')
      .select('*', { count: 'exact', head: true })
      .eq('organization_id', organizationId)
      .eq('status', 'active');

    if (studentsError) {
      console.error('Error fetching students count:', studentsError);
      return NextResponse.json(
        { success: false, error: 'Failed to fetch students count', details: studentsError },
        { status: 500 }
      );
    }

    // 2. Get today's attendance statistics
    const { data: todayAttendance, error: attendanceError } = await supabase
      .from('attendance')
      .select('status')
      .eq('organization_id', organizationId)
      .eq('attendance_date', today);

    if (attendanceError) {
      console.error('Error fetching attendance:', attendanceError);
      return NextResponse.json(
        { success: false, error: 'Failed to fetch attendance', details: attendanceError },
        { status: 500 }
      );
    }

    // Calculate attendance statistics
    // Total students (active) in the organization
    const totalActiveStudents = totalStudents || 0;
    
    // Count students present today (Present, Late, Half Day)
    const presentCount = todayAttendance?.filter(
      (record: any) => record.status === 'Present' || record.status === 'Late' || record.status === 'Half Day'
    ).length || 0;
    
    // Calculate attendance percentage based on total active students
    const attendancePercentage = totalActiveStudents > 0 
      ? Math.round((presentCount / totalActiveStudents) * 100) 
      : 0;

    // 3. Get students on leave today
    const { count: onLeaveCount, error: leaveError } = await supabase
      .from('attendance')
      .select('*', { count: 'exact', head: true })
      .eq('organization_id', organizationId)
      .eq('attendance_date', today)
      .eq('status', 'Leave');

    if (leaveError) {
      console.error('Error fetching leave count:', leaveError);
    }

    // 4. Get total outstanding amount (Overdue only)
    const { data: outstandingPayments, error: outstandingError } = await supabase
      .from('fee_payments')
      .select('amount, paid_amount')
      .eq('organization_id', organizationId)
      .eq('status', 'Overdue');

    if (outstandingError) {
      console.error('Error fetching outstanding payments:', outstandingError);
    }

    // Calculate total outstanding: amount - paid_amount for each record
    const totalOutstanding = outstandingPayments?.reduce(
      (sum: number, payment: any) => sum + (Number(payment.amount || 0) - Number(payment.paid_amount || 0)),
      0
    ) || 0;

    return NextResponse.json({
      success: true,
      data: {
        totalStudents: totalStudents || 0,
        attendancePercentage,
        presentCount,
        totalAttendanceRecords: totalActiveStudents, // Total active students
        onLeaveCount: onLeaveCount || 0,
        totalOutstanding: Math.round(totalOutstanding),
      },
    });
  } catch (error) {
    console.error('Error fetching dashboard stats:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch dashboard statistics' },
      { status: 500 }
    );
  }
}
