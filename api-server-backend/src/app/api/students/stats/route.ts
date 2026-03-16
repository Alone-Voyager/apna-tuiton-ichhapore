import { NextRequest, NextResponse } from 'next/server';
import { createServerClient, type CookieOptions } from '@supabase/ssr';

// GET - Fetch student statistics
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

    if (userError || !userData) {
      return NextResponse.json(
        { error: 'User profile not found' },
        { status: 404 }
      );
    }

    // Get total students count
    const { count: totalStudents, error: totalError } = await supabase
      .from('students')
      .select('*', { count: 'exact', head: true })
      .eq('organization_id', userData.organization_id)
      .eq('is_active', true);

    if (totalError) {
      console.error('Error fetching total students:', totalError);
      return NextResponse.json({ error: totalError.message }, { status: 500 });
    }

    // Get this month's admissions count
    const now = new Date();
    const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
    const lastDayOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split('T')[0];

    const { count: thisMonthAdmissions, error: monthError } = await supabase
      .from('students')
      .select('*', { count: 'exact', head: true })
      .eq('organization_id', userData.organization_id)
      .gte('admission_date', firstDayOfMonth)
      .lte('admission_date', lastDayOfMonth);

    if (monthError) {
      console.error('Error fetching this month admissions:', monthError);
      return NextResponse.json({ error: monthError.message }, { status: 500 });
    }

    return NextResponse.json({ 
      totalStudents: totalStudents || 0,
      thisMonthAdmissions: thisMonthAdmissions || 0
    }, { status: 200 });
  } catch (error) {
    console.error('Error in GET /api/students/stats:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
