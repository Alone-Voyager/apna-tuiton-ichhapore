import { NextRequest, NextResponse } from 'next/server';
import { getRequestOrgContext } from '@/lib/supabase/server';
import { supabaseAdmin } from '@/lib/supabase/client';
import { syncAllStudentFeePayments } from '@/lib/fees-service';

// GET /api/fees/stats - Fetch fee payment statistics
export async function GET(request: NextRequest) {
  try {
    const { user } = await getRequestOrgContext(request);

    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Get user's organization_id & role using service role client
    let userData = null;
    const { data: adminProfile } = await supabaseAdmin
      .from('admin_profiles')
      .select('*')
      .eq('user_id', user.id)
      .maybeSingle();

    if (adminProfile?.organization_id) {
      userData = adminProfile;
    } else {
      const { data: fallbackOrg } = await supabaseAdmin
        .from('organizations')
        .select('id')
        .limit(1)
        .maybeSingle();
      if (fallbackOrg?.id) {
        userData = { organization_id: fallbackOrg.id, role: 'admin' };
      }
    }

    if (!userData?.organization_id) {
      return NextResponse.json(
        { error: 'Organization not found' },
        { status: 404 }
      );
    }

    if (userData.role === 'staff' || userData.role === 'teacher') {
      return NextResponse.json(
        { error: 'Access Denied: Staff users do not have permission to access fee statistics' },
        { status: 403 }
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
    const { data: unpaidEntries, error: unpaidFetchError } = await supabaseAdmin
      .from('fee_payments')
      .select('id, payment_month')
      // [ORG-FILTER-SKIP] .eq('organization_id', userData.organization_id)
      .eq('status', 'Unpaid');
    
    if (unpaidFetchError) {
      console.error('Error fetching unpaid entries:', unpaidFetchError);
    } else if (unpaidEntries && unpaidEntries.length > 0) {
      // Filter entries where payment_month has ended (before current month)
      const entriesToUpdate = unpaidEntries.filter((entry: any) => {
        const paymentMonthDate = new Date(entry.payment_month + ' 1');
        const monthEnd = new Date(paymentMonthDate.getFullYear(), paymentMonthDate.getMonth() + 1, 0);
        monthEnd.setHours(23, 59, 59, 999);
        return today > monthEnd;
      });
      
      if (entriesToUpdate.length > 0) {
        console.log(`Found ${entriesToUpdate.length} Unpaid entries to convert to Overdue`);
        
        // Bulk update all entries that should be Overdue
        const idsToUpdate = entriesToUpdate.map((e: any) => e.id);
        const { error: bulkUpdateError } = await supabaseAdmin
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
    const { data: allStudents, error: studentsError } = await supabaseAdmin
      .from('students')
      .select(`
        id,
        name,
        roll_number,
        whatsapp,
        status,
        is_active,
        monthly_fee,
        classes (
          id,
          name
        )
      `)
      .order('name', { ascending: true });

    if (studentsError) {
      console.error('Error fetching students:', studentsError);
      return NextResponse.json(
        { error: 'Failed to fetch students data' },
        { status: 500 }
      );
    }

    const suspendedStudents = allStudents?.filter((s: any) => s.status === 'suspended') || [];
    const activeStudents = allStudents?.filter((s: any) => s.status === 'active' || s.is_active === true) || [];
    
    console.log('WhatsApp field check:', allStudents?.map((s: any) => ({ name: s.name, whatsapp: s.whatsapp })).slice(0, 3));
    console.log('Total students:', allStudents?.length, 'Active:', activeStudents.length, 'Suspended:', suspendedStudents.length);
    console.log('Suspended students:', suspendedStudents.map((s: any) => ({ id: s.id, name: s.name, class_id: (s as any).class_id })));

    // Fetch fee payments for current month AND all overdue payments from any month
    // This ensures we see all overdue fees, not just from the selected month
    const { data: feePayments, error: feeError } = await supabaseAdmin
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
      // [ORG-FILTER-SKIP] .eq('organization_id', userData.organization_id)
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
    const suspendedFeePayments = feePayments?.filter((fp: any) => {
      return suspendedStudents.some((s: any) => s.id === fp.student_id);
    }) || [];
    
    console.log('Suspended fee payments:', suspendedFeePayments.map((fp: any) => ({
      id: fp.id,
      student_id: fp.student_id,
      status: fp.status,
      payment_month: fp.payment_month
    })));

    // Fetch ONLY paid fees from history for current month
    const { data: paidHistory, error: historyError } = await supabaseAdmin
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
      // [ORG-FILTER-SKIP] .eq('organization_id', userData.organization_id)
      .eq('payment_month', filterMonth);

    if (historyError) {
      console.error('Error fetching payment history:', historyError);
      // Don't fail the request, just log the error
    }

    const isStudentActive = (s: any) => {
      const isDeleted = s.status === 'inactive' || s.status === 'deleted' || s.status === 'archived' || s.status === 'suspended';
      const isExplicitlyInactive = s.is_active === false;
      return !isDeleted && !isExplicitlyInactive;
    };

    const studentsWithOverdueOrPaidInFilteredMonth = new Set([
      ...(feePayments?.filter((fp: any) => fp.status === 'Overdue').map((fp: any) => fp.student_id) || []),
      ...(paidHistory?.map((fp: any) => fp.student_id) || [])
    ]);

    const filteredStudents = allStudents?.filter((student: any) => {
      if (isStudentActive(student)) return true;
      if (student.status === 'suspended' && studentsWithOverdueOrPaidInFilteredMonth.has(student.id)) {
        return true;
      }
      return false;
    });

    const validStudentIds = new Set(filteredStudents?.map((s: any) => s.id) || []);
    const validFeePayments = feePayments?.filter((fp: any) => validStudentIds.has(fp.student_id)) || [];
    const validPaidHistory = paidHistory?.filter((fp: any) => validStudentIds.has(fp.student_id)) || [];

    const totalStudents = filteredStudents?.length || 0;
    const unpaidCount = validFeePayments.filter((fp: any) => fp.status === 'Unpaid' && fp.payment_month === filterMonth).length;
    const paidCount = validPaidHistory.length;
    const overdueCount = validFeePayments.filter((fp: any) => fp.status === 'Overdue').length;
    const partialCount = validFeePayments.filter((fp: any) => fp.status === 'Partial').length;

    const totalFees = (validFeePayments.reduce((sum: number, fp: any) => sum + Number(fp.amount), 0)) +
                        (validPaidHistory.reduce((sum: number, fp: any) => sum + Number(fp.amount), 0));
    
    const collectedFees = (validFeePayments.reduce((sum: number, fp: any) => sum + Number(fp.paid_amount || 0), 0)) +
                         (validPaidHistory.reduce((sum: number, fp: any) => sum + Number(fp.paid_amount), 0));

    // Fetch all classes for organization to ensure empty classes appear correctly
    const { data: orgClasses } = await supabaseAdmin
      .from('classes')
      .select('id, name')
      // [ORG-FILTER-SKIP] .eq('organization_id', userData.organization_id);

    const classFeeMap = new Map<string, any>();
    
    orgClasses?.forEach((cls: any) => {
      classFeeMap.set(cls.name, {
        id: cls.id,
        name: cls.name,
        students: new Map(),
        totalFees: 0,
        collectedFees: 0,
        paidCount: 0,
        unpaidCount: 0,
        overdueCount: 0,
        partialCount: 0,
      });
    });

    // Add filtered students to the map
    filteredStudents?.forEach((student: any) => {
      const classData = student.classes;
      const className = classData?.name || 'Unassigned';
      const classId = classData?.id || 'unassigned';

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
      
      if (!classStats.students.has(student.id)) {
        classStats.students.set(student.id, {
          id: student.id,
          name: student.name,
          rollNumber: student.roll_number,
          admissionDate: student.admission_date,
          monthlyFee: student.monthly_fee,
          status: student.status,
          is_active: student.is_active,
          whatsapp: student.whatsapp,
          feePayments: []
        });
      }
    });
    
    // Process current fee payments (unpaid, pending, overdue) - ONLY for valid active/suspended students
    validFeePayments.forEach((fp: any) => {
      const student = fp.students;
      const classData = student?.classes;
      const className = classData?.name || 'Unassigned';

      if (!classFeeMap.has(className)) {
        return;
      }

      if (student?.status === 'suspended' && fp.status !== 'Overdue') {
        return;
      }

      const classStats = classFeeMap.get(className);
      
      if (student && !classStats.students.has(fp.student_id)) {
        classStats.students.set(fp.student_id, {
          id: student.id,
          name: student.name,
          rollNumber: student.roll_number,
          admissionDate: student.admission_date,
          monthlyFee: student.monthly_fee,
          status: student.status,
          is_active: student.is_active,
          whatsapp: student.whatsapp,
          feePayments: []
        });
      }

      if (classStats.students.has(fp.student_id)) {
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
      }

      classStats.totalFees += Number(fp.amount);
      classStats.collectedFees += Number(fp.paid_amount || 0);
      
      if (fp.status === 'Unpaid') classStats.unpaidCount++;
      if (fp.status === 'Overdue') classStats.overdueCount++;
      if (fp.status === 'Partial') classStats.partialCount++;
    });

    // Process paid history - ONLY for valid active/suspended students
    validPaidHistory.forEach((fp: any) => {
      const student = fp.students;
      const classData = student?.classes;
      const className = classData?.name || 'Unassigned';

      if (!classFeeMap.has(className)) {
        return;
      }

      const classStats = classFeeMap.get(className);
      
      if (student && !classStats.students.has(fp.student_id)) {
        classStats.students.set(fp.student_id, {
          id: student.id,
          name: student.name,
          rollNumber: student.roll_number,
          admissionDate: student.admission_date,
          monthlyFee: student.monthly_fee,
          status: student.status,
          is_active: student.is_active,
          whatsapp: student.whatsapp,
          feePayments: []
        });
      }

      if (classStats.students.has(fp.student_id)) {
        const studentData = classStats.students.get(fp.student_id);
        studentData.feePayments.push({
          id: fp.id,
          amount: fp.amount,
          paidAmount: fp.paid_amount,
          status: 'Paid',
          paymentMonth: fp.payment_month,
          paymentDate: fp.payment_date,
          dueDate: fp.due_date,
          paymentMethod: fp.payment_method,
          receiptNumber: fp.receipt_number,
          discount: fp.discount,
          lateFee: fp.late_fee,
          notes: fp.notes,
        });
      }

      classStats.totalFees += Number(fp.amount);
      classStats.collectedFees += Number(fp.paid_amount);
      classStats.paidCount++;
    });

    // Convert Map to array format
    const classesData = Array.from(classFeeMap.values()).map((classData: any) => ({
      id: classData.id,
      name: classData.name,
      totalStudents: Array.from(classData.students.values()).filter(isStudentActive).length,
      paidStudents: classData.paidCount,
      unpaidStudents: classData.unpaidCount,
      overdueStudents: classData.overdueCount,
      partialStudents: classData.partialCount,
      totalFees: classData.totalFees,
      collectedFees: classData.collectedFees,
      students: Array.from(classData.students.values()),
    }));

    // Calculate expected monthly revenue from active students
    const expectedMonthlyRevenue = allStudents?.filter(isStudentActive).reduce(
      (sum: number, s: any) => sum + Number(s.monthly_fee || 0),
      0
    ) || 0;

    return NextResponse.json({
      stats: {
        totalStudents,
        paidCount,
        unpaidCount,
        overdueCount,
        partialCount,
        totalFees,
        collectedFees,
        expectedMonthlyRevenue: Math.round(expectedMonthlyRevenue),
        currentMonth: filterMonth,
      },
      classes: classesData,
    }, { status: 200 });

  } catch (error) {
    console.error('Unexpected error in GET /api/fees/stats:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
