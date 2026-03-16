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

// GET /api/organizations - Fetch logged-in user's organization
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
      .from('organizations')
      .select('*')
      .eq('id', organizationId)
      .single();

    if (error) {
      console.error('Error fetching organization:', error);
      return NextResponse.json(
        { error: 'Failed to fetch organization' },
        { status: 500 }
      );
    }

    if (!data) {
      return NextResponse.json(
        { error: 'Organization not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error('Unexpected error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// PUT /api/organizations - Update logged-in user's organization
export async function PUT(request: NextRequest) {
  try {
    const { organizationId, error: authError } = await getUserOrganizationId();

    if (authError || !organizationId) {
      return NextResponse.json(
        { error: authError || 'Organization not found' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { id, name, slug, state, city } = body;

    // Verify the user is updating their own organization
    if (id !== organizationId) {
      return NextResponse.json(
        { error: 'You can only update your own organization' },
        { status: 403 }
      );
    }

    if (!name || !slug) {
      return NextResponse.json(
        { error: 'Name and slug are required' },
        { status: 400 }
      );
    }

    const { data, error } = await supabaseAdmin
      .from('organizations')
      .update({
        name,
        slug,
        state,
        city,
        updated_at: new Date().toISOString(),
      })
      .eq('id', organizationId)
      .select()
      .single();

    if (error) {
      console.error('Error updating organization:', error);
      return NextResponse.json(
        { error: 'Failed to update organization' },
        { status: 500 }
      );
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error('Unexpected error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
