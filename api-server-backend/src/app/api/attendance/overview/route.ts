import { NextRequest, NextResponse } from 'next/server';
import { createServerClient, type CookieOptions } from '@supabase/ssr';

// GET /api/attendance/overview - Fetch attendance overview statistics
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
      console.error('GET /api/attendance/overview - Error fetching user profile:', userError);
      return NextResponse.json(
        { error: 'Organization not found' },
        { status: 404 }
      );
    }

    // Parse query parameters
    const { searchParams } = new URL(request.url);
    const date = searchParams.get('date') || new Date().toISOString().split('T')[0];
    const classId = searchParams.get('class_id');

    // 1. Get overall attendance stats for the selected date
    let statsQuery = supabase
      .from('attendance')
      .select('status')
      .eq('organization_id', userData.organization_id)
      .eq('attendance_date', date);

    if (classId && classId !== 'all') {
      // Filter by class through students
      const { data: classStudents } = await supabase
        .from('students')
        .select('id')
        .eq('class_id', classId)
        .eq('organization_id', userData.organization_id);

      if (classStudents && classStudents.length > 0) {
        const studentIds = classStudents.map(s => s.id);
        statsQuery = statsQuery.in('student_id', studentIds);
      } else {
        // No students in this class
        return NextResponse.json({
          stats: { totalPresent: 0, totalAbsent: 0, totalLeave: 0, attendanceRate: 0 },
          classwiseAttendance: [],
          recentRecords: [],
          weeklyTrend: []
        }, { status: 200, headers: response.headers });
      }
    }

    const { data: attendanceRecords, error: statsError } = await statsQuery;

    if (statsError) {
      console.error('Error fetching stats:', statsError);
    }

    let totalPresent = 0;
    let totalAbsent = 0;
    let totalLeave = 0;
    let totalHalfDay = 0;

    if (attendanceRecords) {
      attendanceRecords.forEach(record => {
        switch (record.status) {
          case 'Present':
            totalPresent++;
            break;
          case 'Absent':
            totalAbsent++;
            break;
          case 'Leave':
            totalLeave++;
            break;
          case 'Half Day':
            totalHalfDay++;
            break;
        }
      });
    }

    const totalMarked = totalPresent + totalAbsent + totalLeave + totalHalfDay;
    const attendanceRate = totalMarked > 0
      ? parseFloat(((totalPresent + totalLeave + totalHalfDay) / totalMarked * 100).toFixed(1))
      : 0;    // 2. Get class-wise attendance
    const { data: classes, error: classesError } = await supabase
      .from('classes')
      .select('id, name, total_students')
      .eq('organization_id', userData.organization_id)
      .eq('is_active', true)
      .order('name');

    if (classesError) {
      console.error('Error fetching classes:', classesError);
    }

    const classwiseAttendance = [];

    if (classes && classes.length > 0) {
      for (const cls of classes) {
        // Get students for this class
        const { data: classStudents } = await supabase
          .from('students')
          .select('id')
          .eq('class_id', cls.id)
          .eq('organization_id', userData.organization_id)
          .eq('is_active', true);

        if (!classStudents || classStudents.length === 0) {
          classwiseAttendance.push({
            class_id: cls.id,
            class_name: cls.name,
            total: cls.total_students || 0,
            present: 0,
            absent: 0,
            leave: 0,
            percentage: 0
          });
          continue;
        }

        const studentIds = classStudents.map(s => s.id);

        // Get attendance for these students on the selected date
        const { data: classAttendance } = await supabase
          .from('attendance')
          .select('status')
          .eq('attendance_date', date)
          .in('student_id', studentIds);

        let present = 0;
        let absent = 0;
        let leave = 0;

        if (classAttendance) {
          classAttendance.forEach(record => {
            switch (record.status) {
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
          });
        }

        const totalClassMarked = present + absent + leave;
        const percentage = totalClassMarked > 0
          ? parseFloat(((present + leave) / totalClassMarked * 100).toFixed(1))
          : 0;

        classwiseAttendance.push({
          classId: cls.id,
          className: cls.name,
          totalStudents: classStudents.length,
          presentCount: present,
          absentCount: absent,
          leaveCount: leave,
          attendanceRate: percentage
        });
      }
    }

    // 3. Get recent attendance records (last 20)
    let recentQuery = supabase
      .from('attendance')
      .select(`
        id,
        status,
        check_in_time,
        attendance_date,
        students (
          id,
          name,
          roll_number,
          classes (
            id,
            name
          )
        )
      `)
      .eq('organization_id', userData.organization_id)
      .order('attendance_date', { ascending: false })
      .order('created_at', { ascending: false })
      .limit(20);

    if (classId && classId !== 'all') {
      // Filter by class
      const { data: classStudents } = await supabase
        .from('students')
        .select('id')
        .eq('class_id', classId)
        .eq('organization_id', userData.organization_id);

      if (classStudents && classStudents.length > 0) {
        const studentIds = classStudents.map(s => s.id);
        recentQuery = recentQuery.in('student_id', studentIds);
      }
    }

    const { data: recentRecords, error: recentError } = await recentQuery;

    if (recentError) {
      console.error('Error fetching recent records:', recentError);
    }

    const formattedRecent = recentRecords?.map((record: any) => ({
      id: record.id,
      studentName: record.students?.name || 'Unknown',
      className: record.students?.classes?.name || 'N/A',
      rollNumber: record.students?.roll_number || 'N/A',
      status: record.status,
      checkInTime: record.check_in_time || null,
      attendanceDate: record.attendance_date
    })) || [];

    // 4. Get weekly trend (last 7 days)
    const today = new Date(date);
    const sevenDaysAgo = new Date(today);
    sevenDaysAgo.setDate(today.getDate() - 6);

    const { data: weeklyData, error: weeklyError } = await supabase
      .from('attendance')
      .select('attendance_date, status')
      .eq('organization_id', userData.organization_id)
      .gte('attendance_date', sevenDaysAgo.toISOString().split('T')[0])
      .lte('attendance_date', date);

    if (weeklyError) {
      console.error('Error fetching weekly trend:', weeklyError);
    }

    // Group by date
    const weeklyMap = new Map();
    
    // Initialize all 7 days with zero counts
    for (let i = 6; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(today.getDate() - i);
      const dateStr = d.toISOString().split('T')[0];
      weeklyMap.set(dateStr, { date: dateStr, present: 0, absent: 0, leave: 0 });
    }

    // Populate with actual data
    if (weeklyData) {
      weeklyData.forEach((record: any) => {
        const existing = weeklyMap.get(record.attendance_date) || { 
          date: record.attendance_date, 
          present: 0, 
          absent: 0, 
          leave: 0 
        };

        switch (record.status) {
          case 'Present':
            existing.present++;
            break;
          case 'Absent':
            existing.absent++;
            break;
          case 'Leave':
            existing.leave++;
            break;
        }

        weeklyMap.set(record.attendance_date, existing);
      });
    }

    const weeklyTrend = Array.from(weeklyMap.values()).sort((a, b) => 
      a.date.localeCompare(b.date)
    );

    return NextResponse.json({
      stats: {
        totalPresent,
        totalAbsent,
        totalLeave,
        attendanceRate
      },
      classwiseAttendance,
      recentRecords: formattedRecent,
      weeklyTrend
    }, { status: 200, headers: response.headers });

  } catch (error) {
    console.error('Unexpected error in GET /api/attendance/overview:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
