import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '../../../../lib/supabase/client';
import { createServerClient, type CookieOptions } from '@supabase/ssr';

/**
 * GET /api/student/profile
 * Returns the authenticated student's profile and linked student record.
 */
export async function GET(request: NextRequest) {
    try {
        const response = NextResponse.next();
        const supabase = createServerClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
            {
                cookies: {
                    get(name: string) { return request.cookies.get(name)?.value; },
                    set(name: string, value: string, options: CookieOptions) { response.cookies.set({ name, value, ...options }); },
                    remove(name: string, options: CookieOptions) { response.cookies.set({ name, value: '', ...options }); },
                },
            }
        );

        const { data: { user }, error: authError } = await supabase.auth.getUser();
        if (authError || !user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        // Try student_profiles first (for rich profile data)
        const { data: studentProfile, error } = await supabaseAdmin
            .from('student_profiles')
            .select(`
        *,
        students (
          id, name, roll_number, batch, email, phone, gender, date_of_birth,
          parent_name, address, monthly_fee, attendance_rate, status, admission_date, notes, whatsapp,
          classes (id, name),
          organizations (id, name)
        )
      `)
            .eq('user_id', user.id)
            .eq('is_active', true)
            .single();

        if (!error && studentProfile) {
            return NextResponse.json({ success: true, data: studentProfile });
        }

        // Fallback: look up student directly by user_id in students table
        const { data: studentDirect, error: studentErr } = await supabaseAdmin
            .from('students')
            .select(`
          id, name, roll_number, batch, email, phone, gender, date_of_birth,
          parent_name, address, monthly_fee, attendance_rate, status, admission_date, notes, whatsapp, user_id,
          classes (id, name),
          organizations (id, name)
        `)
            .eq('user_id', user.id)
            .single();

        if (studentErr || !studentDirect) {
            return NextResponse.json({ error: 'Student profile not found' }, { status: 404 });
        }

        // Wrap in a compatible shape so the frontend works the same way
        return NextResponse.json({
            success: true,
            data: {
                user_id: user.id,
                student_id: studentDirect.id,
                is_active: true,
                students: studentDirect,
            }
        });
    } catch (error: any) {
        console.error('Student profile error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
