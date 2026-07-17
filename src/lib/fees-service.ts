/**
 * Fee Service
 * Implements calendar-based monthly fee tracking and sync logic.
 */

/**
 * Add a specific number of months to a date, handling month-end constraints correctly.
 */
export function addMonths(date: Date, months: number): Date {
  const d = new Date(date);
  const originalDay = date.getDate();
  d.setMonth(d.getMonth() + months);
  
  // If the day of the month changed (e.g. 31 -> 30 or 28), it means we wrapped past month end.
  // We adjust it to the last day of the expected target month.
  if (d.getDate() !== originalDay) {
    d.setDate(0);
  }
  return d;
}

/**
 * Calculates completed billing months for a student starting from their admission date.
 * A month is only completed after one full month has passed from the admission date.
 */
export function getCompletedBillingMonths(admissionDateStr: string, currentDate: Date = new Date()): { monthName: string; dueDate: string }[] {
  const admissionDate = new Date(admissionDateStr);
  admissionDate.setHours(0, 0, 0, 0);

  const today = new Date(currentDate);
  today.setHours(0, 0, 0, 0);

  const completedMonths: { monthName: string; dueDate: string }[] = [];
  
  let i = 1;
  while (true) {
    const completionDate = addMonths(admissionDate, i);
    completionDate.setHours(0, 0, 0, 0);

    // Only include months that have completed up to today (completionDate <= today)
    if (completionDate > today) {
      break;
    }

    const monthName = completionDate.toLocaleString('en-US', { month: 'long', year: 'numeric' });
    const dueDateStr = completionDate.toISOString().split('T')[0];

    completedMonths.push({
      monthName,
      dueDate: dueDateStr
    });

    i++;
    if (i > 1200) break; // safety break to prevent infinite loop (100 years limit)
  }

  return completedMonths;
}

/**
 * Synchronizes fee payments for a single student based on their admission date and today's date.
 */
export async function syncStudentFeePayments(supabase: any, studentId: string, currentDate: Date = new Date()) {
  try {
    // 1. Fetch student details
    const { data: student, error: studentError } = await supabase
      .from('students')
      .select('admission_date, monthly_fee, organization_id, is_active')
      .eq('id', studentId)
      .single();

    if (studentError || !student || !student.admission_date) {
      console.error('Error fetching student for fee sync:', studentError);
      return;
    }

    const monthlyFee = Number(student.monthly_fee) || 0;
    const organizationId = student.organization_id;

    // 2. Get all completed billing months based on calendar logic
    const completedBillingMonths = getCompletedBillingMonths(student.admission_date, currentDate);
    const completedBillingMonthsNames = completedBillingMonths.map(m => m.monthName.toLowerCase());

    // 3. Fetch existing payments from both tables
    const [existingPaymentsRes, existingHistoryRes] = await Promise.all([
      supabase.from('fee_payments').select('*').eq('student_id', studentId),
      supabase.from('fee_payment_history').select('*').eq('student_id', studentId)
    ]);

    const existingPayments = existingPaymentsRes.data || [];
    const existingHistory = existingHistoryRes.data || [];

    const paidMonthsNames = new Set(existingHistory.map((h: any) => h.payment_month.toLowerCase()));
    const unpaidMonthsMap = new Map<string, any>(existingPayments.map((p: any) => [p.payment_month.toLowerCase(), p]));

    // 4. For each completed billing month, sync its record
    const entriesToInsert = [];

    for (const billingMonth of completedBillingMonths) {
      const monthLower = billingMonth.monthName.toLowerCase();

      // If it has been paid (exists in fee_payment_history), do nothing.
      if (paidMonthsNames.has(monthLower)) {
        continue;
      }

      // If it exists in fee_payments, make sure it is updated with the correct amount
      const existingUnpaid = unpaidMonthsMap.get(monthLower);
      if (existingUnpaid) {
        if (Number(existingUnpaid.amount) !== monthlyFee) {
          await supabase
            .from('fee_payments')
            .update({ amount: monthlyFee })
            .eq('id', existingUnpaid.id);
        }
        continue;
      }

      // Otherwise, generate a new unpaid record in fee_payments
      const receiptNumber = `FEE-PENDING-${Date.now()}-${Math.random().toString(36).substr(2, 5).toUpperCase()}`;
      entriesToInsert.push({
        student_id: studentId,
        organization_id: organizationId,
        amount: monthlyFee,
        payment_month: billingMonth.monthName,
        payment_date: student.admission_date,
        due_date: billingMonth.dueDate,
        status: 'Unpaid',
        paid_amount: 0.00,
        discount: 0.00,
        late_fee: 0.00,
        receipt_number: receiptNumber,
        collected_by: null,
        notes: `Fee entry created automatically for ${billingMonth.monthName}`
      });
    }

    if (entriesToInsert.length > 0) {
      const { error: insertError } = await supabase
        .from('fee_payments')
        .insert(entriesToInsert);
      if (insertError) {
        console.error('Error inserting synced fee entries:', insertError);
      }
    }

    // 5. Clean up any unpaid records in fee_payments that are NOT valid completed billing months
    const unpaidToDelete = existingPayments.filter((p: any) => {
      const monthLower = p.payment_month.toLowerCase();
      return p.status === 'Unpaid' && !completedBillingMonthsNames.includes(monthLower);
    });

    if (unpaidToDelete.length > 0) {
      const idsToDelete = unpaidToDelete.map((p: any) => p.id);
      const { error: deleteError } = await supabase
        .from('fee_payments')
        .delete()
        .in('id', idsToDelete);
      if (deleteError) {
        console.error('Error deleting invalid fee entries:', deleteError);
      }
    }
  } catch (err) {
    console.error('Unexpected error in syncStudentFeePayments:', err);
  }
}

/**
 * Synchronizes fee payments for ALL active students in an organization.
 * Used for organization-wide stats synchronization and bulk fee generation.
 */
export async function syncAllStudentFeePayments(supabase: any, organizationId: string, currentDate: Date = new Date()) {
  try {
    // 1. Fetch all active students
    const { data: students, error: studentsError } = await supabase
      .from('students')
      .select('id, admission_date, monthly_fee, name')
      .eq('organization_id', organizationId)
      .eq('is_active', true);

    if (studentsError || !students || students.length === 0) {
      return;
    }

    // 2. Fetch all unpaid fee payments for the organization
    const { data: allUnpaid, error: unpaidError } = await supabase
      .from('fee_payments')
      .select('*')
      .eq('organization_id', organizationId);

    if (unpaidError) {
      console.error('Error fetching unpaid payments for sync:', unpaidError);
      return;
    }

    // 3. Fetch all paid fee histories for the organization
    const { data: allPaid, error: paidError } = await supabase
      .from('fee_payment_history')
      .select('student_id, payment_month')
      .eq('organization_id', organizationId);

    if (paidError) {
      console.error('Error fetching paid history for sync:', paidError);
      return;
    }

    // 4. Group by student_id
    const unpaidByStudent = new Map<string, any[]>();
    const paidByStudent = new Map<string, Set<string>>();

    for (const payment of allUnpaid || []) {
      const sId = payment.student_id;
      if (!unpaidByStudent.has(sId)) {
        unpaidByStudent.set(sId, []);
      }
      unpaidByStudent.get(sId)!.push(payment);
    }

    for (const history of allPaid || []) {
      const sId = history.student_id;
      if (!paidByStudent.has(sId)) {
        paidByStudent.set(sId, new Set());
      }
      paidByStudent.get(sId)!.add(history.payment_month.toLowerCase());
    }

    const entriesToInsert: any[] = [];
    const idsToDelete: string[] = [];

    // 5. For each student, check what needs to be synced
    for (const student of students) {
      if (!student.admission_date) {
        continue;
      }

      const studentId = student.id;
      const monthlyFee = Number(student.monthly_fee) || 0;

      // Get completed billing months for this student
      const completedBillingMonths = getCompletedBillingMonths(student.admission_date, currentDate);
      const completedBillingMonthsNames = completedBillingMonths.map(m => m.monthName.toLowerCase());

      const studentPaidMonths = paidByStudent.get(studentId) || new Set<string>();
      const studentUnpaidPayments = unpaidByStudent.get(studentId) || [];
      const studentUnpaidMap = new Map<string, any>(studentUnpaidPayments.map(p => [p.payment_month.toLowerCase(), p]));

      // Check which completed billing months are missing or need updating
      for (const billingMonth of completedBillingMonths) {
        const monthLower = billingMonth.monthName.toLowerCase();

        // If paid, skip
        if (studentPaidMonths.has(monthLower)) {
          continue;
        }

        const existingUnpaid = studentUnpaidMap.get(monthLower);
        if (existingUnpaid) {
          if (Number(existingUnpaid.amount) !== monthlyFee) {
            await supabase
              .from('fee_payments')
              .update({ amount: monthlyFee })
              .eq('id', existingUnpaid.id);
          }
          continue;
        }

        // Otherwise, prepare a new unpaid record
        const receiptNumber = `FEE-PENDING-${Date.now()}-${Math.random().toString(36).substr(2, 5).toUpperCase()}`;
        entriesToInsert.push({
          student_id: studentId,
          organization_id: organizationId,
          amount: monthlyFee,
          payment_month: billingMonth.monthName,
          payment_date: student.admission_date,
          due_date: billingMonth.dueDate,
          status: 'Unpaid',
          paid_amount: 0.00,
          discount: 0.00,
          late_fee: 0.00,
          receipt_number: receiptNumber,
          collected_by: null,
          notes: `Fee entry created automatically for ${billingMonth.monthName}`
        });
      }

      // Identify unpaid records in fee_payments that are NOT valid completed billing months
      const unpaidToDelete = studentUnpaidPayments.filter(p => {
        const monthLower = p.payment_month.toLowerCase();
        return p.status === 'Unpaid' && !completedBillingMonthsNames.includes(monthLower);
      });

      for (const p of unpaidToDelete) {
        idsToDelete.push(p.id);
      }
    }

    // 6. Perform bulk DB operations
    if (entriesToInsert.length > 0) {
      const { error: insertError } = await supabase
        .from('fee_payments')
        .insert(entriesToInsert);
      if (insertError) {
        console.error('Error inserting bulk synced fee entries:', insertError);
      }
    }

    if (idsToDelete.length > 0) {
      const { error: deleteError } = await supabase
        .from('fee_payments')
        .delete()
        .in('id', idsToDelete);
      if (deleteError) {
        console.error('Error deleting bulk invalid fee entries:', deleteError);
      }
    }
  } catch (err) {
    console.error('Unexpected error in syncAllStudentFeePayments:', err);
  }
}
