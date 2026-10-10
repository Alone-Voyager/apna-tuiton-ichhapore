import { NextRequest, NextResponse } from 'next/server';
import { getRequestOrgContext } from '../../../../lib/supabase/server';
import { syncAllStudentFeePayments } from '../../../../lib/fees-service';
import { supabaseAdmin } from '../../../../lib/supabase/client';

export async function GET(request: NextRequest) {
  try {
    const { supabase, user, organizationId } = await getRequestOrgContext(request);

    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Use supabaseAdmin for queries to bypass RLS
    const db = supabaseAdmin;
    const today = new Date().toISOString().split('T')[0]; // Get today's date in YYYY-MM-DD format

    // 1. Fetch all students to accurately determine active count and expected monthly revenue
    const { data: allStudents, error: studentsError } = await db
      .from('students')
      .select('id, monthly_fee, status, is_active');

    if (studentsError) {
      console.error('Error fetching students:', studentsError);
      return NextResponse.json(
        { success: false, error: 'Failed to fetch students data', details: studentsError },
        { status: 500 }
      );
    }

    const isStudentActive = (s: any) => {
      const isDeleted = s.status === 'inactive' || s.status === 'deleted' || s.status === 'archived' || s.status === 'suspended';
      const isExplicitlyInactive = s.is_active === false;
      return !isDeleted && !isExplicitlyInactive;
    };

    const activeStudents = allStudents?.filter(isStudentActive) || [];
    const totalActiveStudents = activeStudents.length;

    // 2. Get today's attendance statistics
    const { data: todayAttendance, error: attendanceError } = await db
      .from('attendance')
      .select('status')
      .eq('attendance_date', today);

    if (attendanceError) {
      console.warn('Attendance query warning (non-fatal):', attendanceError);
    }

    // Count students present today (Present, Late, Half Day)
    const presentCount = todayAttendance?.filter(
      (record: any) => record.status === 'Present' || record.status === 'Late' || record.status === 'Half Day'
    ).length || 0;
    
    // Calculate attendance percentage based on total active students
    const attendancePercentage = totalActiveStudents > 0 
      ? Math.round((presentCount / totalActiveStudents) * 100) 
      : 0;

    // 3. Get students on leave today
    const onLeaveCount = todayAttendance?.filter(
      (record: any) => record.status === 'Leave'
    ).length || 0;

    // Sync all active student fee payments safely
    try {
      await syncAllStudentFeePayments(db);
    } catch (syncErr) {
      console.warn('Fee sync skipped:', syncErr);
    }

    // 4. Get total outstanding amount (Unpaid, Pending, Overdue, Partial)
    // Fetch ALL fee payments that are not fully paid to compute the real outstanding balance
    const { data: outstandingPayments, error: outstandingError } = await db
      .from('fee_payments')
      .select('amount, paid_amount, status')
      .in('status', ['Unpaid', 'Pending', 'Overdue', 'Partial']);

    if (outstandingError) {
      console.error('Error fetching outstanding payments:', outstandingError);
    }

    // Outstanding = (amount - paid_amount) for every non-Paid record, including Partial
    // This correctly captures both fully-unpaid and partially-paid dues
    const totalOutstanding = (outstandingPayments || []).reduce(
      (sum: number, payment: any) => {
        const due = Math.max(0, Number(payment.amount || 0) - Number(payment.paid_amount || 0));
        return sum + due;
      },
      0
    );

    // 5. Calculate Expected Monthly Revenue (Sum of monthly_fee for all active students)
    const expectedMonthlyRevenue = activeStudents.reduce((sum: number, student: any) => {
      return sum + Number(student.monthly_fee || 0);
    }, 0);

    const statsData = {
      totalStudents: totalActiveStudents,
      total_students: totalActiveStudents,
      attendancePercentage,
      presentCount,
      totalAttendanceRecords: totalActiveStudents,
      onLeaveCount,
      totalOutstanding: Math.round(totalOutstanding),
      expectedMonthlyRevenue: Math.round(expectedMonthlyRevenue),
    };

    return NextResponse.json({
      success: true,
      data: statsData,
      stats: statsData,
    });
  } catch (error) {
    console.error('Error fetching dashboard stats:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch dashboard statistics' },
      { status: 500 }
    );
  }
}
