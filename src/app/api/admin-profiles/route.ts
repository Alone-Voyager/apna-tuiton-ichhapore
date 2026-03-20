import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '../../../lib/supabase/client';
import { getRequestOrgContext } from '../../../lib/supabase/server';

// Helper function to get authenticated user's organization
// GET /api/admin-profiles - Fetch all admin profiles for the logged-in user's organization
export async function GET(request: NextRequest) {
  try {
    const { user, organizationId } = await getRequestOrgContext(request);

    if (!user || !organizationId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { data, error } = await supabaseAdmin
      .from('admin_profiles')
      .select('id, full_name, email, role, phone, is_active, created_at, updated_at')
      .eq('organization_id', organizationId)
      .order('created_at', { ascending: true });

    if (error) {
      console.error('Error fetching admin profiles:', error);
      return NextResponse.json(
        { error: 'Failed to fetch admin profiles' },
        { status: 500 }
      );
    }

    return NextResponse.json(data || []);
  } catch (error) {
    console.error('Unexpected error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
