import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { SUPABASE_URL, SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY } from '../../../lib/supabase/config';

export async function GET(request: NextRequest) {
  try {
    const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    // Test querying organizations table via supabaseAdmin
    const { data: orgs, error: orgError } = await supabaseAdmin
      .from('organizations')
      .select('id, name, created_at');

    // Test querying admin_profiles table via supabaseAdmin
    const { data: admins, error: adminError } = await supabaseAdmin
      .from('admin_profiles')
      .select('id, user_id, organization_id, role, full_name, email');

    // Test querying students table count
    const { count: studentCount, error: studentError } = await supabaseAdmin
      .from('students')
      .select('id', { count: 'exact', head: true });

    return NextResponse.json({
      success: true,
      env: {
        supabaseUrl: SUPABASE_URL,
        hasAnonKey: !!SUPABASE_ANON_KEY,
        hasServiceRoleKey: !!SUPABASE_SERVICE_ROLE_KEY,
      },
      organizations: {
        count: orgs?.length || 0,
        data: orgs || [],
        error: orgError ? orgError.message : null,
      },
      adminProfiles: {
        count: admins?.length || 0,
        data: admins || [],
        error: adminError ? adminError.message : null,
      },
      students: {
        count: studentCount || 0,
        error: studentError ? studentError.message : null,
      }
    });
  } catch (err: any) {
    return NextResponse.json({
      success: false,
      error: err.message,
    }, { status: 500 });
  }
}
