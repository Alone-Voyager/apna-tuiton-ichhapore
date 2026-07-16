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

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseAnonKey || !supabaseServiceRoleKey) {
      console.error('[AUTH:LOGIN] Supabase environment variables are not configured');
      return NextResponse.json(
        { error: 'Authentication service is not configured. Please contact the administrator.' },
        { status: 503 }
      );
    }

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

    const supabase = createServerClient(
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

    if (DEBUG_AUTH) console.log(`[AUTH:LOGIN] Calling Supabase signInWithPassword with email="${loginEmail}"`);

    let data;
    let error;
    try {
      ({ data, error } = await supabase.auth.signInWithPassword({
        email: loginEmail,
        password,
      }));
    } catch (authError: any) {
      console.error('[AUTH:LOGIN] Authentication provider request failed:', authError?.message);
      return NextResponse.json(
        { error: 'Authentication service is temporarily unavailable. Please try again shortly.' },
        { status: 503 }
      );
    }

    if (error) {
      console.error(`[AUTH:LOGIN] FAILED: Supabase signInWithPassword error: ${error.message} (code: ${error.status}, name: ${error.name})`);
      if (typeof error.status === 'number' && error.status >= 500) {
        return NextResponse.json(
          { error: 'Authentication service is temporarily unavailable. Please try again shortly.' },
          { status: 503 }
        );
      }
      return NextResponse.json(
        { error: isStudentId ? 'Invalid username or password' : error.message },
        { status: 401 }
      );
    }

    if (!data.session) {
      console.error(`[AUTH:LOGIN] FAILED: No session returned from Supabase signInWithPassword`);
      return NextResponse.json({ error: 'Login failed' }, { status: 401 });
    }

    if (DEBUG_AUTH) console.log(`[AUTH:LOGIN] Supabase sign-in OK. userId=${data.user.id}, session expires at ${data.session.expires_at}`);

    // Determine role — check admin_profiles first, then student_profiles
    const userId = data.user.id;

    // Check if admin
    if (DEBUG_AUTH) console.log(`[AUTH:LOGIN] Checking admin_profiles for userId=${userId}`);
    const { data: adminProfile, error: adminErr } = await supabase
      .from('admin_profiles')
      .select('role')
      .eq('user_id', userId)
      .eq('is_active', true)
      .single();

    if (DEBUG_AUTH) console.log(`[AUTH:LOGIN] admin_profiles result: found=${!!adminProfile}, error=${adminErr?.message || 'none'}`);

    if (adminProfile) {
      if (DEBUG_AUTH) console.log(`[AUTH:LOGIN] Admin login successful - role=${adminProfile.role}, redirect=/dashboard`);
      const roleResponse = NextResponse.json({
        success: true,
        role: adminProfile.role,
        redirect: '/dashboard',
      });
      response.cookies.getAll().forEach(cookie => {
        roleResponse.cookies.set(cookie.name, cookie.value);
      });
      return roleResponse;
    }

    if (DEBUG_AUTH) console.log(`[AUTH:LOGIN] Not an admin, checking student_profiles`);
    const { data: studentProfile, error: spErr } = await supabase
      .from('student_profiles')
      .select('id, student_id')
      .eq('user_id', userId)
      .eq('is_active', true)
      .single();

    if (DEBUG_AUTH) console.log(`[AUTH:LOGIN] student_profiles result: found=${!!studentProfile}, error=${spErr?.message || 'none'}`);

    if (studentProfile) {
      if (DEBUG_AUTH) console.log(`[AUTH:LOGIN] Checking student approval status for student_id=${studentProfile.student_id}`);
      const { data: studentRecord, error: srErr } = await supabase
        .from('students')
        .select('status, name')
        .eq('id', studentProfile.student_id)
        .single();

      if (DEBUG_AUTH) console.log(`[AUTH:LOGIN] Student record: status=${studentRecord?.status}, name=${studentRecord?.name}, error=${srErr?.message || 'none'}`);

      if (studentRecord && studentRecord.status === 'pending_approval') {
        console.log(`[AUTH:LOGIN] Student "${studentRecord.name}" blocked - pending approval`);
        await supabase.auth.signOut();
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

    // Authenticated but no profile — still allow login, default to dashboard
    if (DEBUG_AUTH) console.log(`[AUTH:LOGIN] No profile found, defaulting to /dashboard (session exists but no role)`);
    console.warn(`[AUTH:LOGIN] User ${userId} has no admin_profiles or student_profiles entry. Defaulting to dashboard.`);
    return response;
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
