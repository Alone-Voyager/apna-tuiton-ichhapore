import { NextRequest, NextResponse } from 'next/server';
import { createServerClient, type CookieOptions } from '@supabase/ssr';

// GET /api/classes - Fetch all classes for the organization
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

    // Get user's organization_id from the admin_profiles table
    const { data: userData, error: userError } = await supabase
      .from('admin_profiles')
      .select('organization_id')
      .eq('user_id', user.id)
      .single();

    if (userError || !userData?.organization_id) {
      console.error('GET /api/classes - Error fetching user profile:', userError);
      return NextResponse.json(
        { error: 'Organization not found' },
        { status: 404 }
      );
    }

    // Fetch classes for the organization
    const { data: classes, error: classesError } = await supabase
      .from('classes')
      .select('*')
      .eq('organization_id', userData.organization_id)
      .eq('is_active', true)
      .order('name', { ascending: true });

    if (classesError) {
      console.error('Error fetching classes:', classesError);
      return NextResponse.json(
        { error: 'Failed to fetch classes' },
        { status: 500 }
      );
    }

    // Calculate actual attendance percentage for each class from the attendance table
    const classesWithAttendance = await Promise.all((classes || []).map(async (classInfo) => {
      // Get all active students in this class
      const { data: students, error: studentsError } = await supabase
        .from('students')
        .select('id')
        .eq('class_id', classInfo.id)
        .eq('status', 'active');

      if (studentsError || !students || students.length === 0) {
        return { ...classInfo, avg_attendance: 0 };
      }

      const studentIds = students.map(s => s.id);

      // Get attendance records for these students (last 30 days)
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      
      const { data: attendanceRecords, error: attendanceError } = await supabase
        .from('attendance')
        .select('student_id, status')
        .in('student_id', studentIds)
        .gte('attendance_date', thirtyDaysAgo.toISOString().split('T')[0]);

      if (attendanceError || !attendanceRecords || attendanceRecords.length === 0) {
        return { ...classInfo, avg_attendance: 0 };
      }

      // Calculate attendance percentage
      const presentCount = attendanceRecords.filter(record => 
        record.status === 'Present' || record.status === 'Late' || record.status === 'Half Day'
      ).length;
      const totalRecords = attendanceRecords.length;
      const attendancePercentage = totalRecords > 0 ? (presentCount / totalRecords) * 100 : 0;

      return { ...classInfo, avg_attendance: Number(attendancePercentage.toFixed(2)) };
    }));

    // Return the response with the classes data
    return NextResponse.json({ success: true, data: classesWithAttendance || [] }, { status: 200, headers: response.headers });
  } catch (error) {
    console.error('Unexpected error in GET /api/classes:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// POST /api/classes - Create a new class
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

    // Get user's organization_id from the admin_profiles table
    const { data: userData, error: userError } = await supabase
      .from('admin_profiles')
      .select('organization_id')
      .eq('user_id', user.id)
      .single();

    if (userError || !userData?.organization_id) {
      console.error('POST /api/classes - Error fetching user profile:', userError);
      return NextResponse.json(
        { error: 'Organization not found' },
        { status: 404 }
      );
    }

    // Parse request body
    const body = await request.json();
    const { name, monthly_fee } = body;

    // Validate input
    if (!name || typeof name !== 'string' || name.trim().length === 0) {
      return NextResponse.json(
        { error: 'Class name is required' },
        { status: 400 }
      );
    }

    if (monthly_fee === undefined || monthly_fee === null || isNaN(Number(monthly_fee)) || Number(monthly_fee) < 0) {
      return NextResponse.json(
        { error: 'Valid monthly fee is required' },
        { status: 400 }
      );
    }

    // Insert new class
    const { data: newClass, error: insertError } = await supabase
      .from('classes')
      .insert({
        organization_id: userData.organization_id,
        name: name.trim(),
        monthly_fee: Number(monthly_fee),
      })
      .select()
      .single();

    if (insertError) {
      console.error('Error creating class:', insertError);
      
      // Check for unique constraint violation
      if (insertError.code === '23505') {
        return NextResponse.json(
          { error: 'A class with this name already exists' },
          { status: 409 }
        );
      }
      
      return NextResponse.json(
        { error: 'Failed to create class' },
        { status: 500 }
      );
    }

    // Return the response with the new class data
    return NextResponse.json({ class: newClass }, { status: 201, headers: response.headers });
  } catch (error) {
    console.error('Unexpected error in POST /api/classes:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}