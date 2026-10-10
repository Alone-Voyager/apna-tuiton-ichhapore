import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '../../../../lib/supabase/client';
import { syncAllStudentFeePayments } from '../../../../lib/fees-service';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

/**
 * GET /api/fees/revenue-analytics
 * Calculates fee collections, unpaid dues, and rates grouped by the billing/fee month.
 */
export async function GET(request: NextRequest) {
  try {
    const response = NextResponse.json({ success: true });

    // Sync student fee payments safely without organization_id filter
    try {
      await syncAllStudentFeePayments(supabaseAdmin);
    } catch (e) {
      console.warn('[Revenue Analytics] Fee sync skipped:', e);
    }

    // 1. Fetch active students to get active count and target monthly fee
    const { data: studentsData, error: studentsError } = await supabaseAdmin
      .from('students')
      .select('id, monthly_fee, status, is_active');

    if (studentsError) {
      console.error('Error fetching students for revenue analytics:', studentsError);
    }

    const isStudentActive = (s: any) => {
      const isDeleted = s.status === 'inactive' || s.status === 'deleted' || s.status === 'archived' || s.status === 'suspended';
      const isExplicitlyInactive = s.is_active === false;
      return !isDeleted && !isExplicitlyInactive;
    };

    const activeStudents = (studentsData || []).filter(isStudentActive);
    const totalActiveStudents = activeStudents.length;
    const activeMonthlyTarget = activeStudents.reduce((sum, s) => sum + Number(s.monthly_fee || 0), 0);

    // 2. Fetch all fee payments
    const { data: allPaymentsData, error: paymentsError } = await supabaseAdmin
      .from('fee_payments')
      .select('payment_month, amount, paid_amount, status');

    if (paymentsError) {
      console.error('Error fetching fee payments for revenue analytics:', paymentsError);
    }

    const allPayments = allPaymentsData || [];

    // Compile metrics grouped by billing month
    const monthStatsMap = new Map<string, {
      totalStudents: number;
      paidStudents: number;
      unpaidStudents: number;
      expectedRevenue: number;
      revenueCollected: number;
      outstandingRevenue: number;
    }>();

    const getOrCreateStats = (month: string) => {
      const canonicalMonth = (month || 'Current Month').trim();
      if (!monthStatsMap.has(canonicalMonth)) {
        monthStatsMap.set(canonicalMonth, {
          totalStudents: 0,
          paidStudents: 0,
          unpaidStudents: 0,
          expectedRevenue: 0,
          revenueCollected: 0,
          outstandingRevenue: 0,
        });
      }
      return monthStatsMap.get(canonicalMonth)!;
    };

    for (const p of allPayments) {
      if (!p?.payment_month) continue;
      const stats = getOrCreateStats(p.payment_month);
      stats.totalStudents += 1;
      const amount = Number(p.amount || 0);
      const paid = Number(p.paid_amount || 0);

      stats.expectedRevenue += amount;
      stats.revenueCollected += paid;

      if (p.status === 'Paid') {
        stats.paidStudents += 1;
      } else {
        stats.unpaidStudents += 1;
        stats.outstandingRevenue += Math.max(0, amount - paid);
      }
    }

    // Ensure the current month (e.g., October 2026) is always included
    const currentMonthStr = new Date().toLocaleString('en-US', { month: 'long', year: 'numeric' });
    if (!monthStatsMap.has(currentMonthStr)) {
      monthStatsMap.set(currentMonthStr, {
        totalStudents: totalActiveStudents,
        paidStudents: 0,
        unpaidStudents: totalActiveStudents,
        expectedRevenue: Math.round(activeMonthlyTarget),
        revenueCollected: 0,
        outstandingRevenue: Math.round(activeMonthlyTarget),
      });
    }

    // Calculate overall totals
    let overallExpected = 0;
    let overallCollected = 0;
    let overallOutstanding = 0;
    let overallPaidStudents = 0;
    let overallUnpaidStudents = 0;
    let overallTotalPayments = 0;

    for (const stats of monthStatsMap.values()) {
      overallExpected += stats.expectedRevenue;
      overallCollected += stats.revenueCollected;
      overallOutstanding += stats.outstandingRevenue;
      overallPaidStudents += stats.paidStudents;
      overallUnpaidStudents += stats.unpaidStudents;
      overallTotalPayments += stats.totalStudents;
    }

    const overallCollectionRate = overallExpected > 0
      ? Math.round((overallCollected / overallExpected) * 100)
      : 0;

    const summary = {
      totalStudents: totalActiveStudents,
      expectedRevenue: Math.round(overallExpected),
      revenueCollected: Math.round(overallCollected),
      outstandingRevenue: Math.round(overallOutstanding),
      collectionRate: overallCollectionRate,
      paidCount: overallPaidStudents,
      unpaidCount: overallUnpaidStudents,
      totalPayments: overallTotalPayments,
    };

    const analytics = Array.from(monthStatsMap.entries()).map(([month, stats]) => {
      const collectionRate = stats.totalStudents > 0
        ? Math.round((stats.paidStudents / stats.totalStudents) * 100)
        : 0;

      return {
        month,
        totalStudents: stats.totalStudents,
        paidStudents: stats.paidStudents,
        unpaidStudents: stats.unpaidStudents,
        expectedRevenue: Math.round(stats.expectedRevenue),
        revenueCollected: Math.round(stats.revenueCollected),
        outstandingRevenue: Math.round(stats.outstandingRevenue),
        collectionRate,
      };
    });

    // Chronological sorting (April 2026, May 2026, ..., October 2026)
    analytics.sort((a, b) => {
      const dateA = new Date(a.month + ' 1');
      const dateB = new Date(b.month + ' 1');
      return dateA.getTime() - dateB.getTime();
    });

    response.headers.set('Cache-Control', 'no-store, max-age=0');
    return NextResponse.json({
      success: true,
      analytics,
      summary,
    }, { status: 200, headers: response.headers });

  } catch (error: any) {
    console.error('Revenue analytics error:', error);
    const currentMonthStr = new Date().toLocaleString('en-US', { month: 'long', year: 'numeric' });
    return NextResponse.json({
      success: true,
      analytics: [{
        month: currentMonthStr,
        totalStudents: 0,
        paidStudents: 0,
        unpaidStudents: 0,
        expectedRevenue: 0,
        revenueCollected: 0,
        outstandingRevenue: 0,
        collectionRate: 0,
      }],
      summary: {
        totalStudents: 0,
        expectedRevenue: 0,
        revenueCollected: 0,
        outstandingRevenue: 0,
        collectionRate: 0,
        paidCount: 0,
        unpaidCount: 0,
        totalPayments: 0,
      }
    }, { status: 200 });
  }
}
