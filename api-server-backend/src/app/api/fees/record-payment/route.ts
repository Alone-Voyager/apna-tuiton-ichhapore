import { NextRequest, NextResponse } from 'next/server';
import { createServerClient, type CookieOptions } from '@supabase/ssr';

// POST /api/fees/record-payment - Record payment for overdue fees from student details page
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

    // Get student details
    const { data: studentData, error: studentError } = await supabase
      .from('students')
      .select('organization_id, name, status, is_active')
      .eq('id', student_id)
      .single();

    if (studentError || !studentData) {
      console.error('Error fetching student:', studentError);
      return NextResponse.json(
        { error: 'Student not found' },
        { status: 404 }
      );
    }

    // Verify organization matches
    if (studentData.organization_id !== adminProfile.organization_id) {
      return NextResponse.json(
        { error: 'Unauthorized access to student' },
        { status: 403 }
      );
    }

    // Get the existing fee payment record (overdue entry)
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
    const expectedAmount = Number(existingPayment.amount);

    // Generate receipt number
    const receiptNumber = `RCP-${Date.now()}-${Math.random().toString(36).substr(2, 9).toUpperCase()}`;

    // 1. Create payment history record
    const { error: historyError } = await supabase
      .from('fee_payment_history')
      .insert({
        student_id: student_id,
        organization_id: studentData.organization_id,
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

    // 2. Delete the overdue entry from fee_payments table
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

    // 3. Log activity
    const activityDescription = `Fee payment of ₹${paidAmount} collected for ${existingPayment.payment_month}`;
    
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

    if (logError) {
      console.error('Error logging activity:', logError);
      // Don't fail the request if logging fails
    }

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
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// GET /api/fees/record-payment - Get pending months for a student
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

    // Get user's organization_id
    const { data: adminProfile, error: userError } = await supabase
      .from('admin_profiles')
      .select('organization_id')
      .eq('user_id', user.id)
      .single();

    if (userError || !adminProfile?.organization_id) {
      console.error('Error fetching admin profile:', userError);
      return NextResponse.json(
        { error: 'Organization not found' },
        { status: 404 }
      );
    }

    // Get student_id from query params
    const { searchParams } = new URL(request.url);
    const studentId = searchParams.get('student_id');

    if (!studentId) {
      return NextResponse.json(
        { error: 'Missing student_id parameter' },
        { status: 400 }
      );
    }

    // Get pending/overdue months
    const { data, error } = await supabase
      .from('fee_payments')
      .select('id, payment_month, amount, due_date, status')
      .eq('student_id', studentId)
      .eq('organization_id', adminProfile.organization_id)
      .in('status', ['Unpaid', 'Overdue'])
      .order('due_date', { ascending: true });

    if (error) {
      console.error('Error fetching pending months:', error);
      return NextResponse.json(
        { error: 'Failed to fetch pending months' },
        { status: 500 }
      );
    }

    return NextResponse.json(
      { 
        success: true,
        pending_months: data || []
      },
      { status: 200, headers: response.headers }
    );

  } catch (error) {
    console.error('Unexpected error in GET /api/fees/record-payment:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
