import { NextRequest, NextResponse } from 'next/server';
import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { supabaseAdmin } from '../../../../lib/supabase/client';
import { syncAllStudentFeePayments } from '../../../../lib/fees-service';

// GET /api/fees/stats - Fetch fee payment statistics
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

    // Get current month for filtering
    const currentDate = new Date();
    const currentMonth = currentDate.toLocaleString('en-US', { month: 'long', year: 'numeric' });

    // Allow overriding month AND date via query parameter for testing
    const { searchParams } = new URL(request.url);
    const testMonth = searchParams.get('month'); // e.g., "December 2025"
    const testDate = searchParams.get('testDate'); // e.g., "2025-12-01" to simulate being in December
    const filterMonth = testMonth || currentMonth;
    
    // Use test date for status calculations if provided
    const today = testDate ? new Date(testDate) : new Date();
    today.setHours(0, 0, 0, 0);

    console.log('Filtering by month:', filterMonth);
    console.log('Using date for status calculation:', today.toDateString());

    // Sync all active student fee payments up to today using the calendar logic
    await syncAllStudentFeePayments(supabaseAdmin, userData.organization_id, today);

    // CRITICAL: Update all Unpaid entries from previous months to Overdue BEFORE fetching
    // This ensures the database status is current before we query
    // Convert "November 2025" -> get end date (Nov 30, 2025)
    // If today (Dec 3, 2025) > Nov 30, 2025 -> status should be Overdue
    
    // Calculate the cutoff date: beginning of current month (Dec 1, 2025)
    // Any payment_month before this should be Overdue if still Unpaid
    const currentMonthStart = new Date(today.getFullYear(), today.getMonth(), 1);
    currentMonthStart.setHours(0, 0, 0, 0);
    
    console.log('Updating Unpaid entries to Overdue for months before:', currentMonthStart.toDateString());
    
    // First, fetch all Unpaid entries to check which ones need updating
    const { data: unpaidEntries, error: unpaidFetchError } = await supabase
      .from('fee_payments')
      .select('id, payment_month')
      .eq('organization_id', userData.organization_id)
      .eq('status', 'Unpaid');
    
    if (unpaidFetchError) {
      console.error('Error fetching unpaid entries:', unpaidFetchError);
    } else if (unpaidEntries && unpaidEntries.length > 0) {
      // Filter entries where payment_month has ended (before current month)
      const entriesToUpdate = unpaidEntries.filter(entry => {
        const paymentMonthDate = new Date(entry.payment_month + ' 1');
        const monthEnd = new Date(paymentMonthDate.getFullYear(), paymentMonthDate.getMonth() + 1, 0);
        monthEnd.setHours(23, 59, 59, 999);
        return today > monthEnd;
      });
      
      if (entriesToUpdate.length > 0) {
        console.log(`Found ${entriesToUpdate.length} Unpaid entries to convert to Overdue`);
        
        // Bulk update all entries that should be Overdue
        const idsToUpdate = entriesToUpdate.map(e => e.id);
        const { error: bulkUpdateError } = await supabase
          .from('fee_payments')
          .update({ status: 'Overdue' })
          .in('id', idsToUpdate);
        
        if (bulkUpdateError) {
          console.error('Error bulk updating to Overdue:', bulkUpdateError);
        } else {
          console.log(`✅ Successfully updated ${idsToUpdate.length} entries to Overdue status`);
        }
      } else {
        console.log('No Unpaid entries need to be converted to Overdue');
      }
    }

    // Fetch ALL students (including suspended ones) from students table
    // We'll filter suspended students later based on their fee payment status
    const { data: allStudents, error: studentsError } = await supabase
      .from('students')
      .select(`
        id,
        name,
        roll_number,
        class_id,
        admission_date,
        monthly_fee,
        is_active,
        status,
        whatsapp,
        classes(
          id,
          name,
          monthly_fee
        )
      `)
      .eq('organization_id', userData.organization_id);

    if (studentsError) {
      console.error('Error fetching students:', studentsError);
      return NextResponse.json(
        { error: 'Failed to fetch students' },
        { status: 500 }
      );
    }

    // Debug logging
    const suspendedStudents = allStudents?.filter(s => s.status === 'suspended') || [];
    console.log('Total students fetched:', allStudents?.length);
    console.log('Sample student data:', allStudents?.[0]);
    console.log('WhatsApp field check:', allStudents?.map(s => ({ name: s.name, whatsapp: s.whatsapp })).slice(0, 3));
    console.log('Suspended students found:', suspendedStudents.length);
    console.log('Suspended students:', suspendedStudents.map(s => ({ id: s.id, name: s.name, class_id: s.class_id })));

    // Fetch fee payments for current month AND all overdue payments from any month
    // This ensures we see all overdue fees, not just from the selected month
    const { data: feePayments, error: feeError } = await supabase
      .from('fee_payments')
      .select(`
        *,
        students!inner(
          id,
          name,
          roll_number,
          class_id,
          admission_date,
          monthly_fee,
          status,
          whatsapp,
          classes(
            id,
            name,
            monthly_fee
          )
        )
      `)
      .eq('organization_id', userData.organization_id)
      .or(`payment_month.eq.${filterMonth},status.eq.Overdue`);

    if (feeError) {
      console.error('Error fetching fee payments:', feeError);
      return NextResponse.json(
        { error: 'Failed to fetch fee payments' },
        { status: 500 }
      );
    }

    // Debug logging for fee payments
    console.log('Fee payments fetched:', feePayments?.length);
    const suspendedFeePayments = feePayments?.filter(fp => {
      const student = (fp as any).students;
      return student?.status === 'suspended';
    }) || [];
    console.log('Fee payments for suspended students:', suspendedFeePayments.length);
    console.log('Suspended fee payments:', suspendedFeePayments.map(fp => ({
      student_id: fp.student_id,
      status: fp.status,
      student_name: (fp as any).students?.name
    })));

    // Fetch ONLY paid fees from history for current month
    const { data: paidHistory, error: historyError } = await supabase
      .from('fee_payment_history')
      .select(`
        *,
        students!inner(
          id,
          name,
          roll_number,
          class_id,
          admission_date,
          monthly_fee,
          status,
          whatsapp,
          classes(
            id,
            name,
            monthly_fee
          )
        )
      `)
      .eq('organization_id', userData.organization_id)
      .eq('payment_month', filterMonth);

    if (historyError) {
      console.error('Error fetching payment history:', historyError);
      // Don't fail the request, just log the error
    }

    // Note: Status updates are now handled proactively before fetching data (see above)
    // All Unpaid entries from previous months have already been converted to Overdue in the database

    // Create a set of student IDs who have overdue payments (including suspended students)
    const studentsWithOverduePayments = new Set(
      feePayments?.filter(fp => fp.status === 'Overdue').map(fp => fp.student_id) || []
    );

    // Create a set of student IDs who have paid fees (including suspended students)
    const studentsWithPaidFees = new Set(
      paidHistory?.map(fp => fp.student_id) || []
    );

    console.log('Students with overdue payments:', studentsWithOverduePayments.size);
    console.log('Overdue payment student IDs:', Array.from(studentsWithOverduePayments));
    console.log('Students with paid fees:', studentsWithPaidFees.size);

    // IMPORTANT: Filter students to include:
    // 1. All active students (all payment statuses)
    // 2. Suspended students who have overdue payments OR paid fees
    //    - Suspended students without any fee activity are excluded
    //    - Suspended students with overdue: see only their overdue entries
    //    - Suspended students with paid: see only their paid entries
    const filteredStudents = allStudents?.filter(student => {
      const isActive = student.is_active && student.status !== 'suspended';
      const isSuspendedWithOverdue = student.status === 'suspended' && studentsWithOverduePayments.has(student.id);
      const isSuspendedWithPaid = student.status === 'suspended' && studentsWithPaidFees.has(student.id);
      
      if (student.status === 'suspended') {
        console.log(`Suspended student ${student.name}:`, {
          id: student.id,
          hasOverdue: studentsWithOverduePayments.has(student.id),
          hasPaid: studentsWithPaidFees.has(student.id),
          willBeIncluded: isSuspendedWithOverdue || isSuspendedWithPaid
        });
      }
      
      return isActive || isSuspendedWithOverdue || isSuspendedWithPaid;
    });

    console.log('Filtered students count:', filteredStudents?.length);
    console.log('Suspended students in filtered list:', filteredStudents?.filter(s => s.status === 'suspended').length);

    // Calculate overall stats
    // Total students from filtered list
    const totalStudents = filteredStudents?.length || 0;
    
    // Count from fee_payments (includes current month + all overdue from any month)
    // Unpaid count: only from current/selected month
    const unpaidCount = feePayments?.filter(fp => fp.status === 'Unpaid' && fp.payment_month === filterMonth).length || 0;
    // Overdue count: from ALL months (that's why we fetch with .or filter)
    const overdueCount = feePayments?.filter(fp => fp.status === 'Overdue').length || 0;
    const partialCount = feePayments?.filter(fp => fp.status === 'Partial').length || 0;
    
    // Count ONLY paid from history (for current month)
    const paidCount = paidHistory?.length || 0;

    // Total fees: sum of current month fees + paid history for current month
    // Note: Overdue fees from previous months are already in feePayments
    const totalFees = (feePayments?.reduce((sum, fp) => sum + Number(fp.amount), 0) || 0) +
                     (paidHistory?.reduce((sum, fp) => sum + Number(fp.amount), 0) || 0);
    const collectedFees = (feePayments?.reduce((sum, fp) => sum + Number(fp.paid_amount), 0) || 0) + 
                         (paidHistory?.reduce((sum, fp) => sum + Number(fp.paid_amount), 0) || 0);

    // Group by class (combine students table data with fee info)
    const classFeeMap = new Map();
    
    // First, add filtered students to the map (active students + suspended with overdue)
    filteredStudents?.forEach(student => {
      const classData = (student as any).classes;
      const className = classData?.name || 'Unassigned';
      const classId = classData?.id || null;

      if (!classFeeMap.has(className)) {
        classFeeMap.set(className, {
          id: classId,
          name: className,
          students: new Map(),
          totalFees: 0,
          collectedFees: 0,
          paidCount: 0,
          unpaidCount: 0,
          overdueCount: 0,
          partialCount: 0,
        });
      }

      const classStats = classFeeMap.get(className);
      
      // Add student if not already added
      if (!classStats.students.has(student.id)) {
        classStats.students.set(student.id, {
          id: student.id,
          name: student.name,
          rollNumber: student.roll_number,
          admissionDate: student.admission_date,
          monthlyFee: student.monthly_fee,
          status: student.status,
          whatsapp: student.whatsapp,
          feePayments: []
        });
      }
    });
    
    // Process current fee payments (unpaid, pending, overdue)
    feePayments?.forEach(fp => {
      const student = (fp as any).students;
      const classData = student?.classes;
      const className = classData?.name || 'Unassigned';

      // Only process if class already exists (from students table)
      if (!classFeeMap.has(className)) {
        return; // Skip if student's class not found
      }

      // For suspended students, ONLY process overdue payments
      if (student.status === 'suspended' && fp.status !== 'Overdue') {
        console.log(`Skipping ${fp.status} payment for suspended student ${student.name}`);
        return; // Skip non-overdue payments for suspended students
      }

      const classStats = classFeeMap.get(className);
      
      // Get or create student entry
      if (!classStats.students.has(fp.student_id)) {
        classStats.students.set(fp.student_id, {
          id: student.id,
          name: student.name,
          rollNumber: student.roll_number,
          admissionDate: student.admission_date,
          monthlyFee: student.monthly_fee,
          status: student.status,
          whatsapp: student.whatsapp,
          feePayments: []
        });
      }

      // Add fee payment to student
      const studentData = classStats.students.get(fp.student_id);
      studentData.feePayments.push({
        id: fp.id,
        amount: fp.amount,
        paidAmount: fp.paid_amount,
        status: fp.status,
        paymentMonth: fp.payment_month,
        paymentDate: fp.payment_date,
        dueDate: fp.due_date,
        paymentMethod: fp.payment_method,
        receiptNumber: fp.receipt_number,
        discount: fp.discount,
        lateFee: fp.late_fee,
        notes: fp.notes,
      });

      // Update class stats (only for fee_payments statuses)
      classStats.totalFees += Number(fp.amount);
      classStats.collectedFees += Number(fp.paid_amount);
      
      if (fp.status === 'Unpaid') classStats.unpaidCount++;
      if (fp.status === 'Overdue') classStats.overdueCount++;
      if (fp.status === 'Partial') classStats.partialCount++;
    });

    // Process paid history (fees that were collected) - ONLY for paid count
    paidHistory?.forEach(fp => {
      const student = (fp as any).students;
      const classData = student?.classes;
      const className = classData?.name || 'Unassigned';

      // Only process if class already exists (from students table)
      if (!classFeeMap.has(className)) {
        return; // Skip if student's class not found
      }

      // For suspended students, we DO want to show their paid history
      // This allows tracking of payments made while suspended

      const classStats = classFeeMap.get(className);
      
      // Get or create student entry
      if (!classStats.students.has(fp.student_id)) {
        classStats.students.set(fp.student_id, {
          id: student.id,
          name: student.name,
          rollNumber: student.roll_number,
          admissionDate: student.admission_date,
          monthlyFee: student.monthly_fee,
          status: student.status,
          whatsapp: student.whatsapp,
          feePayments: []
        });
      }

      // Add paid fee payment to student
      const studentData = classStats.students.get(fp.student_id);
      studentData.feePayments.push({
        id: fp.id,
        amount: fp.amount,
        paidAmount: fp.paid_amount,
        status: 'Paid', // From history, so it's paid
        paymentMonth: fp.payment_month,
        paymentDate: fp.payment_date,
        dueDate: fp.due_date,
        paymentMethod: fp.payment_method,
        receiptNumber: fp.receipt_number,
        discount: fp.discount,
        lateFee: fp.late_fee,
        notes: fp.notes,
      });

      // Update class stats - ONLY paid count and collected fees
      classStats.totalFees += Number(fp.amount);
      classStats.collectedFees += Number(fp.paid_amount);
      classStats.paidCount++;
    });

    // Convert Map to array format
    const classesData = Array.from(classFeeMap.values()).map(classData => ({
      id: classData.id,
      name: classData.name,
      totalStudents: classData.students.size,
      paidStudents: classData.paidCount,
      unpaidStudents: classData.unpaidCount,
      overdueStudents: classData.overdueCount,
      partialStudents: classData.partialCount,
      totalFees: classData.totalFees,
      collectedFees: classData.collectedFees,
      students: Array.from(classData.students.values()),
    }));

    return NextResponse.json({
      stats: {
        totalStudents,
        paidCount,
        unpaidCount,
        overdueCount,
        partialCount,
        totalFees,
        collectedFees,
        currentMonth: filterMonth, // Return the month being displayed
      },
      classes: classesData,
    }, { status: 200, headers: response.headers });

  } catch (error) {
    console.error('Unexpected error in GET /api/fees/stats:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
