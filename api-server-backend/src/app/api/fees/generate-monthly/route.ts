import { NextRequest, NextResponse } from 'next/server';
import { createServerClient, type CookieOptions } from '@supabase/ssr';

// POST /api/fees/generate-monthly - Generate monthly fee entries for all active students
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

    // Get user's organization_id
    const { data: userData, error: userError } = await supabase
      .from('admin_profiles')
      .select('organization_id')
      .eq('user_id', user.id)
      .single();

    if (userError || !userData?.organization_id) {
      console.error('Error fetching user profile:', userError);
      return NextResponse.json(
        { error: 'Organization not found' },
        { status: 404 }
      );
    }

    // Get the target month from request body (for testing) or use current month
    const body = await request.json().catch(() => ({}));
    const targetMonth = body.month; // e.g., "December 2025"
    
    let monthDate: Date;
    let monthString: string;
    
    if (targetMonth) {
      // Test mode: use provided month
      monthDate = new Date(targetMonth + ' 1');
      monthString = targetMonth;
    } else {
      // Production: use current month
      monthDate = new Date();
      monthString = monthDate.toLocaleString('en-US', { month: 'long', year: 'numeric' });
    }

    console.log('Generating entries for month:', monthString);

    // Fetch all active students from the organization
    const { data: students, error: studentsError } = await supabase
      .from('students')
      .select(`
        id,
        name,
        monthly_fee,
        class_id,
        classes(monthly_fee)
      `)
      .eq('organization_id', userData.organization_id)
      .eq('is_active', true);

    if (studentsError) {
      console.error('Error fetching students:', studentsError);
      return NextResponse.json(
        { error: 'Failed to fetch students' },
        { status: 500 }
      );
    }

    if (!students || students.length === 0) {
      return NextResponse.json({
        message: 'No active students found',
        created: 0,
        skipped: 0,
        month: monthString
      }, { status: 200, headers: response.headers });
    }

    // Check which students already have paid entries in fee_payment_history for this month
    const { data: paidHistory, error: historyError } = await supabase
      .from('fee_payment_history')
      .select('student_id')
      .eq('organization_id', userData.organization_id)
      .eq('payment_month', monthString);

    if (historyError) {
      console.error('Error fetching payment history:', historyError);
    }

    // Create a Set of student IDs who already paid
    const paidStudentIds = new Set(paidHistory?.map(h => h.student_id) || []);

    // Check which students already have entries in fee_payments for this month
    const { data: existingPayments, error: existingError } = await supabase
      .from('fee_payments')
      .select('student_id')
      .eq('organization_id', userData.organization_id)
      .eq('payment_month', monthString);

    if (existingError) {
      console.error('Error fetching existing payments:', existingError);
    }

    // Create a Set of student IDs who already have unpaid entries
    const existingStudentIds = new Set(existingPayments?.map(p => p.student_id) || []);

    // Prepare entries to create
    const entriesToCreate = [];
    let skipped = 0;

    for (const student of students) {
      // Skip if student already paid for this month
      if (paidStudentIds.has(student.id)) {
        console.log(`Skipping ${student.name} - already paid for ${monthString}`);
        skipped++;
        continue;
      }

      // Skip if student already has an unpaid entry for this month
      if (existingStudentIds.has(student.id)) {
        console.log(`Skipping ${student.name} - entry already exists for ${monthString}`);
        skipped++;
        continue;
      }

      // Determine monthly fee (student's fee or class fee)
      const monthlyFee = student.monthly_fee || (student.classes as any)?.monthly_fee || 0;

      // Calculate due date (end of the month)
      const dueDate = new Date(monthDate.getFullYear(), monthDate.getMonth() + 1, 0);

      entriesToCreate.push({
        student_id: student.id,
        organization_id: userData.organization_id,
        amount: monthlyFee,
        paid_amount: 0,
        status: 'Unpaid',
        payment_month: monthString,
        payment_date: new Date(monthDate.getFullYear(), monthDate.getMonth(), 1).toISOString().split('T')[0],
        due_date: dueDate.toISOString().split('T')[0],
        receipt_number: `FEE-PENDING-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        payment_method: 'Cash', // Default to Cash for unpaid entries
        discount: 0,
        late_fee: 0
      });
    }

    // Insert entries in batch using upsert to prevent duplicates
    // This will gracefully handle race conditions and duplicate attempts
    let created = 0;
    let duplicates = 0;
    
    if (entriesToCreate.length > 0) {
      // Insert each entry individually to handle conflicts gracefully
      for (const entry of entriesToCreate) {
        const { data: insertedData, error: insertError } = await supabase
          .from('fee_payments')
          .insert(entry)
          .select('id');

        if (insertError) {
          // Check if it's a duplicate key error (unique constraint violation)
          if (insertError.code === '23505' || insertError.message.includes('duplicate') || insertError.message.includes('unique')) {
            console.log(`Duplicate entry skipped for student ${entry.student_id} - ${entry.payment_month}`);
            duplicates++;
          } else {
            console.error('Error inserting fee entry:', insertError);
            // Continue with other entries instead of failing completely
          }
        } else if (insertedData && insertedData.length > 0) {
          created++;
        }
      }
    }

    return NextResponse.json({
      message: `Successfully generated fee entries for ${monthString}`,
      created,
      skipped,
      duplicates,
      month: monthString,
      totalStudents: students.length
    }, { status: 200, headers: response.headers });

  } catch (error) {
    console.error('Error in generate-monthly:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
