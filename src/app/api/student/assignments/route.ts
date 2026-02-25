import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '../../../../lib/supabase/client';
import { createServerClient, type CookieOptions } from '@supabase/ssr';

/**
 * GET /api/student/assignments
 * Returns the authenticated student's assignments and submission status.
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

        const { data: sp } = await supabaseAdmin
            .from('student_profiles')
            .select('student_id')
            .eq('user_id', user.id)
            .single();

        if (!sp) {
            return NextResponse.json({ error: 'Student profile not found' }, { status: 404 });
        }

        // Get student's class_id
        const { data: student } = await supabaseAdmin
            .from('students')
            .select('class_id')
            .eq('id', sp.student_id)
            .single();

        // Get assignments for the student's class
        let assignmentsQuery = supabaseAdmin
            .from('assignments')
            .select('id, title, subject, description, given_date, due_date, is_active, attachment_url')
            .eq('is_active', true)
            .order('due_date', { ascending: false });

        if (student?.class_id) {
            assignmentsQuery = assignmentsQuery.or(`class_id.eq.${student.class_id},class_id.is.null`);
        }

        const { data: assignments, error: aError } = await assignmentsQuery;
        if (aError) throw aError;

        // Get student's submissions
        const { data: submissions, error: sError } = await supabaseAdmin
            .from('assignment_submissions')
            .select('assignment_id, submission_status, completion_rating, submitted_at, feedback, submission_file_url, eval_file_url, marks_obtained')
            .eq('student_id', sp.student_id);

        if (sError) throw sError;

        const submissionMap = new Map<string, any>(
            (submissions ?? []).map((s: any) => [s.assignment_id, s])
        );

        // Merge
        const today = new Date().toISOString().split('T')[0];
        const enriched = (assignments ?? []).map((a: any) => {
            const submission = submissionMap.get(a.id);
            const isOverdue = a.due_date < today && !submission?.submitted_at;
            return {
                ...a,
                submission_status: submission?.submission_status ?? (isOverdue ? 'missing' : 'pending'),
                completion_rating: submission?.completion_rating ?? null,
                submitted_at: submission?.submitted_at ?? null,
                feedback: submission?.feedback ?? null,
                submission_file_url: submission?.submission_file_url ?? null,
                eval_file_url: submission?.eval_file_url ?? null,
                marks_obtained: submission?.marks_obtained ?? null,
                is_overdue: isOverdue,
            };
        });

        const pending = enriched.filter((a: any) => a.submission_status === 'pending').length;
        const submitted = enriched.filter((a: any) =>
            a.submission_status === 'submitted' || a.submission_status === 'graded').length;
        const missing = enriched.filter((a: any) => a.submission_status === 'missing').length;

        return NextResponse.json({
            success: true,
            data: {
                assignments: enriched,
                summary: { total: enriched.length, pending, submitted, missing },
            },
        });
    } catch (error: any) {
        console.error('Student assignments error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
