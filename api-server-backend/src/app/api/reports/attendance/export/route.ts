import { NextRequest, NextResponse } from 'next/server';
import { createServerClient, type CookieOptions } from '@supabase/ssr';

// GET /api/reports/attendance/export - Export attendance report as PDF or Excel
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
      console.error('GET /api/reports/attendance/export - Error fetching user profile:', userError);
      return NextResponse.json(
        { error: 'Organization not found' },
        { status: 404 }
      );
    }

    // Parse query parameters
    const { searchParams } = new URL(request.url);
    const format = searchParams.get('format') || 'excel'; // 'pdf' or 'excel'
    const period = searchParams.get('period') || 'this_month';
    const classId = searchParams.get('class_id');

    // Calculate date range based on period
    const now = new Date();
    let startDate: Date;
    let endDate: Date = now;

    switch (period) {
      case 'today':
        startDate = new Date(now.setHours(0, 0, 0, 0));
        endDate = new Date(now.setHours(23, 59, 59, 999));
        break;
      case 'this_week':
        startDate = new Date(now.setDate(now.getDate() - now.getDay()));
        break;
      case 'this_month':
        startDate = new Date(now.getFullYear(), now.getMonth(), 1);
        break;
      case 'last_month':
        startDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        endDate = new Date(now.getFullYear(), now.getMonth(), 0);
        break;
      case 'this_quarter':
        const quarter = Math.floor(now.getMonth() / 3);
        startDate = new Date(now.getFullYear(), quarter * 3, 1);
        break;
      default:
        startDate = new Date(now.getFullYear(), now.getMonth(), 1);
    }

    const startDateStr = startDate.toISOString().split('T')[0];
    const endDateStr = endDate.toISOString().split('T')[0];

    // Fetch class-wise attendance data
    let classFilter = supabase
      .from('classes')
      .select('id, name')
      .eq('organization_id', userData.organization_id)
      .eq('is_active', true)
      .order('name');

    if (classId && classId !== 'all') {
      classFilter = classFilter.eq('id', classId);
    }

    const { data: classes, error: classesError } = await classFilter;

    if (classesError) {
      console.error('Error fetching classes:', classesError);
      return NextResponse.json(
        { error: 'Failed to fetch classes' },
        { status: 500 }
      );
    }

    // Prepare data for export
    const exportData = [];

    if (!classes || classes.length === 0) {
      return NextResponse.json(
        { error: 'No classes found' },
        { status: 404 }
      );
    }

    for (const cls of classes) {
      // Get students in this class
      const { data: students, error: studentsError } = await supabase
        .from('students')
        .select('id, name, roll_number')
        .eq('class_id', cls.id)
        .eq('organization_id', userData.organization_id)
        .eq('is_active', true)
        .order('roll_number');

      if (studentsError) {
        console.error('Error fetching students:', studentsError);
        continue;
      }

      if (!students || students.length === 0) continue;

      const studentIds = students.map(s => s.id);

      // Get attendance records for these students in the period
      const { data: attendanceRecords, error: attendanceError } = await supabase
        .from('attendance')
        .select('student_id, status, attendance_date')
        .eq('organization_id', userData.organization_id)
        .in('student_id', studentIds)
        .gte('attendance_date', startDateStr)
        .lte('attendance_date', endDateStr);

      if (attendanceError) {
        console.error('Error fetching attendance:', attendanceError);
        continue;
      }

      console.log(`Class ${cls.name}: Found ${students.length} students, ${attendanceRecords?.length || 0} attendance records`);

      // Calculate stats for each student
      for (const student of students) {
        const studentAttendance = attendanceRecords?.filter(a => a.student_id === student.id) || [];
        const totalDays = studentAttendance.length;
        const presentDays = studentAttendance.filter(a => a.status === 'Present').length;
        const absentDays = studentAttendance.filter(a => a.status === 'Absent').length;
        const leaveDays = studentAttendance.filter(a => a.status === 'Leave').length;
        const attendanceRate = totalDays > 0 ? ((presentDays / totalDays) * 100).toFixed(1) : '0.0';

        exportData.push({
          'Class': cls.name,
          'Roll Number': student.roll_number,
          'Student Name': student.name,
          'Total Days': totalDays,
          'Present': presentDays,
          'Absent': absentDays,
          'Leave': leaveDays,
          'Attendance %': attendanceRate,
        });
      }
    }

    if (exportData.length === 0) {
      return NextResponse.json(
        { error: 'No attendance data found for the selected period' },
        { status: 404 }
      );
    }

    console.log(`Total export records: ${exportData.length}`);

    if (format === 'excel') {
      // Generate Excel file using simple CSV format (can be opened in Excel)
      const headers = Object.keys(exportData[0] || {});
      let csv = headers.join(',') + '\n';
      
      exportData.forEach(row => {
        csv += headers.map(header => {
          const value = row[header as keyof typeof row];
          // Escape values containing commas or quotes
          if (typeof value === 'string' && (value.includes(',') || value.includes('"'))) {
            return `"${value.replace(/"/g, '""')}"`;
          }
          return value;
        }).join(',') + '\n';
      });

      return new NextResponse(csv, {
        status: 200,
        headers: {
          'Content-Type': 'text/csv',
          'Content-Disposition': `attachment; filename="attendance-report-${period}-${new Date().toISOString().split('T')[0]}.csv"`,
        },
      });
    } else if (format === 'pdf') {
      // Generate simple HTML that can be converted to PDF by browser
      let html = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="UTF-8">
          <title>Attendance Report</title>
          <style>
            body { font-family: Arial, sans-serif; margin: 20px; }
            h1 { color: #1e40af; text-align: center; }
            .info { text-align: center; margin-bottom: 20px; color: #64748b; }
            table { width: 100%; border-collapse: collapse; margin-top: 20px; }
            th { background-color: #1e40af; color: white; padding: 10px; text-align: left; font-size: 12px; }
            td { padding: 8px; border-bottom: 1px solid #e2e8f0; font-size: 11px; }
            tr:hover { background-color: #f8fafc; }
            .footer { margin-top: 30px; text-align: center; color: #94a3b8; font-size: 10px; }
          </style>
        </head>
        <body>
          <h1>Attendance Report</h1>
          <div class="info">
            <strong>Period:</strong> ${period.replace('_', ' ').toUpperCase()} | 
            <strong>Date Range:</strong> ${startDateStr} to ${endDateStr} |
            <strong>Generated:</strong> ${new Date().toLocaleString()}
          </div>
          <table>
            <thead>
              <tr>
                <th>Class</th>
                <th>Roll No.</th>
                <th>Student Name</th>
                <th>Total Days</th>
                <th>Present</th>
                <th>Absent</th>
                <th>Leave</th>
                <th>Attendance %</th>
              </tr>
            </thead>
            <tbody>
      `;

      exportData.forEach(row => {
        const attendancePercent = parseFloat(row['Attendance %']);
        const rowColor = attendancePercent >= 90 ? '#dcfce7' : attendancePercent >= 75 ? '#fef9c3' : '#fee2e2';
        html += `
          <tr style="background-color: ${rowColor}">
            <td>${row['Class']}</td>
            <td>${row['Roll Number']}</td>
            <td>${row['Student Name']}</td>
            <td>${row['Total Days']}</td>
            <td>${row['Present']}</td>
            <td>${row['Absent']}</td>
            <td>${row['Leave']}</td>
            <td><strong>${row['Attendance %']}%</strong></td>
          </tr>
        `;
      });

      html += `
            </tbody>
          </table>
          <div class="footer">
            <p>This report was generated automatically by Apna Tuition Management System</p>
          </div>
          <script>
            window.onload = function() {
              window.print();
            }
          </script>
        </body>
        </html>
      `;

      return new NextResponse(html, {
        status: 200,
        headers: {
          'Content-Type': 'text/html',
        },
      });
    }

    return NextResponse.json(
      { error: 'Invalid format specified' },
      { status: 400 }
    );

  } catch (error) {
    console.error('Unexpected error in GET /api/reports/attendance/export:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
