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
 *
 * Business Rule:
 *   A month becomes due when one full billing cycle has elapsed from the admission date.
 *   The admission month itself is the FIRST month to become due, and it becomes due
 *   only when the same date arrives in the NEXT calendar month.
 *
 *   Example: Admission = 15 May
 *     - Before 15 June  → nothing is due
 *     - On 15 June      → May becomes due   (completionDate = June 15, dueName = May)
 *     - On 15 July      → June becomes due  (completionDate = July 15, dueName = June)
 *     - On 15 August    → July becomes due  (completionDate = Aug 15,  dueName = July)
 *
 *   Each iteration i:
 *     completionDate = admissionDate + i months  (trigger: when this date passes, a new month is due)
 *     monthName      = admissionDate + (i-1) months  (the month that just became due)
 */
export function getCompletedBillingMonths(admissionDateStr: string, currentDate: Date = new Date()): { monthName: string; dueDate: string }[] {
  const admissionDate = new Date(admissionDateStr);
  admissionDate.setHours(0, 0, 0, 0);

  const today = new Date(currentDate);
  today.setHours(0, 0, 0, 0);

  const billingMonths: { monthName: string; dueDate: string }[] = [];
  const todayYear = today.getFullYear();
  const todayMonth = today.getMonth();

  let i = 0;
  while (true) {
    const cycleDate = addMonths(admissionDate, i);
    cycleDate.setHours(0, 0, 0, 0);

    const cycleYear = cycleDate.getFullYear();
    const cycleMonth = cycleDate.getMonth();

    // Do not generate billing months beyond the current calendar month
    if (cycleYear > todayYear || (cycleYear === todayYear && cycleMonth > todayMonth)) {
      break;
    }

    const monthName = cycleDate.toLocaleString('en-US', { month: 'long', year: 'numeric' });
    const dueDateStr = cycleDate.toISOString().split('T')[0];

    billingMonths.push({ monthName, dueDate: dueDateStr });

    i++;
    if (i > 1200) break; // safety: 100-year guard
  }

  return billingMonths;
}

/**
 * Synchronizes fee payments for a single student based on their admission date and today's date.
 */
export async function syncStudentFeePayments(supabase: any, studentId: string, currentDate: Date = new Date()) {
  try {
    // 1. Fetch student details
    const { data: student, error: studentError } = await supabase
      .from('students')
      .select('admission_date, monthly_fee, is_active')
      .eq('id', studentId)
      .single();

    if (studentError || !student || !student.admission_date) {
      console.error('Error fetching student for fee sync:', studentError);
      return;
    }

    const monthlyFee = Number(student.monthly_fee) || 0;

    // 2. Get all completed billing months based on calendar logic
    const completedBillingMonths = getCompletedBillingMonths(student.admission_date, currentDate);
    const completedBillingMonthsNames = completedBillingMonths.map(m => m.monthName.toLowerCase());

    // 3. Fetch existing payments from fee_payments
    const { data: existingPaymentsData, error: paymentsError } = await supabase
      .from('fee_payments')
      .select('*')
      .eq('student_id', studentId);

    if (paymentsError) {
      console.error('Error fetching existing fee payments:', paymentsError);
    }

    const existingPayments = existingPaymentsData || [];

    const paidMonthsNames = new Set(
      existingPayments
        .filter((p: any) => p.status === 'Paid' || Number(p.paid_amount) > 0)
        .map((p: any) => p.payment_month?.toLowerCase())
        .filter(Boolean)
    );
    const unpaidMonthsMap = new Map<string, any>(
      existingPayments
        .filter((p: any) => p.status !== 'Paid' && Number(p.paid_amount || 0) === 0)
        .map((p: any) => [p.payment_month?.toLowerCase(), p])
    );

    // 4. For each completed billing month, sync its record
    const entriesToInsert = [];

    for (const billingMonth of completedBillingMonths) {
      const monthLower = billingMonth.monthName.toLowerCase();

      // If it has been paid, do nothing.
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
      const paymentMonthDate = new Date(billingMonth.monthName + ' 1');
      const monthEnd = new Date(paymentMonthDate.getFullYear(), paymentMonthDate.getMonth() + 1, 0);
      const isPastMonth = currentDate > monthEnd;
      const initialStatus = isPastMonth ? 'Overdue' : 'Pending';

      const receiptNumber = `FEE-PENDING-${Date.now()}-${Math.random().toString(36).substr(2, 5).toUpperCase()}`;
      entriesToInsert.push({
        student_id: studentId,
        amount: monthlyFee,
        payment_month: billingMonth.monthName,
        payment_date: student.admission_date,
        due_date: billingMonth.dueDate,
        status: initialStatus,
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

    // Retain all existing fee records safely without deletion
  } catch (err) {
    console.error('Unexpected error in syncStudentFeePayments:', err);
  }
}

/**
 * Synchronizes fee payments for ALL active students in an organization.
 * Used for organization-wide stats synchronization and bulk fee generation.
 */
export async function syncAllStudentFeePayments(supabase: any, organizationId?: string, currentDate: Date = new Date()) {
  try {
    // 1. Fetch all active students
    let studentsQuery = supabase
      .from('students')
      .select('id, admission_date, monthly_fee, name')
      .eq('is_active', true);
    // organization_id does not exist in the database
    const { data: students, error: studentsError } = await studentsQuery;

    if (studentsError || !students || students.length === 0) {
      return;
    }

    // 2. Fetch all unpaid fee payments for the organization
    let unpaidQuery = supabase
      .from('fee_payments')
      .select('*');
    // organization_id does not exist in the database
    const { data: allUnpaid, error: unpaidError } = await unpaidQuery;

    if (unpaidError) {
      console.error('Error fetching unpaid payments for sync:', unpaidError);
      return;
    }

    // 3. Group payments by student_id into paid and unpaid
    const unpaidByStudent = new Map<string, any[]>();
    const paidByStudent = new Map<string, Set<string>>();

    for (const payment of allUnpaid || []) {
      const sId = payment.student_id;
      if (payment.status === 'Paid' || Number(payment.paid_amount) > 0) {
        if (!paidByStudent.has(sId)) {
          paidByStudent.set(sId, new Set());
        }
        if (payment.payment_month) {
          paidByStudent.get(sId)!.add(payment.payment_month.toLowerCase());
        }
      } else {
        if (!unpaidByStudent.has(sId)) {
          unpaidByStudent.set(sId, []);
        }
        unpaidByStudent.get(sId)!.push(payment);
      }
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
        const paymentMonthDate = new Date(billingMonth.monthName + ' 1');
        const monthEnd = new Date(paymentMonthDate.getFullYear(), paymentMonthDate.getMonth() + 1, 0);
        const isPastMonth = currentDate > monthEnd;
        const initialStatus = isPastMonth ? 'Overdue' : 'Pending';

        const receiptNumber = `FEE-PENDING-${Date.now()}-${Math.random().toString(36).substr(2, 5).toUpperCase()}`;
        entriesToInsert.push({
          student_id: studentId,
          amount: monthlyFee,
          payment_month: billingMonth.monthName,
          payment_date: student.admission_date,
          due_date: billingMonth.dueDate,
          status: initialStatus,
          paid_amount: 0.00,
          discount: 0.00,
          late_fee: 0.00,
          receipt_number: receiptNumber,
          collected_by: null,
          notes: `Fee entry created automatically for ${billingMonth.monthName}`
        });
      }
    }

    // 6. Perform bulk insert for new fee entries (no records are ever deleted)
    if (entriesToInsert.length > 0) {
      const { error: insertError } = await supabase
        .from('fee_payments')
        .insert(entriesToInsert);
      if (insertError) {
        console.error('Error inserting bulk synced fee entries:', insertError);
      }
    }
  } catch (err) {
    console.error('Unexpected error in syncAllStudentFeePayments:', err);
  }
}
