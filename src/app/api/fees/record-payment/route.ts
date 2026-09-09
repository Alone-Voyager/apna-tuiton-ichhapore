import { NextRequest, NextResponse } from 'next/server';
import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { supabaseAdmin } from '../../../../lib/supabase/client';
import { SUPABASE_URL, SUPABASE_ANON_KEY } from '@/lib/supabase/config';

// POST /api/fees/record-payment - Record payment for overdue fees from student details page
export async function POST(request: NextRequest) {
  try {
    const response = NextResponse.json({ success: true });

    const supabase = createServerClient(
      SUPABASE_URL,
      SUPABASE_ANON_KEY,
      {
        cookies: {
          get(name: string) {
            return request.cookies.get(name)?.value;
          },
          set(name: string, value: string, options: CookieOptions) {
            response.cookies.set({ name, value, ...options });
          },
          remove(name: string, options: CookieOptions) {
            response.cookies.set({ name, value: '', ...options });
          },
        },
      }
    );

    // Get the authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get user's organization_id and admin profile
    const { data: adminProfile } = await supabaseAdmin
      .from('admin_profiles')
      .select('*')
      .eq('user_id', user.id)
      .maybeSingle();

    // Parse request body
    const body = await request.json();
    const {
      student_id,
      payment_id,
      amount,
      payment_method,
      payment_date,
      notes = ''
    } = body;

    // Validate required fields
    if (!student_id || !payment_id || !amount || !payment_method || !payment_date) {
      return NextResponse.json(
        { error: 'Missing required fields: student_id, payment_id, amount, payment_method, payment_date' },
        { status: 400 }
      );
    }

    // Get student details using admin client (bypass RLS)
    const { data: studentData, error: studentError } = await supabaseAdmin
      .from('students')
      .select('name, status, is_active')
      .eq('id', student_id)
      .single();

    if (studentError || !studentData) {
      console.error('Error fetching student:', studentError);
      return NextResponse.json({ 
        error: 'Student not found', 
        details: studentError || 'studentData is null',
        id_received: student_id
      }, { status: 404 });
    }

    // Get the existing fee payment record
    const { data: existingPayment, error: fetchError } = await supabaseAdmin
      .from('fee_payments')
      .select('*')
      .eq('id', payment_id)
      .eq('student_id', student_id)
      .single();

    if (fetchError || !existingPayment) {
      console.error('Error fetching payment record:', fetchError);
      return NextResponse.json({ error: 'Payment record not found' }, { status: 404 });
    }

    // Check if already paid
    if (existingPayment.status === 'Paid') {
      return NextResponse.json({ error: 'This fee has already been paid' }, { status: 400 });
    }

    const paidAmount = Number(amount);
    const expectedAmount = Number(existingPayment.amount);

    // Generate receipt number
    const receiptNumber = `RCP-${Date.now()}-${Math.random().toString(36).substr(2, 9).toUpperCase()}`;

    // 1. Update fee_payments record to Paid status (primary operation)
    const { error: updateError } = await supabaseAdmin
      .from('fee_payments')
      .update({
        status: 'Paid',
        paid_amount: paidAmount,
        payment_method: payment_method,
        payment_date: payment_date,
        receipt_number: receiptNumber,
        notes: notes || `Payment collected for ${existingPayment.payment_month}`,
        collected_by: adminProfile?.id || null,
      })
      .eq('id', payment_id);

    if (updateError) {
      console.error('Error updating payment record:', updateError);
      return NextResponse.json({ error: 'Failed to record payment' }, { status: 500 });
    }

    // 2. Try to insert into fee_payment_history (optional - won't fail if table missing)
    try {
      await supabaseAdmin
        .from('fee_payment_history')
        .insert({
          student_id: student_id,
          organization_id: studentData.organization_id || adminProfile?.organization_id || 'default-org',
          amount: expectedAmount,
          payment_month: existingPayment.payment_month,
          payment_date: payment_date,
          due_date: existingPayment.due_date,
          payment_method: payment_method,
          receipt_number: receiptNumber,
          paid_amount: paidAmount,
          discount: 0,
          late_fee: 0,
          notes: notes || `Payment collected for ${existingPayment.payment_month}`,
          collected_by: adminProfile?.id || null,
          collected_at: new Date().toISOString(),
        });
    } catch (historyErr) {
      // Non-fatal: history table may not exist
      console.warn('Could not insert into fee_payment_history (table may not exist):', historyErr);
    }

    // 3. Log activity (non-fatal)
    try {
      await supabaseAdmin
        .from('activity_logs')
        .insert({
          organization_id: studentData.organization_id || adminProfile?.organization_id || 'default-org',
          activity_type: 'payment',
          description: `Fee payment of ₹${paidAmount} collected for ${existingPayment.payment_month}`,
          related_entity_type: 'student',
          related_entity_id: student_id,
          performed_by: adminProfile?.id || null,
          metadata: {
            student_name: studentData.name,
            payment_month: existingPayment.payment_month,
            amount: paidAmount,
            payment_date: payment_date,
            payment_method: payment_method,
            receipt_number: receiptNumber,
            discount: 0,
            late_fee: 0,
            notes: notes || null,
            student_status: studentData.status
          }
        });
    } catch (logErr) {
      console.warn('Activity log failed (non-fatal):', logErr);
    }

    // Sync to Google Sheets
    import('../../../../lib/google-sheets').then((sheets) => {
      const feeData = {
        id: payment_id,
        payment_month: existingPayment.payment_month,
        paid_amount: paidAmount,
        payment_method: payment_method,
        payment_date: payment_date,
        receipt_number: receiptNumber,
        status: 'Paid',
        notes: notes || `Payment collected for ${existingPayment.payment_month}`
      };
      sheets.syncFeeToSheet(feeData, studentData).catch(err => console.error('Sheet sync error', err));
    }).catch(err => console.error('Failed to load sheets lib', err));

    return NextResponse.json(
      { 
        success: true,
        message: 'Payment recorded successfully',
        receipt_number: receiptNumber,
        payment: {
          amount: paidAmount,
          payment_month: existingPayment.payment_month,
          payment_method: payment_method,
          receipt_number: receiptNumber
        }
      },
      { status: 200, headers: response.headers }
    );

  } catch (error) {
    console.error('Unexpected error in POST /api/fees/record-payment:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// GET /api/fees/record-payment - Get pending months for a student
export async function GET(request: NextRequest) {
  try {
    const response = NextResponse.json({ success: true });

    const supabase = createServerClient(
      SUPABASE_URL,
      SUPABASE_ANON_KEY,
      {
        cookies: {
          get(name: string) { return request.cookies.get(name)?.value; },
          set(name: string, value: string, options: CookieOptions) {
            response.cookies.set({ name, value, ...options });
          },
          remove(name: string, options: CookieOptions) {
            response.cookies.set({ name, value: '', ...options });
          },
        },
      }
    );

    // Get the authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get student_id from query params
    const { searchParams } = new URL(request.url);
    const studentId = searchParams.get('student_id');

    if (!studentId) {
      return NextResponse.json({ error: 'Missing student_id parameter' }, { status: 400 });
    }

    // Auto-sync fee payments for this student to ensure pending months are up-to-date
    const { syncStudentFeePayments } = await import('../../../../lib/fees-service');
    await syncStudentFeePayments(supabaseAdmin, studentId);

    // Get pending/overdue months using admin client
    const { data, error } = await supabaseAdmin
      .from('fee_payments')
      .select('id, payment_month, amount, due_date, status')
      .eq('student_id', studentId)
      .in('status', ['Pending', 'Overdue'])
      .order('due_date', { ascending: true });

    if (error) {
      console.error('Error fetching pending months:', error);
      return NextResponse.json({ error: 'Failed to fetch pending months' }, { status: 500 });
    }

    return NextResponse.json(
      { success: true, pending_months: data || [] },
      { status: 200, headers: response.headers }
    );

  } catch (error) {
    console.error('Unexpected error in GET /api/fees/record-payment:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
