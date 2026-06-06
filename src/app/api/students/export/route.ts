import { NextRequest, NextResponse } from 'next/server';
import { createServerClient, type CookieOptions } from '@supabase/ssr';

export async function GET(request: NextRequest) {
  try {
    const response = NextResponse.json({ success: true });
    const { searchParams } = new URL(request.url);
    const fromDate = searchParams.get('from') || undefined;
    const toDate = searchParams.get('to') || undefined;
    const format = searchParams.get('format') || 'json';
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
      .from('students')
      .select(`
        id, name, roll_number, admission_date, date_of_birth, gender,
        parent_name, phone, whatsapp, email, address, monthly_fee,
        attendance_rate, status, notes, school_name,
        classes!students_class_id_fkey(name)
      `)
      .eq('organization_id', organizationId);

    if (classId) query = query.eq('class_id', classId);
    if (fromDate) query = query.gte('admission_date', fromDate);
    if (toDate) query = query.lte('admission_date', toDate);

    const { data: students, error: studentsError } = await query.order('name');

    if (studentsError) {
      return NextResponse.json({ error: studentsError.message }, { status: 500 });
    }

    if (!students || students.length === 0) {
      return NextResponse.json({ error: 'No students found for the selected date range' }, { status: 404 });
    }

    const exportData = students.map((s: any) => ({
      Name: s.name || '',
      'Roll Number': s.roll_number || '',
      Class: s.classes?.name || 'N/A',
      'Admission Date': s.admission_date || '',
      'Date of Birth': s.date_of_birth || '',
      Gender: s.gender || '',
      'Parent Name': s.parent_name || '',
      Phone: s.phone || '',
      WhatsApp: s.whatsapp || '',
      Email: s.email || '',
      Address: s.address || '',
      'Monthly Fee': s.monthly_fee ?? 0,
      'Attendance Rate': s.attendance_rate ? `${s.attendance_rate}%` : '0%',
      Status: s.status || 'active',
      'School Name': s.school_name || '',
      Notes: s.notes || '',
    }));

    if (format === 'xlsx') {
      const XLSX = await import('xlsx');
      const wb = XLSX.utils.book_new();
      const ws = XLSX.utils.json_to_sheet(exportData);

      const colWidths = Object.keys(exportData[0]).map((k) => ({
        wch: Math.max(k.length, 15),
      }));
      ws['!cols'] = colWidths;

      XLSX.utils.book_append_sheet(wb, ws, 'Students');
      const buf = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });

      return new NextResponse(buf, {
        headers: {
          'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
          'Content-Disposition': `attachment; filename="students_${fromDate || 'all'}_${toDate || 'all'}.xlsx"`,
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
          'Content-Disposition': `attachment; filename="students_${fromDate || 'all'}_${toDate || 'all'}.csv"`,
        },
      });
    }

    return NextResponse.json({
      success: true,
      data: exportData,
      count: exportData.length,
    });
  } catch (error) {
    console.error('Export students error:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
