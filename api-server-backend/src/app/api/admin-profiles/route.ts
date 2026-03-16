import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '../../../lib/supabase/client';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

// Helper function to get authenticated user's organization
async function getUserOrganizationId() {
  const cookieStore = await cookies();
  
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options)
          );
        },
      },
    }
  );

  const { data: { user }, error: authError } = await supabase.auth.getUser();
  
  if (authError || !user) {
    return { organizationId: null, error: 'Unauthorized' };
  }

  // Get the user's organization_id from admin_profiles
  const { data: profile, error: profileError } = await supabaseAdmin
    .from('admin_profiles')
    .select('organization_id')
    .eq('user_id', user.id)
    .single();

  if (profileError || !profile) {
    return { organizationId: null, error: 'User profile not found' };
  }

  return { organizationId: profile.organization_id, error: null };
}

// GET /api/admin-profiles - Fetch all admin profiles for the logged-in user's organization
export async function GET(request: NextRequest) {
  try {
    const { organizationId, error: authError } = await getUserOrganizationId();

    if (authError || !organizationId) {
      return NextResponse.json(
        { error: authError || 'Organization not found' },
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
