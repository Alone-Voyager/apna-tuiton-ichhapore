import { supabase, supabaseAdmin } from './client';

/**
 * Sign up a new admin user with organization via API
 */
export async function signUp(
  email: string,
  password: string,
  fullName: string,
  organizationName: string,
  state: string,
  city: string,
  phone: string,
  role: 'super_admin' | 'admin' | 'staff' = 'admin'
) {
  try {
    const response = await fetch('/api/auth/signup', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email,
        password,
        fullName,
        organizationName,
        state,
        city,
        phone,
        role,
      }),
    });

    const contentType = response.headers.get('content-type') || '';
    const data = contentType.includes('application/json') ? await response.json() : null;

    if (!contentType.includes('application/json')) {
      const text = await response.text();
      return {
        data: null,
        error: new Error(
          `Signup endpoint returned non-JSON response (${response.status}): ${text.slice(0, 120)}`
        ),
      };
    }

    if (!response.ok) {
      return { data: null, error: new Error(data.error || 'Signup failed') };
    }

    return { data, error: null };
  } catch (error: any) {
    return { data: null, error };
  }
}

/**
 * Sign in existing admin user via API
 */
export async function signIn(email: string, password: string) {
  try {
    const response = await fetch('/api/auth/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ email, password }),
    });

    const contentType = response.headers.get('content-type') || '';
    let data: any = null;
    
    if (contentType.includes('application/json')) {
      data = await response.json();
    } else {
      const text = await response.text();
      console.error('[AUTH] Non-JSON login response:', text.slice(0, 200));
      return { data: null, error: new Error('Server returned an invalid response. Please try again.') };
    }

    if (!response.ok) {
      const statusCode = response.status;
      let message = data.error || 'Login failed';
      if (statusCode === 403 && message.includes('pending')) {
        message = 'Your account is pending admin approval. Please try again later.';
      } else if (statusCode === 403) {
        message = 'Your account has been disabled. Please contact the administrator.';
      }
      return { data: null, error: new Error(message) };
    }

    // Force a reload of the browser client session since cookies were set by the server
    await supabase.auth.getSession();

    return {
      data: {
        success: data.success === true,
        role: data.role,
        redirect: data.redirect || (data.role === 'student' ? '/student/dashboard' : '/dashboard'),
      },
      error: null,
    };
  } catch (error: any) {
    return { data: null, error };
  }
}

/**
 * Sign out current user via API
 */
export async function signOut() {
  try {
    const { error } = await supabase.auth.signOut();

    if (error) {
      return { error };
    }

    return { error: null };
  } catch (error: any) {
    return { error };
  }
}

/**
 * Get current session
 */
export async function getSession() {
  const { data, error } = await supabase.auth.getSession();
  return { data, error };
}

/**
 * Get current user
 */
export async function getUser() {
  const { data, error } = await supabase.auth.getUser();
  return { data, error };
}

/**
 * Get admin profile for current user
 */
export async function getAdminProfile() {
  const { data: userData, error: userError } = await getUser();

  if (userError || !userData.user) {

    return { data: null, error: userError };
  }

  const { data, error } = await supabase
    .from('admin_profiles')
    .select('*')
    .eq('user_id', userData.user.id)
    .single();
  return { data, error };
}

/**
 * Update admin profile
 */
export async function updateAdminProfile(
  userId: string,
  updates: {
    full_name?: string;
    phone?: string;
    role?: 'super_admin' | 'admin' | 'staff';
  }
) {
  // Use supabaseAdmin to bypass RLS for updates
  const { data, error } = await supabaseAdmin
    .from('admin_profiles')
    .update(updates)
    .eq('user_id', userId)
    .select()
    .single();

  return { data, error };
}

/**
 * Reset password
 */
export async function resetPassword(email: string) {
  const { data, error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${window.location.origin}/auth/reset-password`,
  });

  return { data, error };
}

/**
 * Update password
 */
export async function updatePassword(newPassword: string) {
  const { data, error } = await supabase.auth.updateUser({
    password: newPassword,
  });

  return { data, error };
}

/**
 * Check if user is authenticated
 */
export async function isAuthenticated() {
  const { data } = await getSession();
  return !!data.session;
}
