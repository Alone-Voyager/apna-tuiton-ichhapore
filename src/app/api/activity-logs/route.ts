import { NextRequest, NextResponse } from 'next/server';
import { createServerClient, type CookieOptions } from '@supabase/ssr';

// GET /api/activity-logs - Fetch activity logs for the organization
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
      console.error('GET /api/activity-logs - Error fetching user profile:', userError);
      return NextResponse.json(
        { error: 'Organization not found' },
        { status: 404 }
      );
    }

    // Parse query parameters
    const { searchParams } = new URL(request.url);
    const activityType = searchParams.get('activity_type'); // Filter by activity type (e.g., 'admission')
    const startDate = searchParams.get('start_date'); // Format: YYYY-MM-DD
    const endDate = searchParams.get('end_date'); // Format: YYYY-MM-DD
    const limit = searchParams.get('limit') || '50'; // Default to 50 records

    // Build query
    let query = supabase
      .from('activity_logs')
      .select(`
        id,
        activity_type,
        description,
        related_entity_type,
        related_entity_id,
        metadata,
        created_at,
        admin_profiles!activity_logs_performed_by_fkey (
          full_name
        )
      `)
      .eq('organization_id', userData.organization_id)
      .order('created_at', { ascending: false })
      .limit(parseInt(limit));

    // Apply filters
    if (activityType && activityType !== 'all') {
      query = query.eq('activity_type', activityType);
    }

    if (startDate) {
      query = query.gte('created_at', `${startDate}T00:00:00.000Z`);
    }

    if (endDate) {
      query = query.lte('created_at', `${endDate}T23:59:59.999Z`);
    }

    const { data: activityLogs, error: logsError } = await query;

    if (logsError) {
      console.error('Error fetching activity logs:', logsError);
      return NextResponse.json(
        { error: 'Failed to fetch activity logs' },
        { status: 500 }
      );
    }

    return NextResponse.json(
      { activities: activityLogs || [] },
      { status: 200, headers: response.headers }
    );
  } catch (error) {
    console.error('Unexpected error in GET /api/activity-logs:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
