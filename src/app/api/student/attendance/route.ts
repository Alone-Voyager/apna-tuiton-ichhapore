import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '../../../../lib/supabase/client';
import { createServerClient, type CookieOptions } from '@supabase/ssr';

/**
 * GET /api/student/attendance
 * Returns the authenticated student's attendance records.
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

        // Try student_profiles first, then fall back to students table
        let studentId: string | null = null;
        const { data: sp } = await supabaseAdmin
            .from('student_profiles')
            .select('student_id')
            .eq('user_id', user.id)
            .single();

        if (sp?.student_id) {
            studentId = sp.student_id;
        } else {
            const { data: studentRecord } = await supabaseAdmin
                .from('students')
                .select('id')
                .eq('user_id', user.id)
                .single();
            if (studentRecord?.id) studentId = studentRecord.id;
        }

        if (!studentId) {
            return NextResponse.json({ error: 'Student profile not found' }, { status: 404 });
        }

        const { searchParams } = new URL(request.url);
        const month = searchParams.get('month'); // e.g., '2024-10'

        let query = supabaseAdmin
            .from('attendance')
            .select('id, attendance_date, status, check_in_time, notes')
            .eq('student_id', studentId)
            .order('attendance_date', { ascending: false });

        if (month) {
            const startDate = `${month}-01`;
            const endDate = new Date(parseInt(month.split('-')[0]), parseInt(month.split('-')[1]), 0)
                .toISOString().split('T')[0];
            query = query.gte('attendance_date', startDate).lte('attendance_date', endDate);
        }

        const { data: records, error } = await query;
        if (error) throw error;

        // Calculate summary stats
        const total = records?.length ?? 0;
        const present = records?.filter((r: any) => r.status === 'Present').length ?? 0;
        const absent = records?.filter((r: any) => r.status === 'Absent').length ?? 0;
        const late = records?.filter((r: any) => r.status === 'Late').length ?? 0;
        const leave = records?.filter((r: any) => r.status === 'Leave' || r.status === 'Half Day').length ?? 0;
        const percentage = total > 0 ? Math.round((present / total) * 100) : 0;

        return NextResponse.json({
            success: true,
            data: {
                records: records ?? [],
                summary: { total, present, absent, late, leave, percentage },
            },
        });
    } catch (error: any) {
        console.error('Student attendance error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
