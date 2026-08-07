import { NextRequest, NextResponse } from 'next/server';
import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { supabaseAdmin } from '../../../../lib/supabase/client';
import { syncAllStudentFeePayments } from '../../../../lib/fees-service';

export async function GET(request: NextRequest) {
  try {
    const response = NextResponse.json({ success: true });
    const { searchParams } = new URL(request.url);
    const fromDate = searchParams.get('fromDate') || searchParams.get('from');
    const toDate = searchParams.get('toDate') || searchParams.get('to');

    // 1. Validate Date Range
    if (!fromDate || !toDate) {
      return NextResponse.json(
        { error: 'Both From Date and To Date are required.' },
        { status: 400 }
      );
    }

    const startDateObj = new Date(fromDate);
    const endDateObj = new Date(toDate);

    if (isNaN(startDateObj.getTime()) || isNaN(endDateObj.getTime())) {
      return NextResponse.json(
        { error: 'Invalid date format. Please use YYYY-MM-DD.' },
        { status: 400 }
      );
    }

    if (startDateObj > endDateObj) {
      return NextResponse.json(
        { error: 'From Date cannot be later than To Date.' },
        { status: 400 }
      );
    }

    // 2. Auth & Org Context Check
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
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

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data: userData, error: userError } = await supabase
      .from('admin_profiles')
      .select('organization_id, role')
      .eq('user_id', user.id)
      .single();

    if (userError || !userData?.organization_id) {
      return NextResponse.json({ error: 'Organization not found' }, { status: 404 });
    }

    const organizationId = userData.organization_id;

    // 3. Sync fee payments up to end date to ensure all due records are generated
    const syncTargetDate = endDateObj > new Date() ? endDateObj : new Date();
    await syncAllStudentFeePayments(supabaseAdmin, organizationId, syncTargetDate);

    // 4. Fetch fee payments with student and class info
    // Filter only non-deleted, active students
    const { data: rawPayments, error: queryError } = await supabaseAdmin
      .from('fee_payments')
      .select(`
        id,
        amount,
        paid_amount,
        status,
        due_date,
        payment_month,
        student_id,
        students!inner(
          id,
          name,
          roll_number,
          monthly_fee,
          parent_name,
          whatsapp,
          phone,
          status,
          is_active,
          class_id,
          classes(id, name)
        )
      `)
      .eq('organization_id', organizationId)
      .neq('status', 'Paid');

    if (queryError) {
      console.error('Error fetching pending fee payments:', queryError);
      return NextResponse.json({ error: queryError.message }, { status: 500 });
    }

    // 5. Aggregate Pending Fees & Pending Months per Student
    interface StudentPendingAgg {
      className: string;
      studentName: string;
      parentNumber: string;
      classFees: number;
      pendingMonthsMap: Map<string, number>; // Month Name -> Pending Amount
      totalPendingFees: number;
    }

    const studentPendingMap = new Map<string, StudentPendingAgg>();

    (rawPayments || []).forEach((p: any) => {
      const student = p.students;

      // Ignore deleted, inactive, or archived students
      if (!student || student.status === 'deleted' || student.is_active === false) {
        return;
      }

      // Check if due_date / payment_month is within selected date range [fromDate, toDate]
      let isWithinDateRange = false;

      if (p.due_date) {
        const dueStr = p.due_date.split('T')[0];
        isWithinDateRange = dueStr >= fromDate && dueStr <= toDate;
      }

      // Fallback: Check payment_month if due_date is absent or outside range
      if (!isWithinDateRange && p.payment_month) {
        try {
          const monthDate = new Date(p.payment_month + ' 1');
          if (!isNaN(monthDate.getTime())) {
            const monthStart = new Date(monthDate.getFullYear(), monthDate.getMonth(), 1).toISOString().split('T')[0];
            const monthEnd = new Date(monthDate.getFullYear(), monthDate.getMonth() + 1, 0).toISOString().split('T')[0];
            isWithinDateRange = monthEnd >= fromDate && monthStart <= toDate;
          }
        } catch (e) {
          // Ignore date parse errors
        }
      }

      if (!isWithinDateRange) {
        return;
      }

      // Outstanding pending amount for this specific entry
      const totalFee = Number(p.amount) || 0;
      const paid = Number(p.paid_amount) || 0;
      const pending = Math.max(0, totalFee - paid);

      if (pending <= 0) {
        return;
      }

      const className = student.classes?.name || 'Unassigned';
      const studentName = student.name || 'Unknown Student';
      const parentNumber = student.whatsapp || student.phone || 'N/A';
      const classFees = Number(student.monthly_fee) || 0;
      const monthName = p.payment_month || 'Pending Month';

      if (studentPendingMap.has(student.id)) {
        const existing = studentPendingMap.get(student.id)!;
        existing.totalPendingFees += pending;
        if (!existing.pendingMonthsMap.has(monthName)) {
          existing.pendingMonthsMap.set(monthName, pending);
        } else {
          existing.pendingMonthsMap.set(monthName, existing.pendingMonthsMap.get(monthName)! + pending);
        }
      } else {
        const pendingMonthsMap = new Map<string, number>();
        pendingMonthsMap.set(monthName, pending);
        studentPendingMap.set(student.id, {
          className,
          studentName,
          parentNumber,
          classFees,
          pendingMonthsMap,
          totalPendingFees: pending,
        });
      }
    });

    // Convert aggregated map to array & sort by Class then Student Name
    const aggregatedList = Array.from(studentPendingMap.values())
      .filter((s) => s.totalPendingFees > 0)
      .sort((a, b) => {
        const classCompare = a.className.localeCompare(b.className);
        if (classCompare !== 0) return classCompare;
        return a.studentName.localeCompare(b.studentName);
      });

    // 6. Generate CSV Content
    // Exact Columns required:
    // Class | Student's Name | Parent's Number | Class Fees | Pending Month | Total Pending Fees
    const csvHeaders = ['Class', "Student's Name", "Parent's Number", 'Class Fees', 'Pending Month', 'Total Pending Fees'];

    const formatCurrency = (amount: number) => {
      return `₹${amount.toLocaleString('en-IN')}`;
    };

    const escapeCsv = (val: string | number) => {
      const str = String(val ?? '');
      if (str.includes(',') || str.includes('"') || str.includes('\n')) {
        return `"${str.replace(/"/g, '""')}"`;
      }
      return str;
    };

    const csvRows = [
      csvHeaders.map(escapeCsv).join(','),
      ...aggregatedList.map((row) => {
        const pendingMonthsJoined = Array.from(row.pendingMonthsMap.keys()).join(', ');
        return [
          escapeCsv(row.className),
          escapeCsv(row.studentName),
          escapeCsv(row.parentNumber),
          escapeCsv(formatCurrency(row.classFees)),
          escapeCsv(pendingMonthsJoined),
          escapeCsv(formatCurrency(row.totalPendingFees)),
        ].join(',');
      }),
    ];

    const csvContent = '\uFEFF' + csvRows.join('\r\n');

    // Format filename as pending_fees_DD-MM-YYYY_to_DD-MM-YYYY.csv
    const formatFilenameDate = (dateStr: string) => {
      const [year, month, day] = dateStr.split('-');
      return `${day}-${month}-${year}`;
    };

    const formattedFromDate = formatFilenameDate(fromDate);
    const formattedToDate = formatFilenameDate(toDate);
    const filename = `pending_fees_${formattedFromDate}_to_${formattedToDate}.csv`;

    return new NextResponse(csvContent, {
      status: 200,
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Cache-Control': 'no-store, no-cache, must-revalidate',
      },
    });
  } catch (err: any) {
    console.error('Error generating pending fees CSV report:', err);
    return NextResponse.json(
      { error: err.message || 'Internal Server Error' },
      { status: 500 }
    );
  }
}
