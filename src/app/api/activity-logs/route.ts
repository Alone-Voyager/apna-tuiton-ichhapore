import { NextRequest, NextResponse } from 'next/server';
import { getRequestOrgContext } from '../../../lib/supabase/server';

// GET /api/activity-logs - Fetch activity logs for the organization
export async function GET(request: NextRequest) {
  try {
    const { supabase, user, organizationId } = await getRequestOrgContext(request);

    if (!user || !organizationId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
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
      .eq('organization_id', organizationId)
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

    return NextResponse.json({ activities: activityLogs || [] }, { status: 200 });
  } catch (error) {
    console.error('Unexpected error in GET /api/activity-logs:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
