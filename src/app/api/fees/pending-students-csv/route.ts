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
    // Exclude suspended, inactive, or deleted students
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

    // 5. Aggregate Pending Fees & Months strictly by due_date <= toDate for active students
    interface MonthItem {
      monthName: string;
      dueDateStr: string;
      pendingAmount: number;
    }

    interface StudentPendingAgg {
      className: string;
      studentName: string;
      parentNumber: string;
      classFees: number;
      pendingMonthsList: MonthItem[];
      totalPendingFees: number;
    }

    const studentPendingMap = new Map<string, StudentPendingAgg>();

    (rawPayments || []).forEach((p: any) => {
      const student = p.students;

      // STRICT RULE: Include ONLY Active students (exclude suspended, inactive, archived, or deleted)
      if (!student || student.status !== 'active' || student.is_active === false) {
        return;
      }

      // STRICT RULE: Check actual due date <= toDate (e.g. 08/08/2026)
      let dueDateStr = p.due_date ? p.due_date.split('T')[0] : '';
      if (!dueDateStr && p.payment_month) {
        try {
          const monthDate = new Date(p.payment_month + ' 1');
          if (!isNaN(monthDate.getTime())) {
            // Default billing due date (15th of the month)
            dueDateStr = new Date(monthDate.getFullYear(), monthDate.getMonth(), 15).toISOString().split('T')[0];
          }
        } catch (e) {}
      }

      if (dueDateStr && dueDateStr > toDate) {
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
        if (!existing.pendingMonthsList.some(m => m.monthName.toLowerCase() === monthName.toLowerCase())) {
          existing.pendingMonthsList.push({ monthName, dueDateStr, pendingAmount: pending });
        }
      } else {
        studentPendingMap.set(student.id, {
          className,
          studentName,
          parentNumber,
          classFees,
          pendingMonthsList: [{ monthName, dueDateStr, pendingAmount: pending }],
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
        // Sort student's pending months chronologically
        row.pendingMonthsList.sort((a, b) => (a.dueDateStr || '').localeCompare(b.dueDateStr || ''));
        const pendingMonthsJoined = row.pendingMonthsList.map(m => m.monthName).join(', ');

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
