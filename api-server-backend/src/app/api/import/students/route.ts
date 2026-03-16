import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createServerClient } from '@supabase/ssr';
import { parse, isValid, format } from 'date-fns';

interface ImportRow {
  name: string;
  class: string;
  dateOfJoining: string;
  monthlyFees: number;
  pendingMonths: string[];
  pendingAmount: number;
  parentName?: string;
  parentWhatsapp?: string;
  phone?: string;
}

interface ImportResult {
  success: boolean;
  total: number;
  successful: number;
  failed: number;
  skipped: number;
  errors: string[];
  skippedRows: string[];
}

/**
 * Parse date from various formats
 */
function parseDate(dateStr: string): Date | null {
  const formats = [
    'dd/MM/yyyy',
    'dd-MM-yyyy',
    'd/M/yyyy',
    'd-M-yyyy',
    'yyyy-MM-dd',
    'MM/dd/yyyy',
    'M/d/yyyy',
    'dd-MMM-yy',
    'dd-MMM-yyyy',
    'd-MMM-yy',
    'd-MMM-yyyy',
  ];

  for (const formatStr of formats) {
    try {
      const parsed = parse(dateStr, formatStr, new Date());
      if (isValid(parsed)) {
        return parsed;
      }
    } catch {
      continue;
    }
  }

  return null;
}

/**
 * Generate month strings for fee payments
 */
function generateMonthsBetween(startDate: Date, endDate: Date): string[] {
  const months: string[] = [];
  const current = new Date(startDate);
  current.setDate(1); // Set to first day of month

  while (current <= endDate) {
    const monthStr = format(current, 'yyyy-MM');
    months.push(monthStr);
    current.setMonth(current.getMonth() + 1);
  }

  return months;
}

/**
 * Convert month name to "Month YYYY" format (e.g., "October 2025")
 */
function convertMonthNameToFormat(monthName: string, year: number): string | null {
  const monthMap: { [key: string]: string } = {
    JAN: 'January', JANUARY: 'January',
    FEB: 'February', FEBRUARY: 'February',
    MAR: 'March', MARCH: 'March',
    APR: 'April', APRIL: 'April',
    MAY: 'May',
    JUN: 'June', JUNE: 'June',
    JUL: 'July', JULY: 'July',
    AUG: 'August', AUGUST: 'August',
    SEP: 'September', SEPTEMBER: 'September',
    OCT: 'October', OCTOBER: 'October',
    NOV: 'November', NOVEMBER: 'November',
    DEC: 'December', DECEMBER: 'December',
  };

  const normalized = monthName.toUpperCase().trim();
  const fullMonthName = monthMap[normalized];

  if (fullMonthName) {
    return `${fullMonthName} ${year}`;
  }

  return null;
}

export async function POST(request: NextRequest) {
  try {
    const cookieStore = await cookies();
    
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return cookieStore.getAll();
          },
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          },
        },
      }
    );

    // Get current user
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    
    if (userError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized. Please login again.' },
        { status: 401 }
      );
    }

    // Get admin profile to get organization_id
    const { data: profileData, error: profileError } = await supabase
      .from('admin_profiles')
      .select('organization_id')
      .eq('user_id', user.id)
      .single();
    
    if (profileError || !profileData) {
      return NextResponse.json(
        { error: 'Unauthorized. Please login again.' },
        { status: 401 }
      );
    }

    const organizationId = profileData.organization_id;
    
    if (!organizationId) {
      return NextResponse.json(
        { error: 'No organization found for your account.' },
        { status: 400 }
      );
    }

    // Parse the request body
    const body = await request.json();
    const { rows } = body as { rows: ImportRow[] };

    if (!rows || !Array.isArray(rows) || rows.length === 0) {
      return NextResponse.json(
        { error: 'No data provided for import.' },
        { status: 400 }
      );
    }

    const result: ImportResult = {
      success: true,
      total: rows.length,
      successful: 0,
      failed: 0,
      skipped: 0,
      errors: [],
      skippedRows: [],
    };

    // Process each row
    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      const rowNum = i + 2; // +2 for header and 0-index

      try {
        // Validate required fields
        if (!row.name || !row.name.trim()) {
          result.skipped++;
          result.skippedRows.push(`Row ${rowNum}: Missing student name`);
          continue;
        }

        if (!row.class || !row.class.trim()) {
          result.skipped++;
          result.skippedRows.push(`Row ${rowNum}: Missing class`);
          continue;
        }

        // Parse joining date
        let joiningDate = new Date();
        if (row.dateOfJoining && row.dateOfJoining.trim()) {
          const parsed = parseDate(row.dateOfJoining);
          if (parsed) {
            joiningDate = parsed;
          } else {
            result.errors.push(`Row ${rowNum}: Invalid date format: ${row.dateOfJoining}`);
            result.failed++;
            continue;
          }
        }

        const monthlyFees = row.monthlyFees || 0;

        // Step 1: Create or get class
        const className = row.class.trim();
        
        let classData = await supabase
          .from('classes')
          .select('id, monthly_fee')
          .eq('organization_id', organizationId)
          .eq('name', className)
          .single();

        let classId: string;

        if (classData.error || !classData.data) {
          // Create new class
          const { data: newClass, error: classError } = await supabase
            .from('classes')
            .insert({
              name: className,
              organization_id: organizationId,
              monthly_fee: monthlyFees,
            })
            .select('id')
            .single();

          if (classError || !newClass) {
            result.errors.push(`Row ${rowNum}: Failed to create class: ${classError?.message}`);
            result.failed++;
            continue;
          }

          classId = newClass.id;
        } else {
          classId = classData.data.id;
          
          // Update class fee only if current student's fee is higher
          const currentClassFee = classData.data.monthly_fee || 0;
          if (monthlyFees > currentClassFee) {
            await supabase
              .from('classes')
              .update({ monthly_fee: monthlyFees })
              .eq('id', classId);
          }
        }

        // Step 2: Create student
        const { data: student, error: studentError } = await supabase
          .from('students')
          .insert({
            name: row.name.trim(),
            organization_id: organizationId,
            class_id: classId,
            admission_date: format(joiningDate, 'yyyy-MM-dd'),
            monthly_fee: monthlyFees,
            parent_name: row.parentName?.trim() || null,
            phone: row.phone?.trim() || null,
            whatsapp: row.parentWhatsapp?.trim() || null,
            status: 'active',
            is_active: true,
          })
          .select('id')
          .single();

        if (studentError || !student) {
          result.errors.push(`Row ${rowNum}: Failed to create student: ${studentError?.message}`);
          result.failed++;
          continue;
        }

        // Increment total_students count in classes table
        const { data: currentClass } = await supabase
          .from('classes')
          .select('total_students')
          .eq('id', classId)
          .single();

        if (currentClass) {
          await supabase
            .from('classes')
            .update({ total_students: (currentClass.total_students || 0) + 1 })
            .eq('id', classId);
        }

        // Step 3: Create fee payment records and payment history
        const currentYear = new Date().getFullYear();
        const currentDate = new Date();
        const pendingMonths = row.pendingMonths || [];
        const pendingAmount = row.pendingAmount || 0;

        // Helper function to get all months between two dates
        const getMonthsBetween = (startDate: Date, endDate: Date) => {
          const months = [];
          const current = new Date(startDate);
          current.setDate(1); // Start from first day of month
          
          while (current <= endDate) {
            const monthName = format(current, 'MMMM yyyy'); // e.g., "January 2025"
            months.push({
              name: monthName,
              date: new Date(current),
              year: current.getFullYear(),
              month: current.getMonth() + 1
            });
            current.setMonth(current.getMonth() + 1);
          }
          
          return months;
        };

        // Convert pending month names to set for easy lookup
        const pendingMonthSet = new Set(
          pendingMonths.map(m => convertMonthNameToFormat(m, currentYear)).filter((m): m is string => m !== null)
        );

        // Get all months from admission to current date (excluding current month)
        const lastMonth = new Date(currentDate);
        lastMonth.setMonth(lastMonth.getMonth() - 1); // Go back one month
        const allMonths = getMonthsBetween(joiningDate, lastMonth);

        const feePayments = [];
        const paymentHistory = [];

        const amountPerOverdueMonth = pendingAmount > 0 && pendingMonthSet.size > 0
          ? pendingAmount / pendingMonthSet.size
          : monthlyFees;

        const currentMonthStr = format(currentDate, 'MMMM yyyy'); // Current month to exclude

        for (const month of allMonths) {
          const monthStr = month.name;
          
          // Skip current month
          if (monthStr === currentMonthStr) {
            continue;
          }

          const dueDate = new Date(month.year, month.month - 1, 10);
          const isOverdue = pendingMonthSet.has(monthStr);

          if (isOverdue) {
            // Create overdue fee payment record (in fee_payments table only)
            feePayments.push({
              student_id: student.id,
              organization_id: organizationId,
              amount: amountPerOverdueMonth,
              payment_month: monthStr,
              payment_date: format(new Date(), 'yyyy-MM-dd'),
              due_date: format(dueDate, 'yyyy-MM-dd'),
              status: 'Overdue',
              paid_amount: 0,
              discount: 0,
              late_fee: 0,
            });
          } else {
            // Create payment history record for paid month (in fee_payment_history table only)
            paymentHistory.push({
              student_id: student.id,
              organization_id: organizationId,
              amount: monthlyFees,
              payment_month: monthStr,
              payment_date: format(month.date, 'yyyy-MM-dd'),
              due_date: format(dueDate, 'yyyy-MM-dd'),
              payment_method: 'Cash',
              receipt_number: `IMP-${student.id.slice(0, 8)}-${month.year}${String(month.month).padStart(2, '0')}`,
              paid_amount: monthlyFees,
              discount: 0,
              late_fee: 0,
              notes: 'Auto-generated during import',
              collected_by: null,
            });
          }
        }

        // Insert fee payments
        if (feePayments.length > 0) {
          const { error: feeError } = await supabase
            .from('fee_payments')
            .insert(feePayments);

          if (feeError) {
            result.errors.push(`Row ${rowNum}: Failed to create fee records: ${feeError.message}`);
          }
        }

        // Insert payment history
        if (paymentHistory.length > 0) {
          const { error: historyError } = await supabase
            .from('fee_payment_history')
            .insert(paymentHistory);

          if (historyError) {
            result.errors.push(`Row ${rowNum}: Failed to create payment history: ${historyError.message}`);
          }
        }

        result.successful++;
      } catch (rowError: any) {
        result.errors.push(`Row ${rowNum}: ${rowError.message}`);
        result.failed++;
      }
    }

    return NextResponse.json(result);
  } catch (error: any) {
    console.error('Import error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to import data' },
      { status: 500 }
    );
  }
}
