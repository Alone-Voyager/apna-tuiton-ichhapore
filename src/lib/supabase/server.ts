import { cookies } from 'next/headers';
import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { createClient } from '@supabase/supabase-js';
import type { NextRequest } from 'next/server';

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
  const {
    data: { user },
    error: userError,
  } = await (bearerToken ? supabase.auth.getUser(bearerToken) : supabase.auth.getUser());

  if (userError || !user) {
    return { supabase, user: null, organizationId: null as string | null };
  }

  const { data: adminProfile } = await supabase
    .from('admin_profiles')
    .select('organization_id')
    .eq('user_id', user.id)
    .eq('is_active', true)
    .maybeSingle();

  if (adminProfile?.organization_id) {
    return { supabase, user, organizationId: adminProfile.organization_id as string };
  }

  const { data: studentProfile } = await supabase
    .from('student_profiles')
    .select('organization_id')
    .eq('user_id', user.id)
    .eq('is_active', true)
    .maybeSingle();

  return {
    supabase,
    user,
    organizationId: (studentProfile?.organization_id as string | undefined) ?? null,
  };
}
