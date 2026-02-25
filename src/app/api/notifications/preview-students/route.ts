import { NextRequest, NextResponse } from 'next/server';
import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { supabaseAdmin } from '../../../../lib/supabase/client';

export const dynamic = 'force-dynamic';

// POST - Preview students who will receive the reminder
export async function POST(request: NextRequest) {
  try {
    // Create server client for authentication
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          get(name: string) {
            return request.cookies.get(name)?.value;
          },
          set(name: string, value: string, options: CookieOptions) {
            request.cookies.set({
              name,
              value,
              ...options,
            });
          },
          remove(name: string, options: CookieOptions) {
            request.cookies.delete(name);
          },
        },
      }
    );
    
    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    console.log('[Preview Students] Auth check:', { 
      hasUser: !!user, 
      userId: user?.id,
      authError: authError?.message 
    });
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get user's organization_id using supabaseAdmin
    const { data: userData, error: userError } = await supabaseAdmin
      .from('admin_profiles')
      .select('organization_id')
      .eq('user_id', user.id)
      .single();

    console.log('[Preview Students] Organization lookup:', { 
      userData, 
      userError: userError?.message 
    });

    if (userError || !userData?.organization_id) {
      return NextResponse.json({ error: 'Organization not found' }, { status: 404 });
    }

    const body = await request.json();
    const { reminder_type, target_type, target_id } = body;

    console.log('[Preview Students] Request params:', { 
      reminder_type, 
      target_type, 
      target_id,
      organization_id: userData.organization_id
    });

    let students: any[] = [];
    let statusFilter: string[] = [];
    let paymentMonthFilter: string | null = null;

    // Get current month in format "Month YYYY" (e.g., "November 2025")
    const currentDate = new Date();
    const currentMonth = currentDate.toLocaleString('en-US', { month: 'long', year: 'numeric' });

    // Determine status filter based on reminder type
    if (reminder_type === 'fee_due') {
      // Unpaid: Current month only
      statusFilter = ['Unpaid'];
      paymentMonthFilter = currentMonth;
      console.log('[Preview Students] Filtering for Unpaid fees of current month:', currentMonth);
    } else if (reminder_type === 'fee_overdue') {
      // Overdue: Any month before current month
      statusFilter = ['Overdue'];
      console.log('[Preview Students] Filtering for Overdue fees (any past month)');
    }

    // Get base student list using supabaseAdmin
    if (target_type === 'all') {
      const { data: allStudents, error: studentsError } = await supabaseAdmin
        .from('students')
        .select('id, name, roll_number, class_id, whatsapp, parent_name')
        .eq('organization_id', userData.organization_id)
        .eq('status', 'active')
        .order('name');

      if (studentsError) {
        console.error('Error fetching students:', studentsError);
        return NextResponse.json({ error: 'Failed to fetch students' }, { status: 500 });
      }

      students = allStudents || [];
    } else if (target_type === 'class' && target_id) {
      const { data: classStudents, error: studentsError } = await supabaseAdmin
        .from('students')
        .select('id, name, roll_number, class_id, whatsapp, parent_name')
        .eq('organization_id', userData.organization_id)
        .eq('class_id', target_id)
        .eq('status', 'active')
        .order('name');

      if (studentsError) {
        console.error('Error fetching class students:', studentsError);
        return NextResponse.json({ error: 'Failed to fetch students' }, { status: 500 });
      }

      students = classStudents || [];
    } else if (target_type === 'student' && target_id) {
      const { data: student, error: studentError } = await supabaseAdmin
        .from('students')
        .select('id, name, roll_number, class_id, whatsapp, parent_name')
        .eq('id', target_id)
        .single();

      if (studentError) {
        console.error('Error fetching student:', studentError);
        return NextResponse.json({ error: 'Student not found' }, { status: 404 });
      }

      students = [student];
    }

    // Get class names
    const classIds = [...new Set(students.map(s => s.class_id))];
    const { data: classesData } = await supabaseAdmin
      .from('classes')
      .select('id, name')
      .in('id', classIds);

    const classMap = new Map(classesData?.map((c: { id: any; name: any; }) => [c.id, c.name]) || []);

    // Filter by fee status if applicable
    if (statusFilter.length > 0 && (reminder_type === 'fee_due' || reminder_type === 'fee_overdue')) {
      // Build the query using supabaseAdmin
      let feeQuery = supabaseAdmin
        .from('fee_payments')
        .select('student_id, status, amount, paid_amount, payment_month, due_date')
        .eq('organization_id', userData.organization_id)
        .in('status', statusFilter);
      
      // For Unpaid (fee_due), filter by current month only
      if (paymentMonthFilter) {
        feeQuery = feeQuery.eq('payment_month', paymentMonthFilter);
        console.log('[Preview Students] Adding payment_month filter:', paymentMonthFilter);
      }
      
      const { data: feePayments, error: feeError } = await feeQuery;
      
      console.log('[Preview Students] Fee payments query result:', {
        count: feePayments?.length || 0,
        error: feeError?.message,
        sample: feePayments?.slice(0, 2)
      });

      if (feePayments && feePayments.length > 0) {
        const studentIdsWithDueFees = new Set(feePayments.map((p: { student_id: any; }) => p.student_id));
        
        // Create a map of student fees
        const feeMap = new Map();
        feePayments.forEach((payment: { student_id: any; }) => {
          if (!feeMap.has(payment.student_id)) {
            feeMap.set(payment.student_id, []);
          }
          feeMap.get(payment.student_id).push(payment);
        });

        students = students
          .filter(s => studentIdsWithDueFees.has(s.id))
          .map(student => {
            const fees = feeMap.get(student.id) || [];
            const totalDue = fees.reduce((sum: number, f: any) => sum + (f.amount - (f.paid_amount || 0)), 0);
            return {
              ...student,
              class_name: classMap.get(student.class_id) || 'N/A',
              fee_status: statusFilter[0],
              total_due: totalDue,
              pending_months: fees.length,
              fee_details: fees.map((f: any) => ({
                month: f.payment_month,
                due_date: f.due_date,
                amount: f.amount - (f.paid_amount || 0)
              }))
            };
          });
      } else {
        students = [];
      }
    } else {
      // For non-fee reminders, just add class names
      students = students.map(student => ({
        ...student,
        class_name: classMap.get(student.class_id) || 'N/A'
      }));
    }

    return NextResponse.json({ 
      success: true,
      students: students,
      count: students.length,
      filter_applied: statusFilter.length > 0 ? statusFilter[0] : 'none'
    });
  } catch (error) {
    console.error('Error in preview students API:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
