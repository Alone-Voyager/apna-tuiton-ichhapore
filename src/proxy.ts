import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { createServerClient, type CookieOptions } from '@supabase/ssr';

export async function proxy(request: NextRequest) {
  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  });

  // If Supabase env vars aren't available during build time, skip auth checks.
  // This prevents Next build from failing when environment variables are provided
  // at runtime or via build args in CI.
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    return response;
  }

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
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

  const {
    data: { session },
  } = await supabase.auth.getSession();

  const pathname = request.nextUrl.pathname;

  // If not signed in and accessing protected routes -> login
  if (!session && (pathname.startsWith('/dashboard') || pathname.startsWith('/student'))) {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  // If signed in and on login/signup -> figure out where to send them
  if (session && (pathname === '/login' || pathname === '/signup')) {
    // Check if they're a student
    const { data: studentProfile } = await supabase
      .from('student_profiles')
      .select('id')
      .eq('user_id', session.user.id)
      .eq('is_active', true)
      .single();

    if (studentProfile) {
      return NextResponse.redirect(new URL('/student/dashboard', request.url));
    }
    return NextResponse.redirect(new URL('/dashboard', request.url));
  }

  if (session && pathname.startsWith('/dashboard')) {
    const { data: studentProfile } = await supabase
      .from('student_profiles')
      .select('id')
      .eq('user_id', session.user.id)
      .eq('is_active', true)
      .single();

    if (studentProfile) {
      return NextResponse.redirect(new URL('/student/dashboard', request.url));
    }
  }

  if (session && pathname.startsWith('/student')) {
    const { data: adminProfile } = await supabase
      .from('admin_profiles')
      .select('id')
      .eq('user_id', session.user.id)
      .eq('is_active', true)
      .single();

    if (adminProfile) {
      return NextResponse.redirect(new URL('/dashboard', request.url));
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