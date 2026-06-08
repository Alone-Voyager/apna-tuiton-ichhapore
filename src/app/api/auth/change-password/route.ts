import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import bcrypt from 'bcryptjs';

/**
 * POST /api/auth/change-password
 * Body: { oldPassword, newPassword }
 * Verifies the provided old password and updates the Supabase Auth password
 * and the custom `users.password_hash` for student accounts.
 */
export async function POST(request: NextRequest) {
  try {
    const { oldPassword, newPassword } = await request.json();

    if (!oldPassword || !newPassword) {
      return NextResponse.json({ error: 'Old and new passwords are required' }, { status: 400 });
    }

    const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
    const serviceRole = process.env.NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;

    // Client that can read current session from cookies
    const supabaseWithCookies = createServerClient(url, anonKey, {
      cookies: {
        get(name: string) { return request.cookies.get(name)?.value; },
        set() { },
        remove() { },
      }
    });

    const { data: userData } = await supabaseWithCookies.auth.getUser();
    const user = userData?.user;
    if (!user || !user.email) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });

    const email = user.email;

    // Verify old password by attempting sign-in on a client that doesn't touch cookies
    const supabaseNoCookies = createServerClient(url, anonKey, {
      cookies: { get() { return undefined; }, set() { }, remove() { } }
    });

    const { error: verifyErr } = await supabaseNoCookies.auth.signInWithPassword({ email, password: oldPassword });
    if (verifyErr) {
      return NextResponse.json({ error: 'Old password is incorrect' }, { status: 401 });
    }

    // Use service role to update auth user password and custom tables
    const supabaseAdmin = createServerClient(url, serviceRole!, {
      cookies: { get() { return undefined; }, set() { }, remove() { } }
    });

    // If this is a student account using the local domain, update custom users table as well
    const isStudent = email.toLowerCase().endsWith('@apnatuition.local');

    if (isStudent) {
      // Find linked student_profile to discover student id and then update users.password_hash
      const { data: profile, error: profErr } = await supabaseAdmin
        .from('student_profiles')
        .select('student_id')
        .eq('user_id', user.id)
        .single();

      if (!profErr && profile?.student_id) {
        // Look up users entry by matching students.roll_number -> users.username
        const { data: studentRec } = await supabaseAdmin
          .from('students')
          .select('roll_number')
          .eq('id', profile.student_id)
          .single();

        const username = studentRec?.roll_number?.toUpperCase();
        if (username) {
          const passwordHash = await bcrypt.hash(newPassword, 10);
          await supabaseAdmin.from('users').update({ password_hash: passwordHash }).eq('username', username);
        }
      }
    }

    // Update Supabase Auth password using admin API
    const { error: updateErr } = await supabaseAdmin.auth.admin.updateUserById(user.id, { password: newPassword });
    if (updateErr) {
      console.error('Failed to update auth password:', updateErr.message);
      return NextResponse.json({ error: 'Failed to update password' }, { status: 500 });
    }

    return NextResponse.json({ success: true, message: 'Password changed' });
  } catch (err: any) {
    console.error('Change password error:', err);
    return NextResponse.json({ error: err.message || 'Unexpected error' }, { status: 500 });
  }
}
