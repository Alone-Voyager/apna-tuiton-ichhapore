import { NextRequest, NextResponse } from 'next/server';
import { createServerClient, type CookieOptions } from '@supabase/ssr';

// GET /api/attendance/daily - Fetch students with attendance for a specific date
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
      .select('organization_id, id')
      .eq('user_id', user.id)
      .single();

    if (userError || !userData?.organization_id) {
      console.error('GET /api/attendance/daily - Error fetching user profile:', userError);
      return NextResponse.json(
        { error: 'Organization not found' },
        { status: 404 }
      );
    }

    // Parse query parameters
    const { searchParams } = new URL(request.url);
    const date = searchParams.get('date') || new Date().toISOString().split('T')[0];
    const classId = searchParams.get('class_id');

    // Build students query
    let studentsQuery = supabase
      .from('students')
      .select('id, name, roll_number, class_id, classes(id, name)')
      .eq('organization_id', userData.organization_id)
      .eq('is_active', true)
      .eq('status', 'active')
      .order('roll_number');

    if (classId && classId !== 'all') {
      studentsQuery = studentsQuery.eq('class_id', classId);
    }

    const { data: students, error: studentsError } = await studentsQuery;

    if (studentsError) {
      console.error('Error fetching students:', studentsError);
      return NextResponse.json(
        { error: 'Failed to fetch students' },
        { status: 500 }
      );
    }

    if (!students || students.length === 0) {
      return NextResponse.json({
        students: [],
        summary: {
          total: 0,
          present: 0,
          absent: 0,
          late: 0,
          unmarked: 0,
        }
      }, { status: 200, headers: response.headers });
    }

    // Fetch attendance records for the selected date
    const studentIds = students.map(s => s.id);
    const { data: attendanceRecords, error: attendanceError } = await supabase
      .from('attendance')
      .select('student_id, status, check_in_time, marked_by')
      .eq('attendance_date', date)
      .in('student_id', studentIds);

    if (attendanceError) {
      console.error('Error fetching attendance:', attendanceError);
      // Don't fail the request, just log the error
    }

    // Create a map of attendance records
    const attendanceMap = new Map();
    if (attendanceRecords) {
      attendanceRecords.forEach(record => {
        attendanceMap.set(record.student_id, {
          status: record.status,
          check_in_time: record.check_in_time,
        });
      });
    }

    // Merge students with their attendance
    const studentsWithAttendance = students.map(student => ({
      id: student.id,
      name: student.name,
      roll_number: student.roll_number,
      class_id: student.class_id,
      classes: student.classes,
      attendance: attendanceMap.get(student.id) || null,
    }));

    // Calculate summary
    let present = 0;
    let absent = 0;
    let leave = 0;
    let unmarked = 0;

    studentsWithAttendance.forEach(student => {
      if (!student.attendance) {
        unmarked++;
      } else {
        switch (student.attendance.status) {
          case 'Present':
            present++;
            break;
          case 'Absent':
            absent++;
            break;
          case 'Leave':
            leave++;
            break;
        }
      }
    });

    return NextResponse.json({
      students: studentsWithAttendance,
      summary: {
        total: students.length,
        present,
        absent,
        leave,
        unmarked,
      },
      date,
    }, { status: 200, headers: response.headers });

  } catch (error) {
    console.error('Unexpected error in GET /api/attendance/daily:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// POST /api/attendance/daily - Save/update attendance records
export async function POST(request: NextRequest) {
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

    // Get user's organization_id and admin profile id
    const { data: userData, error: userError } = await supabase
      .from('admin_profiles')
      .select('organization_id, id')
      .eq('user_id', user.id)
      .single();

    if (userError || !userData?.organization_id) {
      console.error('POST /api/attendance/daily - Error fetching user profile:', userError);
      return NextResponse.json(
        { error: 'Organization not found' },
        { status: 404 }
      );
    }

    // Parse request body
    const body = await request.json();
    const { date, records } = body;

    // Validate inputs
    if (!date || !records || !Array.isArray(records)) {
      return NextResponse.json(
        { error: 'Invalid request: date and records array required' },
        { status: 400 }
      );
    }

    if (records.length === 0) {
      return NextResponse.json(
        { error: 'No attendance records to save' },
        { status: 400 }
      );
    }

    // Validate date format (YYYY-MM-DD)
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      return NextResponse.json(
        { error: 'Invalid date format. Expected YYYY-MM-DD' },
        { status: 400 }
      );
    }

    // Verify all students belong to the organization
    const studentIds = records.map(r => r.student_id);
    const { data: validStudents, error: validationError } = await supabase
      .from('students')
      .select('id')
      .eq('organization_id', userData.organization_id)
      .in('id', studentIds);

    if (validationError) {
      console.error('Error validating students:', validationError);
      return NextResponse.json(
        { error: 'Failed to validate students' },
        { status: 500 }
      );
    }

    if (!validStudents || validStudents.length !== studentIds.length) {
      return NextResponse.json(
        { error: 'Some students do not belong to your organization' },
        { status: 403 }
      );
    }

    // Prepare attendance records for upsert
    const attendanceRecords = records.map(record => ({
      organization_id: userData.organization_id,
      student_id: record.student_id,
      attendance_date: date,
      status: record.status, // Already capitalized from frontend
      check_in_time: record.check_in_time || null,
      marked_by: userData.id,
    }));

    // Upsert attendance records (update if exists, insert if not)
    const { data: savedRecords, error: upsertError } = await supabase
      .from('attendance')
      .upsert(attendanceRecords, {
        onConflict: 'student_id,attendance_date',
        ignoreDuplicates: false,
      })
      .select();

    if (upsertError) {
      console.error('Error saving attendance:', upsertError);
      return NextResponse.json(
        { error: 'Failed to save attendance records' },
        { status: 500 }
      );
    }

    // Calculate summary
    const summary = {
      total: records.length,
      present: records.filter(r => r.status === 'Present').length,
      absent: records.filter(r => r.status === 'Absent').length,
      leave: records.filter(r => r.status === 'Leave').length,
    };

    // Activity logging removed - not needed for attendance records

    return NextResponse.json({
      success: true,
      message: `Attendance saved for ${records.length} student(s)`,
      summary,
      saved_count: savedRecords?.length || 0,
    }, { status: 200, headers: response.headers });

  } catch (error) {
    console.error('Unexpected error in POST /api/attendance/daily:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
