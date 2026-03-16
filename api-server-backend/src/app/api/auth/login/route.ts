import { NextRequest, NextResponse } from 'next/server';
import { createServerClient, type CookieOptions } from '@supabase/ssr';

/**
 * POST /api/auth/login
 * Authenticates the user and returns the role so the client can redirect appropriately.
 * Roles: super_admin | admin | staff → /dashboard
 *        student                     → /student/dashboard
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, password } = body;

    if (!email || !password) {
      return NextResponse.json(
        { error: 'Email and password are required' },
        { status: 400 }
      );
    }

    // Determine if login is admin email or student username
    const isStudentId = email.toUpperCase().startsWith('AT-');
    let loginEmail = email;

    const bcrypt = require('bcryptjs');

    // Create a service role client to bypass RLS for Users table validation
    const supabaseAdmin = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY!,
      {
        cookies: {
          get(name: string) { return request.cookies.get(name)?.value; },
          set(name: string, value: string, options: CookieOptions) { },
          remove(name: string, options: CookieOptions) { },
        }
      }
    );

    // 1. Validate credentials against the Custom Users table if it's a student ID
    if (isStudentId) {
      const { data: customUser, error: customErr } = await supabaseAdmin
        .from('users')
        .select('*')
        .eq('username', email.toUpperCase())
        .single();

      if (customErr || !customUser) {
        return NextResponse.json({ error: 'Invalid username or password' }, { status: 401 });
      }

      // 2. Encrypted hash validation
      const isValidPassword = await bcrypt.compare(password, customUser.password_hash);
      if (!isValidPassword) {
        return NextResponse.json({ error: 'Invalid username or password' }, { status: 401 });
      }

      // 3. Verify Account Status
      if (customUser.status === 'inactive') {
        return NextResponse.json({ error: 'Account disabled' }, { status: 403 });
      }

      // Transform to dummy email strictly for downstream Supabase session binding
      loginEmail = `${email.toLowerCase()}@apnatuition.local`;
    }

    const response = NextResponse.json({ success: true, role: 'admin' });

    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
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

    const { data, error } = await supabase.auth.signInWithPassword({
      email: loginEmail,
      password,
    });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 401 });
    }

    if (!data.session) {
      return NextResponse.json({ error: 'Login failed' }, { status: 401 });
    }

    // Determine role — check admin_profiles first, then student_profiles
    const userId = data.user.id;

    // Check if admin
    const { data: adminProfile } = await supabase
      .from('admin_profiles')
      .select('role')
      .eq('user_id', userId)
      .eq('is_active', true)
      .single();

    if (adminProfile) {
      // Set role in response body (re-create it with the actual role)
      const roleResponse = NextResponse.json({
        success: true,
        role: adminProfile.role,
        redirect: '/dashboard',
      });
      // Copy session cookies from the original response
      response.cookies.getAll().forEach(cookie => {
        roleResponse.cookies.set(cookie.name, cookie.value);
      });
      return roleResponse;
    }

    const { data: studentProfile } = await supabase
      .from('student_profiles')
      .select('id, student_id')
      .eq('user_id', userId)
      .eq('is_active', true)
      .single();

    if (studentProfile) {
      // Check if the actual student record is approved
      const { data: studentRecord } = await supabase
        .from('students')
        .select('status')
        .eq('id', studentProfile.student_id)
        .single();

      if (studentRecord && studentRecord.status === 'pending_approval') {
        // Sign out immediately because they aren't approved
        await supabase.auth.signOut();
        return NextResponse.json({ error: 'Your account is pending admin approval. Please try again later.' }, { status: 403 });
      }
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
    return response;
  } catch (error: any) {
    console.error('Login error:', error);
    return NextResponse.json(
      { error: error.message || 'An unexpected error occurred' },
      { status: 500 }
    );
  }
}
