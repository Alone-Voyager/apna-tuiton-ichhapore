import { NextRequest, NextResponse } from 'next/server';
import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { sendPaymentConfirmation } from '../../../../lib/payment-notification-service';

// POST /api/fees/collect - Collect fee payment
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

    // Get the authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Get user's organization_id and admin profile
    const { data: adminProfile, error: userError } = await supabase
      .from('admin_profiles')
      .select('id, organization_id')
      .eq('user_id', user.id)
      .single();

    if (userError || !adminProfile?.organization_id) {
      console.error('Error fetching admin profile:', userError);
      return NextResponse.json(
        { error: 'Organization not found' },
        { status: 404 }
      );
    }

    // Parse request body
    const body = await request.json();
    const {
      payment_id,      // ID of the fee_payment record to update
      student_id,
      amount,
      payment_method,
      payment_date,
      discount = 0,
      late_fee = 0,
      notes = ''
    } = body;

    // Validate required fields
    if (!payment_id || !student_id || !amount || !payment_method || !payment_date) {
      return NextResponse.json(
        { error: 'Missing required fields: payment_id, student_id, amount, payment_method, payment_date' },
        { status: 400 }
      );
    }

    // Get the existing fee payment record
    const { data: existingPayment, error: fetchError } = await supabase
      .from('fee_payments')
      .select('*')
      .eq('id', payment_id)
      .eq('organization_id', adminProfile.organization_id)
      .eq('student_id', student_id)
      .single();

    if (fetchError || !existingPayment) {
      console.error('Error fetching payment record:', fetchError);
      return NextResponse.json(
        { error: 'Payment record not found' },
        { status: 404 }
      );
    }

    // Check if already paid
    if (existingPayment.status === 'Paid') {
      return NextResponse.json(
        { error: 'This fee has already been paid' },
        { status: 400 }
      );
    }

    const paidAmount = Number(amount);
    const totalDiscount = Number(discount);
    const totalLateFee = Number(late_fee);
    const expectedAmount = Number(existingPayment.amount);

    // Generate receipt number
    const receiptNumber = `RCP-${Date.now()}-${Math.random().toString(36).substr(2, 9).toUpperCase()}`;

    // Start transaction by moving to history and updating current record
    // 1. Insert into fee_payment_history
    const { error: historyError } = await supabase
      .from('fee_payment_history')
      .insert({
        student_id: existingPayment.student_id,
        organization_id: existingPayment.organization_id,
        amount: expectedAmount,
        payment_month: existingPayment.payment_month,
        payment_date: payment_date,
        due_date: existingPayment.due_date,
        payment_method: payment_method,
        receipt_number: receiptNumber,
        paid_amount: paidAmount,
        discount: totalDiscount,
        late_fee: totalLateFee,
        notes: notes || `Payment collected for ${existingPayment.payment_month}`,
        collected_by: adminProfile.id,
        collected_at: new Date().toISOString(),
      });

    if (historyError) {
      console.error('Error creating payment history:', historyError);
      return NextResponse.json(
        { error: 'Failed to record payment history' },
        { status: 500 }
      );
    }

    // 2. Delete the old payment record from fee_payments
    const { error: deleteError } = await supabase
      .from('fee_payments')
      .delete()
      .eq('id', payment_id);

    if (deleteError) {
      console.error('Error deleting payment record:', deleteError);
      return NextResponse.json(
        { error: 'Failed to update payment record' },
        { status: 500 }
      );
    }

    // 3. Get student details for activity log
    const { data: studentData, error: studentError } = await supabase
      .from('students')
      .select('name, status')
      .eq('id', student_id)
      .single();

    if (studentError) {
      console.error('Error fetching student data:', studentError);
    }

    // 4. Log activity
    const activityDescription = studentData?.status === 'suspended' 
      ? `Overdue fee payment of ₹${paidAmount} collected from suspended student for ${existingPayment.payment_month}`
      : `Fee payment of ₹${paidAmount} collected for ${existingPayment.payment_month}`;
    
    const { error: logError } = await supabase
      .from('activity_logs')
      .insert({
        organization_id: adminProfile.organization_id,
        activity_type: 'payment',
        description: activityDescription,
        related_entity_type: 'student',
        related_entity_id: student_id,
        performed_by: adminProfile.id,
        metadata: {
          student_name: studentData?.name || 'Unknown Student',
          payment_month: existingPayment.payment_month,
          amount: paidAmount,
          payment_date: payment_date,
          payment_method: payment_method,
          receipt_number: receiptNumber,
          discount: totalDiscount,
          late_fee: totalLateFee,
          student_status: studentData?.status || 'unknown'
        }
      });

    if (logError) {
      console.error('Error logging activity:', logError);
      // Don't fail the request if logging fails
    }

    // 5. Send payment confirmation WhatsApp notification
    // This runs asynchronously and won't block the response
    sendPaymentConfirmation({
      studentId: student_id,
      organizationId: adminProfile.organization_id,
      amount: paidAmount,
      paymentMonth: existingPayment.payment_month,
      paymentDate: payment_date,
      paymentMethod: payment_method,
      receiptNumber: receiptNumber,
      collectedBy: adminProfile.id,
    }).catch((error) => {
      // Log error but don't fail the payment
      console.error('Payment confirmation notification failed:', error);
    });

    return NextResponse.json(
      { 
        success: true,
        message: 'Payment collected successfully',
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
    console.error('Unexpected error in POST /api/fees/collect:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
