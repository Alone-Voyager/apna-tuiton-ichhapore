import { NextRequest, NextResponse } from 'next/server';
import { createServerClient, type CookieOptions } from '@supabase/ssr';
import bcrypt from 'bcryptjs';

export async function POST(request: NextRequest) {
  try {
    const { email, password } = await request.json();

    if (!email || !password) {
      return NextResponse.json({ error: 'Username/Email and new password are required' }, { status: 400 });
    }

    const isStudentId = !email.includes('@');
    
    const supabaseAdmin = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY!,
      {
        cookies: {
          get() { return undefined; },
          set() { },
          remove() { },
        }
      }
    );

    if (isStudentId) {
      // 1. Check if user exists
      const { data: customUser, error: customErr } = await supabaseAdmin
        .from('users')
        .select('*')
        .eq('username', email.toUpperCase())
        .single();
        
      if (customErr || !customUser) {
        return NextResponse.json({ error: 'Student username not found' }, { status: 404 });
      }

      // 2. Hash new password and update custom table
      const passwordHash = await bcrypt.hash(password, 10);
      const { error: updateCustomErr } = await supabaseAdmin
        .from('users')
        .update({ password_hash: passwordHash })
        .eq('id', customUser.id);
        
      if (updateCustomErr) {
        return NextResponse.json({ error: 'Failed to update custom password' }, { status: 500 });
      }

      // 3. Find and update the linked Auth User
      const studentEmail = `${email.toLowerCase()}@apnatuition.local`;
      const { data: { users }, error: listUsersErr } = await supabaseAdmin.auth.admin.listUsers();
      
      if (!listUsersErr && users) {
          const authUser = users.find(u => u.email === studentEmail);
          if (authUser) {
              await supabaseAdmin.auth.admin.updateUserById(authUser.id, { password: password });
          }
      }
      
      return NextResponse.json({ success: true, message: 'Student password reset securely' });
      
    } else {
      // Find Admin email in Auth DB
      const { data: { users }, error: listUsersErr } = await supabaseAdmin.auth.admin.listUsers();
      
      if (listUsersErr || !users) {
          return NextResponse.json({ error: 'Unable to query auth database' }, { status: 500 });
      }

      const authUser = users.find(u => u.email?.toLowerCase() === email.toLowerCase());
      
      if (!authUser) {
          return NextResponse.json({ error: 'Admin email not found' }, { status: 404 });
      }

      // Automatically force the password replacement natively in Supabase Auth
      const { error: updateAuthErr } = await supabaseAdmin.auth.admin.updateUserById(
          authUser.id, 
          { password: password }
      );
      
      if (updateAuthErr) {
          return NextResponse.json({ error: updateAuthErr.message }, { status: 500 });
      }

      return NextResponse.json({ success: true, message: 'Admin password reset securely' });
    }
  } catch (error: any) {
    console.error('Password reset failed:', error);
    return NextResponse.json({ error: error.message || 'An unexpected error occurred' }, { status: 500 });
  }
}
