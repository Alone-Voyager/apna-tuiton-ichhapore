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
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://gvhguudtztutbxwolsxd.supabase.co';
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imd2aGd1dWR0enR1dGJ4d29sc3hkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MDY3OTc5MjksImV4cCI6MjAyMjM3MzkyOX0.5_f5WqC5-P2q6k6jJ';

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

  try {
    const authResult = await (bearerToken ? supabase.auth.getUser(bearerToken) : supabase.auth.getUser());
    user = authResult.data.user;
  } catch (error: any) {
    console.error('Supabase auth.getUser() exception:', error);
  }

  let organizationId: string = 'default-org';

  if (user?.id) {
    try {
      const { data: adminProfile } = await supabaseAdmin
        .from('admin_profiles')
        .select('organization_id')
        .eq('user_id', user.id)
        .maybeSingle();

      if (adminProfile?.organization_id) {
        organizationId = adminProfile.organization_id;
      } else {
        const { data: studentProfile } = await supabaseAdmin
          .from('student_profiles')
          .select('organization_id')
          .eq('user_id', user.id)
          .maybeSingle();

        if (studentProfile?.organization_id) {
          organizationId = studentProfile.organization_id;
        } else {
          const { data: fallbackOrg } = await supabaseAdmin
            .from('organizations')
            .select('id')
            .limit(1)
            .maybeSingle();

          if (fallbackOrg?.id) {
            organizationId = fallbackOrg.id;
          }
        }
      }
    } catch (e) {
      console.warn('getRequestOrgContext org lookup failed:', e);
    }
  }

  return {
    supabase,
    user,
    organizationId,
  };
}
