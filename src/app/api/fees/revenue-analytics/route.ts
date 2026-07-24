import { NextRequest, NextResponse } from 'next/server';
import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { supabaseAdmin } from '../../../../lib/supabase/client';
import { syncAllStudentFeePayments } from '../../../../lib/fees-service';

/**
 * GET /api/fees/revenue-analytics
 * Calculates fee collections, unpaid dues, and rates grouped by the billing/fee month.
 */
export async function GET(request: NextRequest) {
  try {
    const response = NextResponse.json({ success: true });
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          get(name: string) { return request.cookies.get(name)?.value; },
          set(name: string, value: string, options: CookieOptions) { response.cookies.set({ name, value, ...options }); },
          remove(name: string, options: CookieOptions) { response.cookies.set({ name, value: '', ...options }); },
        },
      }
    );

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data: userData } = await supabase
      .from('admin_profiles')
      .select('organization_id')
      .eq('user_id', user.id)
      .single();

    if (!userData?.organization_id) {
      return NextResponse.json({ error: 'Organization not found' }, { status: 404 });
    }

    const organizationId = userData.organization_id;

    // 1. Sync all active student fee payments first to guarantee database is correct
    await syncAllStudentFeePayments(supabaseAdmin, organizationId);

    // 2. Fetch all unpaid/pending payments for active students
    const { data: unpaidPayments } = await supabaseAdmin
      .from('fee_payments')
      .select('payment_month, amount, paid_amount, students!inner(is_active, status)')
      .eq('organization_id', organizationId)
      .eq('students.is_active', true)
      .neq('students.status', 'inactive');

    // 3. Fetch all paid histories for active students
    const { data: paidHistories } = await supabaseAdmin
      .from('fee_payment_history')
      .select('payment_month, amount, paid_amount, students!inner(is_active, status)')
      .eq('organization_id', organizationId)
      .eq('students.is_active', true)
      .neq('students.status', 'inactive');

    // 4. Compile metrics grouped by billing month
    const monthStatsMap = new Map<string, {
      totalStudents: number;
      paidStudents: number;
      unpaidStudents: number;
      revenueCollected: number;
      outstandingRevenue: number;
    }>();

    // Helper to get or create stats entry
    const getOrCreateStats = (month: string) => {
      const canonicalMonth = month.trim();
      if (!monthStatsMap.has(canonicalMonth)) {
        monthStatsMap.set(canonicalMonth, {
          totalStudents: 0,
          paidStudents: 0,
          unpaidStudents: 0,
          revenueCollected: 0,
          outstandingRevenue: 0
        });
      }
      return monthStatsMap.get(canonicalMonth)!;
    };

    // Process unpaid payments (Unpaid, Pending, Overdue, Partial)
    for (const p of unpaidPayments || []) {
      const stats = getOrCreateStats(p.payment_month);
      stats.unpaidStudents += 1;
      stats.totalStudents += 1;
      // Partial payments contribute both to collected revenue and outstanding dues
      const paid = Number(p.paid_amount || 0);
      const amount = Number(p.amount || 0);
      stats.revenueCollected += paid;
      stats.outstandingRevenue += (amount - paid);
    }

    // Process fully paid histories
    for (const h of paidHistories || []) {
      const stats = getOrCreateStats(h.payment_month);
      stats.paidStudents += 1;
      stats.totalStudents += 1;
      stats.revenueCollected += Number(h.paid_amount || h.amount || 0);
    }

    // Convert map to array and compute averages
    const analytics = Array.from(monthStatsMap.entries()).map(([month, stats]) => {
      const collectionRate = stats.totalStudents > 0
        ? Math.round((stats.paidStudents / stats.totalStudents) * 100)
        : 0;

      return {
        month,
        totalStudents: stats.totalStudents,
        paidStudents: stats.paidStudents,
        unpaidStudents: stats.unpaidStudents,
        revenueCollected: Math.round(stats.revenueCollected),
        outstandingRevenue: Math.round(stats.outstandingRevenue),
        collectionRate
      };
    });

    // Sort chronologically: convert "June 2026" to date objects
    analytics.sort((a, b) => {
      const dateA = new Date(a.month + ' 1');
      const dateB = new Date(b.month + ' 1');
      return dateA.getTime() - dateB.getTime();
    });

    response.headers.set('Cache-Control', 'no-store, max-age=0');
    return NextResponse.json({
      success: true,
      analytics
    }, { status: 200, headers: response.headers });

  } catch (error: any) {
    console.error('Revenue analytics error:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
