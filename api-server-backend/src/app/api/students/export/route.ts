import { NextRequest, NextResponse } from 'next/server';
import { createServerClient, type CookieOptions } from '@supabase/ssr';

// GET /api/students/export - Export students data for the organization
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
      return NextResponse.json(
        { error: 'Organization not found' },
        { status: 404 }
      );
    }

    const organizationId = userData.organization_id;

    // Fetch students with class information
    const { data: students, error: studentsError } = await supabase
      .from('students')
      .select(`
        name,
        class_id,
        admission_date,
        date_of_birth,
        gender,
        parent_name,
        whatsapp,
        address,
        monthly_fee,
        attendance_rate,
        status,
        classes!students_class_id_fkey(name)
      `)
      .eq('organization_id', organizationId)
      .order('name');

    if (studentsError) {
      console.error('Error fetching students:', studentsError);
      return NextResponse.json(
        { error: 'Failed to fetch students', details: studentsError.message },
        { status: 500 }
      );
    }

    if (!students || students.length === 0) {
      return NextResponse.json(
        { error: 'No students found' },
        { status: 404 }
      );
    }

    // Format the data for export
    const exportData = students.map((s: any) => ({
      Name: s.name || "",
      Class: s.classes?.name || "N/A",
      "Admission Date": s.admission_date || "",
      "Date of Birth": s.date_of_birth || "",
      Gender: s.gender || "",
      "Parent Name": s.parent_name || "",
      WhatsApp: s.whatsapp || "",
      Address: s.address || "",
      "Monthly Fee": s.monthly_fee || 0,
      "Attendance Rate": s.attendance_rate ? `${s.attendance_rate}%` : "0%",
      Status: s.status || "active",
    }));

    return NextResponse.json({
      success: true,
      data: exportData,
      count: exportData.length
    });

  } catch (error) {
    console.error('Export students error:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
