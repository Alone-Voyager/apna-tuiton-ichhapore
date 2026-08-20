import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { createServerClient, type CookieOptions } from '@supabase/ssr';

const DEFAULT_SUPABASE_URL = 'https://cgbwcayquqpgbnyxnyzw.supabase.co';
const DEFAULT_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNnYndjYXlxdXFwZ2JueXhueXp3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjIwNTkzNTgsImV4cCI6MjA3NzYzNTM1OH0._KmePMak2LvDcnCe8M8_70NeZmyTfp7iw69gw6acoNg';

export async function proxy(request: NextRequest) {
  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  });

  const rawUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const rawKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const supabaseUrl = (!rawUrl || rawUrl.includes('gvhguudtztutbxwolsxd')) ? DEFAULT_SUPABASE_URL : rawUrl;
  const supabaseAnonKey = (!rawKey || rawKey.includes('gvhguudtztutbxwolsxd')) ? DEFAULT_ANON_KEY : rawKey;

  const supabase = createServerClient(
    supabaseUrl,
    supabaseAnonKey,
    {
      cookies: {
        get(name: string) {
          return request.cookies.get(name)?.value;
        },
        set(name: string, value: string, options: CookieOptions) {
          request.cookies.set({
            name,
            value,
            ...options,
          });
          response = NextResponse.next({
            request: {
              headers: request.headers,
            },
          });
          response.cookies.set({
            name,
            value,
            ...options,
          });
        },
        remove(name: string, options: CookieOptions) {
          request.cookies.set({
            name,
            value: '',
            ...options,
          });
          response = NextResponse.next({
            request: {
              headers: request.headers,
            },
          });
          response.cookies.set({
            name,
            value: '',
            ...options,
          });
        },
      },
    }
  );

  // Use getUser() instead of getSession() for secure server-side auth check
  const { data: { user } } = await supabase.auth.getUser();

  const pathname = request.nextUrl.pathname;

  // If not signed in and accessing protected routes -> redirect to login
  if (!user && (pathname.startsWith('/dashboard') || pathname.startsWith('/student') || pathname.startsWith('/staff'))) {
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('redirect', pathname);
    return NextResponse.redirect(loginUrl);
  }

  // If signed in and on login/signup -> redirect to appropriate dashboard
  if (user && (pathname === '/login' || pathname === '/signup' || pathname.startsWith('/login/'))) {
    // Check if they're a student
    try {
      const { data: studentProfile } = await supabase
        .from('student_profiles')
        .select('id')
        .eq('user_id', user.id)
        .eq('is_active', true)
        .maybeSingle();

      if (studentProfile) {
        return NextResponse.redirect(new URL('/student/dashboard', request.url));
      }
    } catch (e) {
      // Ignore errors — just redirect to admin dashboard
    }
    return NextResponse.redirect(new URL('/dashboard', request.url));
  }

  // If signed in as student but accessing admin dashboard -> redirect
  if (user && pathname.startsWith('/dashboard')) {
    try {
      const { data: studentProfile } = await supabase
        .from('student_profiles')
        .select('id')
        .eq('user_id', user.id)
        .eq('is_active', true)
        .maybeSingle();

      if (studentProfile) {
        return NextResponse.redirect(new URL('/student/dashboard', request.url));
      }
    } catch (e) {
      // Ignore — allow access
    }
  }

  // If signed in as admin but accessing student routes -> redirect
  if (user && pathname.startsWith('/student')) {
    try {
      const { data: adminProfile } = await supabase
        .from('admin_profiles')
        .select('id')
        .eq('user_id', user.id)
        .eq('is_active', true)
        .maybeSingle();

      if (adminProfile) {
        return NextResponse.redirect(new URL('/dashboard', request.url));
      }
    } catch (e) {
      // Ignore — allow access
    }
  }

  return response;
}

// Configure which routes use this proxy.
export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - api routes
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico
     * - public files (public folder)
     */
    '/((?!api|_next/static|_next/image|favicon.ico|.*\\..*|public).*)',
  ],
};