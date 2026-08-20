import { NextRequest, NextResponse } from 'next/server';
import { createServerClient, type CookieOptions } from '@supabase/ssr';

export async function POST(request: NextRequest) {
  try {
    const response = NextResponse.json({ success: true });

    const supabase = createServerClient(
      'https://cgbwcayquqpgbnyxnyzw.supabase.co',
      'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNnYndjYXlxdXFwZ2JueXhueXp3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjIwNTkzNTgsImV4cCI6MjA3NzYzNTM1OH0._KmePMak2LvDcnCe8M8_70NeZmyTfp7iw69gw6acoNg',
      {
        cookies: {
          get(name: string) {
            return request.cookies.get(name)?.value;
          },
          set(name: string, value: string, options: CookieOptions) {
            response.cookies.set({
              name,
              value,
              ...options,
            });
          },
          remove(name: string, options: CookieOptions) {
            response.cookies.set({
              name,
              value: '',
              ...options,
            });
          },
        },
      }
    );

    await supabase.auth.signOut();

    return response;
  } catch (error: any) {
    console.error('Logout error:', error);
    return NextResponse.json(
      { error: error.message || 'An unexpected error occurred' },
      { status: 500 }
    );
  }
}
