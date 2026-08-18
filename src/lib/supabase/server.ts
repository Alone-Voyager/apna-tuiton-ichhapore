import { cookies } from 'next/headers';
import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { createClient } from '@supabase/supabase-js';
import type { NextRequest } from 'next/server';
import { supabaseAdmin } from './client';

function extractBearerToken(request?: NextRequest) {
  if (!request) return null;
  const authorization = request.headers.get('authorization') || request.headers.get('Authorization');
  if (!authorization) return null;
  const [scheme, token] = authorization.split(' ');
  if (!scheme || !token || scheme.toLowerCase() !== 'bearer') return null;
  return token.trim();
}

export async function createRouteSupabaseClient(request?: NextRequest) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error('Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY');
  }

  const bearerToken = extractBearerToken(request);
  if (bearerToken) {
    return createClient(supabaseUrl, supabaseAnonKey, {
      global: {
        headers: {
          Authorization: `Bearer ${bearerToken}`,
        },
      },
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });
  }

  const cookieStore = await cookies();

  return createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      get(name: string) {
        return cookieStore.get(name)?.value;
      },
      set(name: string, value: string, options: CookieOptions) {
        cookieStore.set({ name, value, ...options });
      },
      remove(name: string, options: CookieOptions) {
        cookieStore.set({ name, value: '', ...options });
      },
    },
  });
}

export async function getRequestOrgContext(request?: NextRequest) {
  const supabase = await createRouteSupabaseClient(request);
  const bearerToken = extractBearerToken(request);
  
  let user = null;
  let userError = null;

  try {
    const authResult = await (bearerToken ? supabase.auth.getUser(bearerToken) : supabase.auth.getUser());
    user = authResult.data.user;
    userError = authResult.error;
  } catch (error: any) {
    console.error('Supabase auth.getUser() threw an exception:', error);
    return { supabase, user: null, organizationId: null as string | null };
  }

  if (userError || !user) {
    return { supabase, user: null, organizationId: null as string | null };
  }

  // Use service role admin client to bypass RLS and read admin_profiles reliably
  let organizationId: string | null = null;

  const { data: adminProfile } = await supabaseAdmin
    .from('admin_profiles')
    .select('organization_id')
    .eq('user_id', user.id)
    .maybeSingle();

  if (adminProfile?.organization_id) {
    organizationId = adminProfile.organization_id;
  }

  if (!organizationId) {
    const { data: studentProfile } = await supabaseAdmin
      .from('student_profiles')
      .select('organization_id')
      .eq('user_id', user.id)
      .maybeSingle();
    if (studentProfile?.organization_id) {
      organizationId = studentProfile.organization_id;
    }
  }

  // Fallback: Default to first organization in database
  if (!organizationId) {
    const { data: fallbackOrg } = await supabaseAdmin
      .from('organizations')
      .select('id')
      .limit(1)
      .maybeSingle();
    if (fallbackOrg?.id) {
      organizationId = fallbackOrg.id;
    }
  }

  return {
    supabase,
    user,
    organizationId,
  };
}
