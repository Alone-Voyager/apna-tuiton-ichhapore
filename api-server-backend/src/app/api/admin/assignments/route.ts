import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '../../../../lib/supabase/client';
import { createServerClient, type CookieOptions } from '@supabase/ssr';

async function getAdminOrg(request: NextRequest) {
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
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { user: null, admin: null };

    // Use supabaseAdmin (service role) to bypass RLS
    const { data: admin } = await supabaseAdmin
        .from('admin_profiles')
        .select('id, organization_id, role')
        .eq('user_id', user.id)
        .eq('is_active', true)
        .single();

    return { user, admin };
}

/**
 * GET /api/admin/assignments — List all assignments for admin's org
 * POST /api/admin/assignments — Create a new assignment
 */
export async function GET(request: NextRequest) {
    try {
        const { admin } = await getAdminOrg(request);
        if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        const { searchParams } = new URL(request.url);
        const classId = searchParams.get('class_id');

        let query = supabaseAdmin
            .from('assignments')
            .select(`
        id, title, subject, description, given_date, due_date, is_active, class_id,
        classes (id, name),
        assignment_submissions (id, submission_status, student_id)
      `)
            .eq('organization_id', admin.organization_id)
            .order('due_date', { ascending: false });

        if (classId) query = query.eq('class_id', classId);

        const { data, error } = await query;
        if (error) throw error;

        const today = new Date().toISOString().split('T')[0];

        // Enrich with submission stats
        const enriched = (data ?? []).map((a: any) => {
            const isOverdue = a.due_date < today;
            const submissions = (a.assignment_submissions ?? []).map((s: any) => {
                if (s.submission_status === 'pending' && isOverdue) {
                    return { ...s, submission_status: 'missing' };
                }
                return s;
            });

            const submitted = submissions.filter((s: any) =>
                s.submission_status === 'submitted' || s.submission_status === 'graded' || s.submission_status === 'reviewed').length;
            const pending = submissions.filter((s: any) => s.submission_status === 'pending').length;
            const missing_count = submissions.filter((s: any) => s.submission_status === 'missing').length;
            return { ...a, stats: { total: submissions.length, submitted, pending, missing: missing_count } };
        });

        return NextResponse.json({ success: true, data: enriched });
    } catch (error: any) {
        console.error('GET /api/admin/assignments error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

export async function POST(request: NextRequest) {
    try {
        const { admin } = await getAdminOrg(request);
        if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        const formData = await request.formData();
        const title = formData.get("title") as string;
        const subject = formData.get("subject") as string;
        const description = formData.get("description") as string;
        const given_date = formData.get("given_date") as string;
        const due_date = formData.get("due_date") as string;
        const class_id = formData.get("class_id") as string;
        const batch = formData.get("batch") as string;
        const file = formData.get("attachment") as File | null;

        if (!title || !subject || !due_date) {
            return NextResponse.json({ error: 'Missing required fields: title, subject, due_date' }, { status: 400 });
        }

        let attachment_url = null;
        if (file && file.size > 0) {
            if (file.size > 10 * 1024 * 1024) {
                return NextResponse.json({ error: "File size must be under 10MB" }, { status: 400 });
            }

            const bytes = await file.arrayBuffer();
            const buffer = Buffer.from(bytes);

            const ext = file.name.split(".").pop() || "pdf";
            const fileName = `assignments/${admin.organization_id}/${Date.now()}_${Math.random().toString(36).substring(7)}.${ext}`;

            const { error: uploadError } = await supabaseAdmin.storage
                .from("documents")
                .upload(fileName, buffer, {
                    contentType: file.type || "application/pdf",
                    upsert: false,
                });

            if (uploadError) {
                console.error("File upload error:", uploadError);
                return NextResponse.json({ error: "Failed to upload assignment file" }, { status: 500 });
            }

            const { data: { publicUrl } } = supabaseAdmin.storage.from("documents").getPublicUrl(fileName);
            attachment_url = publicUrl;
        }

        const { data: assignmentData, error } = await supabaseAdmin
            .from('assignments')
            .insert({
                organization_id: admin.organization_id,
                title,
                subject,
                description: description || null,
                batch: batch || null,
                given_date: given_date || new Date().toISOString().split('T')[0],
                due_date,
                class_id: class_id || null,
                created_by: admin.id,
                is_active: true,
                attachment_url,
            })
            .select()
            .single();

        if (error) throw error;

        // Automatically assign students based on class and batch
        if (class_id || batch) {
            let studentsQuery = supabaseAdmin
                .from('students')
                .select('id')
                .eq('organization_id', admin.organization_id);

            if (class_id) studentsQuery = studentsQuery.eq('class_id', class_id);
            if (batch) studentsQuery = studentsQuery.eq('batch', batch);

            const { data: students } = await studentsQuery;

            if (students && students.length > 0) {
                const submissions = students.map((s: any) => ({
                    organization_id: admin.organization_id,
                    student_id: s.id,
                    assignment_id: assignmentData.id,
                    submission_status: 'pending'
                }));
                await supabaseAdmin.from('assignment_submissions').insert(submissions);
            }
        }

        return NextResponse.json({ success: true, data: assignmentData }, { status: 201 });
    } catch (error: any) {
        console.error('POST /api/admin/assignments error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
