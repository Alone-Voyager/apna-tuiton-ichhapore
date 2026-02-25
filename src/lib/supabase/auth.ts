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

    const data = await response.json();

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

    const data = await response.json();

    if (!response.ok) {
      return { data: null, error: new Error(data.error || 'Login failed') };
    }

    return {
      data: {
        session: true,
        role: data.role,
        redirect: data.redirect ?? '/dashboard',
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
    const response = await fetch('/api/auth/logout', {
      method: 'POST',
    });

    if (!response.ok) {
      const data = await response.json();
      return { error: new Error(data.error || 'Logout failed') };
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
