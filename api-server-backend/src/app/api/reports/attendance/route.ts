import { NextRequest, NextResponse } from 'next/server';
import { createServerClient, type CookieOptions } from '@supabase/ssr';

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

    // Get authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Get admin profile with organization
    const { data: adminProfile, error: profileError } = await supabase
      .from('admin_profiles')
      .select('organization_id')
      .eq('user_id', user.id)
      .single();

    if (profileError || !adminProfile?.organization_id) {
      return NextResponse.json(
        { error: 'Admin profile not found' },
        { status: 404 }
      );
    }

    const organizationId = adminProfile.organization_id;
    const { searchParams } = new URL(request.url);
    const period = searchParams.get('period') || 'this_month';
    const classId = searchParams.get('class_id');

    // Calculate date range based on period
    const today = new Date();
    let startDate: Date;
    let endDate: Date = today;

    switch (period) {
      case 'today':
        startDate = today;
        break;
      case 'this_week':
        startDate = new Date(today);
        startDate.setDate(today.getDate() - today.getDay());
        break;
      case 'this_month':
        startDate = new Date(today.getFullYear(), today.getMonth(), 1);
        break;
      case 'last_month':
        startDate = new Date(today.getFullYear(), today.getMonth() - 1, 1);
        endDate = new Date(today.getFullYear(), today.getMonth(), 0);
        break;
      case 'this_quarter':
        const quarter = Math.floor(today.getMonth() / 3);
        startDate = new Date(today.getFullYear(), quarter * 3, 1);
        break;
      default:
        startDate = new Date(today.getFullYear(), today.getMonth(), 1);
    }

    const startDateStr = startDate.toISOString().split('T')[0];
    const endDateStr = endDate.toISOString().split('T')[0];

    // 1. Get Overall Attendance Stats
    let attendanceQuery = supabase
      .from('attendance')
      .select('status, attendance_date')
      .eq('organization_id', organizationId)
      .gte('attendance_date', startDateStr)
      .lte('attendance_date', endDateStr);

    if (classId && classId !== 'all') {
      const { data: classStudents } = await supabase
        .from('students')
        .select('id')
        .eq('class_id', classId)
        .eq('organization_id', organizationId);

      if (classStudents && classStudents.length > 0) {
        const studentIds = classStudents.map((s: any) => s.id);
        attendanceQuery = attendanceQuery.in('student_id', studentIds);
      }
    }

    const { data: attendanceRecords, error: attendanceError } = await attendanceQuery;

    if (attendanceError) {
      console.error('Error fetching attendance:', attendanceError);
      return NextResponse.json(
        { error: 'Failed to fetch attendance data' },
        { status: 500 }
      );
    }

    // Calculate stats
    const totalRecords = attendanceRecords?.length || 0;
    const presentCount = attendanceRecords?.filter((a: any) => a.status === 'Present').length || 0;
    const absentCount = attendanceRecords?.filter((a: any) => a.status === 'Absent').length || 0;
    const lateCount = attendanceRecords?.filter((a: any) => a.status === 'Late').length || 0;
    const overallAttendance = totalRecords > 0 ? ((presentCount / totalRecords) * 100).toFixed(1) : '0.0';

    // 2. Get Class-wise Attendance
    let classQuery = supabase
      .from('classes')
      .select('id, name, total_students')
      .eq('organization_id', organizationId)
      .eq('is_active', true);

    if (classId && classId !== 'all') {
      classQuery = classQuery.eq('id', classId);
    }

    const { data: classes, error: classError } = await classQuery;

    if (classError) {
      console.error('Error fetching classes:', classError);
    }

    const classWiseData = [];
    
    for (const cls of classes || []) {
      // Get students for this class
      const { data: classStudents } = await supabase
        .from('students')
        .select('id')
        .eq('class_id', cls.id)
        .eq('organization_id', organizationId);

      if (!classStudents || classStudents.length === 0) continue;

      const studentIds = classStudents.map((s: any) => s.id);

      // Get attendance for this class
      const { data: classAttendance } = await supabase
        .from('attendance')
        .select('status, attendance_date')
        .in('student_id', studentIds)
        .eq('organization_id', organizationId)
        .gte('attendance_date', startDateStr)
        .lte('attendance_date', endDateStr);

      const classTotal = classAttendance?.length || 0;
      const classPresent = classAttendance?.filter((a: any) => a.status === 'Present').length || 0;
      const avgAttendance = classTotal > 0 ? ((classPresent / classTotal) * 100).toFixed(1) : '0.0';

      // Get today's attendance
      const todayStr = today.toISOString().split('T')[0];
      const { data: todayAttendance } = await supabase
        .from('attendance')
        .select('status')
        .in('student_id', studentIds)
        .eq('attendance_date', todayStr);

      const presentToday = todayAttendance?.filter((a: any) => a.status === 'Present').length || 0;
      const absentToday = todayAttendance?.filter((a: any) => a.status === 'Absent').length || 0;

      classWiseData.push({
        class: cls.name,
        students: cls.total_students,
        avgAttendance: parseFloat(avgAttendance),
        presentToday,
        absentToday
      });
    }

    // 3. Get Monthly Trend (last 9 months)
    const monthlyTrend = [];
    for (let i = 8; i >= 0; i--) {
      const monthDate = new Date(today.getFullYear(), today.getMonth() - i, 1);
      const monthStart = new Date(monthDate.getFullYear(), monthDate.getMonth(), 1).toISOString().split('T')[0];
      const monthEnd = new Date(monthDate.getFullYear(), monthDate.getMonth() + 1, 0).toISOString().split('T')[0];

      let monthQuery = supabase
        .from('attendance')
        .select('status')
        .eq('organization_id', organizationId)
        .gte('attendance_date', monthStart)
        .lte('attendance_date', monthEnd);

      if (classId && classId !== 'all') {
        const { data: classStudents } = await supabase
          .from('students')
          .select('id')
          .eq('class_id', classId)
          .eq('organization_id', organizationId);

        if (classStudents && classStudents.length > 0) {
          monthQuery = monthQuery.in('student_id', classStudents.map((s: any) => s.id));
        }
      }

      const { data: monthData } = await monthQuery;
      const monthTotal = monthData?.length || 0;
      const monthPresent = monthData?.filter((a: any) => a.status === 'Present').length || 0;
      const monthAttendance = monthTotal > 0 ? ((monthPresent / monthTotal) * 100).toFixed(1) : '0.0';

      monthlyTrend.push({
        month: monthDate.toLocaleDateString('en-US', { month: 'short' }),
        attendance: parseFloat(monthAttendance)
      });
    }

    // 4. Get Day-wise Pattern (last 7 days)
    const dayWisePattern = { bestDay: 'Tuesday', bestRate: 92, lowestDay: 'Monday', lowestRate: 82 };
    const dayStats: { [key: string]: { present: number; total: number } } = {};

    for (let i = 6; i >= 0; i--) {
      const dayDate = new Date(today);
      dayDate.setDate(today.getDate() - i);
      const dayStr = dayDate.toISOString().split('T')[0];
      const dayName = dayDate.toLocaleDateString('en-US', { weekday: 'long' });

      let dayQuery = supabase
        .from('attendance')
        .select('status')
        .eq('organization_id', organizationId)
        .eq('attendance_date', dayStr);

      if (classId && classId !== 'all') {
        const { data: classStudents } = await supabase
          .from('students')
          .select('id')
          .eq('class_id', classId)
          .eq('organization_id', organizationId);

        if (classStudents && classStudents.length > 0) {
          dayQuery = dayQuery.in('student_id', classStudents.map((s: any) => s.id));
        }
      }

      const { data: dayData } = await dayQuery;
      const dayTotal = dayData?.length || 0;
      const dayPresent = dayData?.filter((a: any) => a.status === 'Present').length || 0;

      if (!dayStats[dayName]) {
        dayStats[dayName] = { present: 0, total: 0 };
      }
      dayStats[dayName].present += dayPresent;
      dayStats[dayName].total += dayTotal;
    }

    // Calculate best/worst days
    let bestDay = 'Tuesday';
    let bestRate = 0;
    let lowestDay = 'Monday';
    let lowestRate = 100;

    Object.entries(dayStats).forEach(([day, stats]) => {
      if (stats.total > 0) {
        const rate = (stats.present / stats.total) * 100;
        if (rate > bestRate) {
          bestRate = rate;
          bestDay = day;
        }
        if (rate < lowestRate) {
          lowestRate = rate;
          lowestDay = day;
        }
      }
    });

    dayWisePattern.bestDay = bestDay;
    dayWisePattern.bestRate = Math.round(bestRate);
    dayWisePattern.lowestDay = lowestDay;
    dayWisePattern.lowestRate = Math.round(lowestRate);

    // 5. Get Low Attendance Students (attendance < 75%)
    let studentsQuery = supabase
      .from('students')
      .select('id, name, phone, class_id, classes(name)')
      .eq('organization_id', organizationId)
      .eq('is_active', true);

    if (classId && classId !== 'all') {
      studentsQuery = studentsQuery.eq('class_id', classId);
    }

    const { data: allStudents } = await studentsQuery;

    const lowAttendanceStudents = [];

    for (const student of allStudents || []) {
      const { data: studentAttendance } = await supabase
        .from('attendance')
        .select('status, notes')
        .eq('student_id', student.id)
        .gte('attendance_date', startDateStr)
        .lte('attendance_date', endDateStr);

      const studentTotal = studentAttendance?.length || 0;
      const studentPresent = studentAttendance?.filter((a: any) => a.status === 'Present').length || 0;
      const studentAbsent = studentAttendance?.filter((a: any) => a.status === 'Absent').length || 0;
      const studentAttendanceRate = studentTotal > 0 ? ((studentPresent / studentTotal) * 100).toFixed(1) : '0.0';

      if (parseFloat(studentAttendanceRate) < 75 && studentTotal > 0) {
        // Extract reasons from notes
        const reasons = new Set<string>();
        studentAttendance?.forEach((a: any) => {
          if (a.notes) {
            const note = a.notes.toLowerCase();
            if (note.includes('medical') || note.includes('sick') || note.includes('ill')) {
              reasons.add('Medical');
            } else if (note.includes('family') || note.includes('personal')) {
              reasons.add('Family');
            } else {
              reasons.add('Other');
            }
          }
        });

        lowAttendanceStudents.push({
          name: student.name,
          class: (student.classes as any)?.name || 'N/A',
          phone: student.phone || null,
          attendance: parseFloat(studentAttendanceRate),
          absents: studentAbsent,
          reasons: Array.from(reasons).slice(0, 2)
        });
      }
    }

    // Sort by attendance rate
    lowAttendanceStudents.sort((a, b) => a.attendance - b.attendance);

    // 6. Get Absence Reasons Summary
    const { data: allAbsences } = await supabase
      .from('attendance')
      .select('notes')
      .eq('organization_id', organizationId)
      .eq('status', 'Absent')
      .gte('attendance_date', startDateStr)
      .lte('attendance_date', endDateStr)
      .not('notes', 'is', null);

    let medicalCount = 0;
    let familyCount = 0;
    let otherCount = 0;

    allAbsences?.forEach((absence: any) => {
      const note = absence.notes?.toLowerCase() || '';
      if (note.includes('medical') || note.includes('sick') || note.includes('ill')) {
        medicalCount++;
      } else if (note.includes('family') || note.includes('personal')) {
        familyCount++;
      } else {
        otherCount++;
      }
    });

    const totalAbsences = medicalCount + familyCount + otherCount;
    const absenceReasons = [
      {
        reason: 'Medical Issues',
        percentage: totalAbsences > 0 ? Math.round((medicalCount / totalAbsences) * 100) : 0,
        count: medicalCount
      },
      {
        reason: 'Family Events',
        percentage: totalAbsences > 0 ? Math.round((familyCount / totalAbsences) * 100) : 0,
        count: familyCount
      },
      {
        reason: 'Other Reasons',
        percentage: totalAbsences > 0 ? Math.round((otherCount / totalAbsences) * 100) : 0,
        count: otherCount
      }
    ];

    // 7. Get Insights
    const bestClass = classWiseData.length > 0 ? classWiseData.reduce((prev, current) => 
      (prev.avgAttendance > current.avgAttendance) ? prev : current
    ) : null;

    return NextResponse.json({
      stats: {
        overallAttendance,
        totalPresentDays: presentCount,
        totalAbsentDays: absentCount,
        lateArrivals: lateCount
      },
      classWiseAttendance: classWiseData,
      monthlyTrend,
      dayWisePattern,
      lowAttendanceStudents: lowAttendanceStudents.slice(0, 10), // Top 10
      absenceReasons,
      insights: {
        bestClass: bestClass ? {
          name: bestClass.class,
          rate: bestClass.avgAttendance
        } : null,
        actionRequired: lowAttendanceStudents.length
      }
    });

  } catch (error: any) {
    console.error('Error in attendance report API:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
