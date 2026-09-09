import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { SUPABASE_URL, SUPABASE_ANON_KEY } from './lib/supabase/config';

export async function proxy(request: NextRequest) {
  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  });

  const supabase = createServerClient(
    SUPABASE_URL,
    SUPABASE_ANON_KEY,
    {
      cookies: {
        get(name: string) {
          return request.cookies.get(name)?.value;
        },
        set(name: string, value: string, options: CookieOptions) {
          request.cookies.set({ name, value, ...options });
          response = NextResponse.next({ request: { headers: request.headers } });
          response.cookies.set({ name, value, ...options });
        },
        remove(name: string, options: CookieOptions) {
          request.cookies.set({ name, value: '', ...options });
          response = NextResponse.next({ request: { headers: request.headers } });
          response.cookies.set({ name, value: '', ...options });
        },
      },
    }
  );

  // Secure server-side auth check
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
    try {
      const { data: studentProfile } = await supabase
        .from('student_profiles')
        .select('id')
        .eq('user_id', user.id)
        .maybeSingle();

      if (studentProfile) {
        return NextResponse.redirect(new URL('/student/dashboard', request.url));
      }
    } catch {
      // Ignore errors — fall through to admin dashboard
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
        .maybeSingle();

      if (studentProfile) {
        return NextResponse.redirect(new URL('/student/dashboard', request.url));
      }
    } catch {
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
    } catch {
      // Ignore — allow access
    }
  }

  return response;
}

// Configure which routes use this middleware.
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
