import { NextRequest, NextResponse } from 'next/server';
import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { syncAllStudentFeePayments } from '../../../../lib/fees-service';

// POST /api/fees/generate-monthly - Generate monthly fee entries for all active students
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

    // Get the authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Get user's organization_id
    const { data: userData, error: userError } = await supabase
      .from('admin_profiles')
      .select('*')
      .eq('user_id', user.id)
      .single();

    if (userError || !userData) {
      console.error('Error fetching user profile:', userError);
      return NextResponse.json(
        { error: 'Organization not found' },
        { status: 404 }
      );
    }

    // Sync all active student fee payments up to today using the calendar logic
    const currentDate = new Date();
    await syncAllStudentFeePayments(supabase, userData.organization_id, currentDate);

    return NextResponse.json({
      success: true,
      message: `Successfully synchronized fee entries for all active students.`,
      month: currentDate.toLocaleString('en-US', { month: 'long', year: 'numeric' })
    }, { status: 200, headers: response.headers });

  } catch (error) {
    console.error('Error in generate-monthly:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
