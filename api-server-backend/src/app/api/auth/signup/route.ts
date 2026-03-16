import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '../../../../lib/supabase/client';
import { generateSlug } from '../../../../lib/utils/slug';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, password, fullName, organizationName, state, city, phone, role = 'admin' } = body;

    // Validate required fields
    if (!email || !password || !fullName || !organizationName || !state || !city || !phone) {
      return NextResponse.json(
        { error: 'All fields are required' },
        { status: 400 }
      );
    }

    // Check if organization name already exists
    const { data: existingOrg } = await supabaseAdmin
      .from('organizations')
      .select('name')
      .eq('name', organizationName)
      .single();

    if (existingOrg) {
      return NextResponse.json(
        { error: `Organization "${organizationName}" already exists. Please use a different name or contact the existing organization admin.` },
        { status: 409 }
      );
    }

    // Create auth user using Admin API
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true, // Auto-confirm email for now
      user_metadata: {
        full_name: fullName,
      },
    });

    if (authError) {
      return NextResponse.json(
        { error: authError.message },
        { status: 400 }
      );
    }

    if (!authData.user) {
      return NextResponse.json(
        { error: 'User creation failed' },
        { status: 500 }
      );
    }

    // Create organization
    const orgSlug = generateSlug(organizationName);

    const { data: orgData, error: orgError } = await supabaseAdmin
      .from('organizations')
      .insert({
        name: organizationName,
        slug: orgSlug,
        state: state,
        city: city,
        is_active: true,
      })
      .select()
      .single();

    if (orgError) {
      // Rollback: delete the auth user
      await supabaseAdmin.auth.admin.deleteUser(authData.user.id);

      if (orgError.code === '23505') {
        return NextResponse.json(
          { error: `Organization "${organizationName}" already exists. Please use a different name.` },
          { status: 409 }
        );
      }

      return NextResponse.json(
        { error: orgError.message },
        { status: 500 }
      );
    }

    // Create admin profile
    const { error: profileError } = await supabaseAdmin
      .from('admin_profiles')
      .insert({
        user_id: authData.user.id,
        organization_id: orgData.id,
        full_name: fullName,
        email: email,
        phone: phone,
        role: role,
        is_active: true,
      });

    if (profileError) {
      // Rollback: delete organization and auth user
      await supabaseAdmin.from('organizations').delete().eq('id', orgData.id);
      await supabaseAdmin.auth.admin.deleteUser(authData.user.id);

      return NextResponse.json(
        { error: profileError.message },
        { status: 500 }
      );
    }

    return NextResponse.json(
      {
        success: true,
        message: 'Account created successfully! Please sign in.',
        user: {
          id: authData.user.id,
          email: authData.user.email,
        },
      },
      { status: 201 }
    );
  } catch (error: any) {
    console.error('Signup error:', error);
    return NextResponse.json(
      { error: error.message || 'An unexpected error occurred' },
      { status: 500 }
    );
  }
}
