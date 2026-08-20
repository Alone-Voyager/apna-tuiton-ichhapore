import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '../../../lib/supabase/client';

export async function GET(request: NextRequest) {
  try {
    const supabaseUrl = (process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://cgbwcayquqpgbnyxnyzw.supabase.co');
    const hasAnonKey = !!(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNnYndjYXlxdXFwZ2JueXhueXp3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjIwNTkzNTgsImV4cCI6MjA3NzYzNTM1OH0._KmePMak2LvDcnCe8M8_70NeZmyTfp7iw69gw6acoNg');
    const hasServiceRoleKey = !!(process.env.SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNnYndjYXlxdXFwZ2JueXhueXp3Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MjA1OTM1OCwiZXhwIjoyMDc3NjM1MzU4fQ.GI0n5RGF540FQvGm9N9P5wfQrLnOycM_hKZ2dQeDAEI');

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
        supabaseUrl,
        hasAnonKey,
        hasServiceRoleKey,
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
