import { NextRequest, NextResponse } from 'next/server';
import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { supabaseAdmin } from '../../../../lib/supabase/client';
import { SUPABASE_URL, SUPABASE_ANON_KEY } from '@/lib/supabase/config';
import { getCompletedBillingMonths } from '../../../../lib/fees-service';

/**
 * POST /api/admin/backfill-fees
 * 
 * One-time backfill: removes ONLY unpaid fee_payments records for the org
 * and regenerates them correctly using the fixed calendar-cycle billing logic.
 * PAID records are ALWAYS preserved - never deleted.
 */
export async function POST(request: NextRequest) {
  try {
    const response = NextResponse.json({ success: true });
    const supabase = createServerClient(
      SUPABASE_URL,
      SUPABASE_ANON_KEY,
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

    // SECURITY: Verify the caller is an admin
    const { data: userData } = await supabaseAdmin
      .from('admin_profiles')
      .select('*')
      .eq('user_id', user.id)
      .maybeSingle();

    if (!userData || !['admin', 'super_admin'].includes(userData.role)) {
      return NextResponse.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    const organizationId = userData?.organization_id || 'default-org';
    const today = new Date();

    // 1. Fetch all active students
    const { data: students, error: studentsError } = await supabaseAdmin
      .from('students')
      .select('id, name, admission_date, monthly_fee')
      .eq('is_active', true);

    if (studentsError || !students) {
      return NextResponse.json({ error: 'Failed to fetch students' }, { status: 500 });
    }

    // 2. Fetch paid months from fee_payment_history (if table exists)
    let paidByStudent = new Map<string, Set<string>>();

    try {
      const { data: paidHistory } = await supabaseAdmin
        .from('fee_payment_history')
        .select('student_id, payment_month');

      for (const h of paidHistory || []) {
        if (!paidByStudent.has(h.student_id)) paidByStudent.set(h.student_id, new Set());
        paidByStudent.get(h.student_id)!.add(h.payment_month.toLowerCase());
      }
    } catch {
      console.warn('[backfill-fees] fee_payment_history table not available, using fee_payments as source of truth');
    }

    // 2b. Also check paid status directly from fee_payments table (more reliable)
    const { data: alreadyPaid } = await supabaseAdmin
      .from('fee_payments')
      .select('student_id, payment_month')
      .eq('status', 'Paid');

    for (const p of alreadyPaid || []) {
      if (!paidByStudent.has(p.student_id)) paidByStudent.set(p.student_id, new Set());
      paidByStudent.get(p.student_id)!.add(p.payment_month.toLowerCase());
    }

    // 3. SAFE DELETE: Delete ONLY Unpaid/Overdue/Pending records — NEVER delete Paid records
    const { error: deleteAllError } = await supabaseAdmin
      .from('fee_payments')
      .delete()
      .in('status', ['Unpaid', 'Overdue', 'Pending']);

    if (deleteAllError) {
      console.error('Error deleting unpaid fee payments:', deleteAllError);
      return NextResponse.json({ error: 'Failed to clear old unpaid fee records' }, { status: 500 });
    }

    // 4. Regenerate fee records using the correct billing-cycle logic
    const entriesToInsert: any[] = [];
    const studentResults: any[] = [];

    for (const student of students) {
      if (!student.admission_date) continue;

      const monthlyFee = Number(student.monthly_fee) || 0;
      const studentPaidMonths = paidByStudent.get(student.id) || new Set<string>();

      const completedMonths = getCompletedBillingMonths(student.admission_date, today);
      let generated = 0;
      let skipped = 0;

      for (const billing of completedMonths) {
        const monthLower = billing.monthName.toLowerCase();

        // Skip months that are already recorded as paid
        if (studentPaidMonths.has(monthLower)) {
          skipped++;
          continue;
        }

        const receiptNumber = `FEE-${Date.now()}-${Math.random().toString(36).substr(2, 5).toUpperCase()}`;
        entriesToInsert.push({
          student_id: student.id,
          organization_id: organizationId,
          amount: monthlyFee,
          payment_month: billing.monthName,
          payment_date: student.admission_date,
          due_date: billing.dueDate,
          status: 'Unpaid',
          paid_amount: 0.00,
          discount: 0.00,
          late_fee: 0.00,
          receipt_number: receiptNumber,
          collected_by: null,
          notes: `Backfilled fee for ${billing.monthName}`,
        });
        generated++;
      }

      studentResults.push({ name: student.name, admission_date: student.admission_date, generated, skipped_paid: skipped });
    }

    // 5. Bulk insert new correct records
    if (entriesToInsert.length > 0) {
      const { error: insertError } = await supabaseAdmin
        .from('fee_payments')
        .insert(entriesToInsert);

      if (insertError) {
        console.error('Error inserting backfilled fee entries:', insertError);
        return NextResponse.json({ error: 'Failed to insert new fee records', details: insertError.message }, { status: 500 });
      }
    }

    return NextResponse.json({
      success: true,
      message: `Backfill complete. ${entriesToInsert.length} fee records regenerated for ${students.length} students.`,
      totalStudents: students.length,
      totalGenerated: entriesToInsert.length,
      students: studentResults,
    }, { status: 200, headers: response.headers });

  } catch (err: any) {
    console.error('Backfill error:', err);
    return NextResponse.json({ error: err.message || 'Internal server error' }, { status: 500 });
  }
}
