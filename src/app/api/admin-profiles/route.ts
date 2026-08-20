import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '../../../lib/supabase/client';
import { getRequestOrgContext } from '../../../lib/supabase/server';

// Helper function to get authenticated user's organization
// GET /api/admin-profiles - Fetch all admin profiles for the logged-in user's organization
export async function GET(request: NextRequest) {
  try {
    const { user, organizationId } = await getRequestOrgContext(request);
    const useOrgFilter = organizationId && organizationId !== 'default-org';

    if (!user) {
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

// POST /api/admin-profiles - Create a new staff/admin member
export async function POST(request: NextRequest) {
  try {
    const { user, organizationId } = await getRequestOrgContext(request);
    const useOrgFilter = organizationId && organizationId !== 'default-org';

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Verify caller is admin or super_admin
    const { data: callerProfile } = await supabaseAdmin
      .from('admin_profiles')
      .select('role')
      .eq('user_id', user.id)
      .single();

    if (!callerProfile || (callerProfile.role !== 'admin' && callerProfile.role !== 'super_admin')) {
      return NextResponse.json(
        { error: 'Access Denied: Only Admins can create staff accounts' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { email, password, fullName, phone, role } = body;

    if (!email || !password || !fullName) {
      return NextResponse.json(
        { error: 'Full name, email, and password are required' },
        { status: 400 }
      );
    }

    const userRole = role || 'staff';

    // Create Supabase Auth User
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email: email.trim(),
      password: password,
      email_confirm: true,
      user_metadata: { full_name: fullName, role: userRole },
    });

    if (authError) {
      console.error('Error creating staff auth user:', authError);
      return NextResponse.json({ error: authError.message }, { status: 400 });
    }

    // Create admin_profiles entry
    const { data: profile, error: profileError } = await supabaseAdmin
      .from('admin_profiles')
      .insert({
        user_id: authData.user.id,
        organization_id: organizationId,
        full_name: fullName,
        email: email.trim(),
        phone: phone || null,
        role: userRole,
        is_active: true,
      })
      .select()
      .single();

    if (profileError) {
      console.error('Error creating staff profile record:', profileError);
      await supabaseAdmin.auth.admin.deleteUser(authData.user.id);
      return NextResponse.json({ error: profileError.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, profile }, { status: 201 });
  } catch (error: any) {
    console.error('POST /api/admin-profiles error:', error);
    return NextResponse.json({ error: error?.message || 'Server error' }, { status: 500 });
  }
}
