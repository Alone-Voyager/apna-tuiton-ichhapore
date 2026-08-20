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
    const useOrgFilter = organizationId && organizationId !== 'default-org';
    const today = new Date().toISOString().split('T')[0]; // Get today's date in YYYY-MM-DD format

    // 1. Get total registered students count
    let studentsQuery = db
      .from('students')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'active');
    if (useOrgFilter) studentsQuery = studentsQuery.eq('organization_id', organizationId);
    const { count: totalStudents, error: studentsError } = await studentsQuery;

    if (studentsError) {
      console.error('Error fetching students count:', studentsError);
      return NextResponse.json(
        { success: false, error: 'Failed to fetch students count', details: studentsError },
        { status: 500 }
      );
    }

    // 2. Get today's attendance statistics
    let attendanceQuery = db
      .from('attendance')
      .select('status')
      .eq('attendance_date', today);
    if (useOrgFilter) attendanceQuery = attendanceQuery.eq('organization_id', organizationId);
    const { data: todayAttendance, error: attendanceError } = await attendanceQuery;

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
    let leaveQuery = db
      .from('attendance')
      .select('*', { count: 'exact', head: true })
      .eq('attendance_date', today)
      .eq('status', 'Leave');
    if (useOrgFilter) leaveQuery = leaveQuery.eq('organization_id', organizationId);
    const { count: onLeaveCount, error: leaveError } = await leaveQuery;

    if (leaveError) {
      console.error('Error fetching leave count:', leaveError);
    }

    // Sync all active student fee payments first
    try {
      await syncAllStudentFeePayments(db, useOrgFilter ? organizationId : undefined);
    } catch (syncErr) {
      console.warn('Fee sync skipped:', syncErr);
    }

    // 4. Get total outstanding amount (Unpaid, Pending, Overdue, Partial)
    let outstandingQuery = db
      .from('fee_payments')
      .select('amount, paid_amount')
      .in('status', ['Unpaid', 'Pending', 'Overdue', 'Partial']);
    if (useOrgFilter) outstandingQuery = outstandingQuery.eq('organization_id', organizationId);
    const { data: outstandingPayments, error: outstandingError } = await outstandingQuery;

    if (outstandingError) {
      console.error('Error fetching outstanding payments:', outstandingError);
    }

    // Calculate total outstanding: amount - paid_amount for each record
    const totalOutstanding = outstandingPayments?.reduce(
      (sum: number, payment: any) => sum + (Number(payment.amount || 0) - Number(payment.paid_amount || 0)),
      0
    ) || 0;

    // 5. Calculate Expected Monthly Revenue (Sum of monthly_fee for all active students)
    let revenueQuery = db
      .from('students')
      .select('monthly_fee, status, is_active');
    if (useOrgFilter) revenueQuery = revenueQuery.eq('organization_id', organizationId);
    const { data: activeStudents, error: expectedRevenueErr } = await revenueQuery;

    if (expectedRevenueErr) {
      console.error('Error fetching active students for expected revenue:', expectedRevenueErr);
    }

    const isStudentActive = (s: any) => {
      const isDeleted = s.status === 'inactive' || s.status === 'deleted' || s.status === 'archived' || s.status === 'suspended';
      const isExplicitlyInactive = s.is_active === false;
      return !isDeleted && !isExplicitlyInactive;
    };

    const expectedMonthlyRevenue = activeStudents?.reduce((sum: number, student: any) => {
      if (isStudentActive(student)) {
        return sum + Number(student.monthly_fee || 0);
      }
      return sum;
    }, 0) || 0;

    return NextResponse.json({
      success: true,
      data: {
        totalStudents: totalStudents || 0,
        attendancePercentage,
        presentCount,
        totalAttendanceRecords: totalActiveStudents, // Total active students
        onLeaveCount: onLeaveCount || 0,
        totalOutstanding: Math.round(totalOutstanding),
        expectedMonthlyRevenue: Math.round(expectedMonthlyRevenue),
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
