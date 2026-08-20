import { NextRequest, NextResponse } from 'next/server';
import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { createClient } from '@supabase/supabase-js';

/**
 * POST /api/auth/login
 * Authenticates the user and returns the role so the client can redirect appropriately.
 * Roles: super_admin | admin | staff → /dashboard
 *        student                     → /student/dashboard
 */
const DEBUG_AUTH = process.env.DEBUG_AUTH === 'true';

export async function POST(request: NextRequest) {
  const requestStart = Date.now();
  try {
    const body = await request.json();
    const { email: rawEmail, password } = body;
    const email = typeof rawEmail === 'string' ? rawEmail.trim() : rawEmail;

    if (DEBUG_AUTH) console.log(`[AUTH:LOGIN] Request received for: "${email}"`);

    if (!email || !password) {
      if (DEBUG_AUTH) console.log(`[AUTH:LOGIN] Missing email or password`);
      return NextResponse.json(
        { error: 'Email and password are required' },
        { status: 400 }
      );
    }

    // Determine if login is admin email or student username
    const isStudentId = !email.includes('@');
    let loginEmail = email;

    if (DEBUG_AUTH) console.log(`[AUTH:LOGIN] isStudentId=${isStudentId} (email contains @ = ${!isStudentId})`);

    const bcrypt = require('bcryptjs');

    const supabaseUrl = (process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://cgbwcayquqpgbnyxnyzw.supabase.co');
    const supabaseAnonKey = (process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNnYndjYXlxdXFwZ2JueXhueXp3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjIwNTkzNTgsImV4cCI6MjA3NzYzNTM1OH0._KmePMak2LvDcnCe8M8_70NeZmyTfp7iw69gw6acoNg');
    const supabaseServiceRoleKey = (process.env.SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNnYndjYXlxdXFwZ2JueXhueXp3Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MjA1OTM1OCwiZXhwIjoyMDc3NjM1MzU4fQ.GI0n5RGF540FQvGm9N9P5wfQrLnOycM_hKZ2dQeDAEI');

    // Service-role credentials must remain server-only and must never be placed in
    // a NEXT_PUBLIC_* variable, which Next.js embeds in browser bundles.
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    // 1. Validate credentials against the Custom Users table if it's a student ID
    if (isStudentId) {
      const usernameUpper = email.toUpperCase();
      if (DEBUG_AUTH) console.log(`[AUTH:LOGIN] Looking up student in users table: username="${usernameUpper}"`);

      const { data: customUser, error: customErr } = await supabaseAdmin
        .from('users')
        .select('*')
        .eq('username', usernameUpper)
        .single();

      if (customErr || !customUser) {
        if (DEBUG_AUTH) console.log(`[AUTH:LOGIN] FAILED: users table lookup - ${customErr?.message || 'no user found'}. Code: ${customErr?.code || 'N/A'}`);
        return NextResponse.json({ error: 'Invalid username or password' }, { status: 401 });
      }

      if (DEBUG_AUTH) console.log(`[AUTH:LOGIN] Found user: id=${customUser.id}, status=${customUser.status}, role=${customUser.role}`);

      // 2. Encrypted hash validation
      const isValidPassword = await bcrypt.compare(password, customUser.password_hash);
      if (!isValidPassword) {
        if (DEBUG_AUTH) console.log(`[AUTH:LOGIN] FAILED: bcrypt password mismatch for user ${customUser.id}`);
        return NextResponse.json({ error: 'Invalid username or password' }, { status: 401 });
      }
      if (DEBUG_AUTH) console.log(`[AUTH:LOGIN] bcrypt password match OK`);

      // 3. Verify Account Status
      if (customUser.status === 'inactive') {
        if (DEBUG_AUTH) console.log(`[AUTH:LOGIN] FAILED: account inactive for user ${customUser.id}`);
        return NextResponse.json({ error: 'Account disabled' }, { status: 403 });
      }

      // Transform to dummy email strictly for downstream Supabase session binding
      loginEmail = `${email.toLowerCase()}@apnatuition.local`;
      if (DEBUG_AUTH) console.log(`[AUTH:LOGIN] Transformed loginEmail to: "${loginEmail}"`);

      // 4. Force-sync the password to Supabase Auth so signInWithPassword never fails due to desync
      const rollUpper = email.toUpperCase();
      if (DEBUG_AUTH) console.log(`[AUTH:LOGIN] Looking up student by roll_number="${rollUpper}" for auth sync`);

      const { data: studentRecord, error: studentErr } = await supabaseAdmin
        .from('students')
        .select('id, status')
        .eq('roll_number', rollUpper)
        .single();

      if (studentErr || !studentRecord) {
        if (DEBUG_AUTH) console.log(`[AUTH:LOGIN] WARNING: No student record found for roll_number="${rollUpper}". Error: ${studentErr?.message || 'not found'}`);
      } else {
        if (DEBUG_AUTH) console.log(`[AUTH:LOGIN] Found student: id=${studentRecord.id}, status=${studentRecord.status}`);

        const { data: profile, error: profileErr } = await supabaseAdmin
          .from('student_profiles')
          .select('user_id')
          .eq('student_id', studentRecord.id)
          .single();

        if (profileErr || !profile?.user_id) {
          if (DEBUG_AUTH) console.log(`[AUTH:LOGIN] WARNING: No student_profiles entry for student ${studentRecord.id}. Error: ${profileErr?.message || 'not found'}`);
        } else {
          if (DEBUG_AUTH) console.log(`[AUTH:LOGIN] Found student_profile user_id=${profile.user_id}, syncing password to Supabase Auth`);
          try {
            const { error: updateErr } = await supabaseAdmin.auth.admin.updateUserById(profile.user_id, {
              password: password
            });
            if (updateErr) {
              console.error(`[AUTH:LOGIN] WARNING: Failed to sync password to Supabase Auth: ${updateErr.message}`);
            } else if (DEBUG_AUTH) {
              console.log(`[AUTH:LOGIN] Password synced to Supabase Auth OK`);
            }
          } catch (syncErr: any) {
            console.error(`[AUTH:LOGIN] WARNING: Exception syncing password to Supabase Auth: ${syncErr.message}`);
          }
        }
      }
    } else {
      if (DEBUG_AUTH) console.log(`[AUTH:LOGIN] Admin/email login detected for "${email}"`);
    }

    const response = NextResponse.json({ success: true, role: 'admin' });

    // Use standard JS client for signInWithPassword to prevent @supabase/ssr fetch failed errors on Vercel
    const authClient = createClient(supabaseUrl, supabaseAnonKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    let data;
    let error;
    try {
      ({ data, error } = await authClient.auth.signInWithPassword({
        email: loginEmail,
        password,
      }));
    } catch (authError: any) {
      console.error('[AUTH:LOGIN] Authentication provider request failed:', authError?.message);
      return NextResponse.json(
        { error: authError?.message || 'Authentication failed. Please check your credentials.' },
        { status: 401 }
      );
    }

    if (error || !data?.session) {
      console.error(`[AUTH:LOGIN] FAILED: Supabase signInWithPassword error: ${error?.message || 'No session'}`);
      return NextResponse.json(
        { error: isStudentId ? 'Invalid username or password' : (error?.message || 'Invalid login credentials') },
        { status: 401 }
      );
    }

    // Now set cookies on the response using createServerClient setSession
    const supabaseServer = createServerClient(
      supabaseUrl,
      supabaseAnonKey,
      {
        cookies: {
          get(name: string) {
            return request.cookies.get(name)?.value;
          },
          set(name: string, value: string, options: CookieOptions) {
            response.cookies.set({ name, value, ...options });
          },
          remove(name: string, options: CookieOptions) {
            response.cookies.set({ name, value: '', ...options });
          },
        },
      }
    );

    try {
      await supabaseServer.auth.setSession({
        access_token: data.session.access_token,
        refresh_token: data.session.refresh_token,
      });
    } catch (e) {
      console.warn('[AUTH:LOGIN] Warning setting session cookies:', e);
    }

    // Determine role — check admin_profiles first, then student_profiles
    const userId = data.user.id;

    // Check if admin using supabaseAdmin to bypass RLS
    if (DEBUG_AUTH) console.log(`[AUTH:LOGIN] Checking admin_profiles for userId=${userId}`);
    const { data: adminProfile, error: adminErr } = await supabaseAdmin
      .from('admin_profiles')
      .select('role, organization_id')
      .eq('user_id', userId)
      .maybeSingle();

    if (DEBUG_AUTH) console.log(`[AUTH:LOGIN] admin_profiles result: found=${!!adminProfile}, error=${adminErr?.message || 'none'}`);

    if (adminProfile) {
      const userRole = adminProfile.role || 'admin';
      const redirectPath = (userRole === 'staff' || userRole === 'teacher') ? '/staff/dashboard' : '/dashboard';
      if (DEBUG_AUTH) console.log(`[AUTH:LOGIN] Login successful - role=${userRole}, redirect=${redirectPath}`);
      const roleResponse = NextResponse.json({
        success: true,
        role: userRole,
        redirect: redirectPath,
      });
      response.cookies.getAll().forEach(cookie => {
        roleResponse.cookies.set(cookie.name, cookie.value);
      });
      return roleResponse;
    }

    if (DEBUG_AUTH) console.log(`[AUTH:LOGIN] Not an admin, checking student_profiles`);
    const { data: studentProfile, error: spErr } = await supabaseAdmin
      .from('student_profiles')
      .select('id, student_id')
      .eq('user_id', userId)
      .maybeSingle();

    if (DEBUG_AUTH) console.log(`[AUTH:LOGIN] student_profiles result: found=${!!studentProfile}, error=${spErr?.message || 'none'}`);

    if (studentProfile) {
      if (DEBUG_AUTH) console.log(`[AUTH:LOGIN] Checking student approval status for student_id=${studentProfile.student_id}`);
      const { data: studentRecord, error: srErr } = await supabaseAdmin
        .from('students')
        .select('status, name')
        .eq('id', studentProfile.student_id)
        .maybeSingle();

      if (DEBUG_AUTH) console.log(`[AUTH:LOGIN] Student record: status=${studentRecord?.status}, name=${studentRecord?.name}, error=${srErr?.message || 'none'}`);

      if (studentRecord && studentRecord.status === 'pending_approval') {
        console.log(`[AUTH:LOGIN] Student "${studentRecord.name}" blocked - pending approval`);
        await supabaseServer.auth.signOut();
        return NextResponse.json({ error: 'Your account is pending admin approval. Please try again later.' }, { status: 403 });
      }
      
      if (DEBUG_AUTH) console.log(`[AUTH:LOGIN] Student login successful - name="${studentRecord?.name}", redirect=/student/dashboard`);
      const roleResponse = NextResponse.json({
        success: true,
        role: 'student',
        redirect: '/student/dashboard',
      });
      response.cookies.getAll().forEach(cookie => {
        roleResponse.cookies.set(cookie.name, cookie.value);
      });
      return roleResponse;
    }

    // Authenticated but no profile — auto-heal user by creating admin_profile linked to default org
    if (DEBUG_AUTH) console.log(`[AUTH:LOGIN] No profile found, auto-healing user ${userId} to admin_profiles`);
    const { data: defaultOrg } = await supabaseAdmin
      .from('organizations')
      .select('id')
      .limit(1)
      .maybeSingle();

    if (defaultOrg?.id) {
      try {
        await supabaseAdmin.from('admin_profiles').upsert(
          {
            user_id: userId,
            organization_id: defaultOrg.id,
            role: 'admin',
            is_active: true,
          },
          { onConflict: 'user_id' }
        );
      } catch (e) {}
    }

    const roleResponse = NextResponse.json({
      success: true,
      role: 'admin',
      redirect: '/dashboard',
    });
    response.cookies.getAll().forEach(cookie => {
      roleResponse.cookies.set(cookie.name, cookie.value);
    });
    return roleResponse;
  } catch (error: any) {
    const elapsed = Date.now() - requestStart;
    console.error(`[AUTH:LOGIN] CRITICAL: Unhandled exception after ${elapsed}ms:`, {
      message: error.message,
      stack: error.stack?.split('\n').slice(0, 3).join('\n'),
      code: error.code,
      status: error.status,
    });
    return NextResponse.json(
      { error: 'An unexpected error occurred. Please try again.' },
      { status: 500 }
    );
  } finally {
    if (DEBUG_AUTH) {
      const elapsed = Date.now() - requestStart;
      console.log(`[AUTH:LOGIN] Request completed in ${elapsed}ms`);
    }
  }
}
