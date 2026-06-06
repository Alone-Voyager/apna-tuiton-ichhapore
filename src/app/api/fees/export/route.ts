import { NextRequest, NextResponse } from 'next/server';
import { createServerClient, type CookieOptions } from '@supabase/ssr';

export async function GET(request: NextRequest) {
  try {
    const response = NextResponse.json({ success: true });
    const { searchParams } = new URL(request.url);
    const fromDate = searchParams.get('from') || undefined;
    const toDate = searchParams.get('to') || undefined;
    const format = searchParams.get('format') || 'json';
    const status = searchParams.get('status') || undefined;
    const classId = searchParams.get('class_id') || undefined;

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
      .select('organization_id')
      .eq('user_id', user.id)
      .single();

    if (userError || !userData?.organization_id) {
      return NextResponse.json({ error: 'Organization not found' }, { status: 404 });
    }

    const organizationId = userData.organization_id;

    let query = supabase
      .from('fee_payments')
      .select(`
        id, amount, paid_amount, discount, late_fee, payment_month, payment_date,
        due_date, payment_method, receipt_number, status, notes,
        students!inner(id, name, roll_number, class_id, classes!inner(id, name))
      `)
      .eq('organization_id', organizationId);

    if (fromDate) query = query.gte('payment_date', fromDate);
    if (toDate) query = query.lte('payment_date', toDate);
    if (status) query = query.eq('status', status);

    const { data: payments, error: paymentsError } = await query.order('payment_date', { ascending: false });

    if (paymentsError) {
      return NextResponse.json({ error: paymentsError.message }, { status: 500 });
    }

    if (!payments || payments.length === 0) {
      return NextResponse.json({ error: 'No fee records found for the selected criteria' }, { status: 404 });
    }

    const exportData = payments.map((p: any) => ({
      'Receipt Number': p.receipt_number || '',
      'Student Name': p.students?.name || '',
      'Roll Number': p.students?.roll_number || '',
      'Class': p.students?.classes?.name || '',
      'Payment Month': p.payment_month || '',
      'Payment Date': p.payment_date || '',
      'Due Date': p.due_date || '',
      'Amount': p.amount ?? 0,
      'Paid Amount': p.paid_amount ?? 0,
      'Discount': p.discount ?? 0,
      'Late Fee': p.late_fee ?? 0,
      'Payment Method': p.payment_method || '',
      'Status': p.status || '',
      'Notes': p.notes || '',
    }));

    if (format === 'xlsx') {
      const XLSX = await import('xlsx');
      const wb = XLSX.utils.book_new();
      const ws = XLSX.utils.json_to_sheet(exportData);
      const colWidths = Object.keys(exportData[0]).map((k) => ({ wch: Math.max(k.length, 15) }));
      ws['!cols'] = colWidths;
      XLSX.utils.book_append_sheet(wb, ws, 'Fee Records');
      const buf = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });

      return new NextResponse(buf, {
        headers: {
          'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
          'Content-Disposition': `attachment; filename="fee_records_${fromDate || 'all'}_${toDate || 'all'}.xlsx"`,
        },
      });
    }

    if (format === 'csv') {
      const headers = Object.keys(exportData[0]);
      const csvRows = [headers.join(',')];
      for (const row of exportData) {
        const values = headers.map((h) => {
          const val = String((row as any)[h] ?? '');
          return val.includes(',') || val.includes('"') ? `"${val.replace(/"/g, '""')}"` : val;
        });
        csvRows.push(values.join(','));
      }
      return new NextResponse(csvRows.join('\n'), {
        headers: {
          'Content-Type': 'text/csv',
          'Content-Disposition': `attachment; filename="fee_records_${fromDate || 'all'}_${toDate || 'all'}.csv"`,
        },
      });
    }

    return NextResponse.json({ success: true, data: exportData, count: exportData.length });
  } catch (error) {
    console.error('Fee export error:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
