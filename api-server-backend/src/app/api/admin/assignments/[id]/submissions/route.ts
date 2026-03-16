import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "../../../../../../lib/supabase/client";
import { createServerClient, type CookieOptions } from "@supabase/ssr";

async function getAdminOrg(request: NextRequest) {
    const response = NextResponse.next();
    const supabase = createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
            cookies: {
                get(name: string) { return request.cookies.get(name)?.value; },
                set(name: string, value: string, options: CookieOptions) { response.cookies.set({ name, value, ...options }); },
                remove(name: string, options: CookieOptions) { response.cookies.set({ name, value: "", ...options }); },
            },
        }
    );
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { user: null, admin: null };

    const { data: admin } = await supabaseAdmin
        .from("admin_profiles")
        .select("id, organization_id, role")
        .eq("user_id", user.id)
        .eq("is_active", true)
        .single();

    return { user, admin };
}

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    try {
        const { admin } = await getAdminOrg(request);
        if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

        const { id: assignment_id } = await params;

        const { data, error } = await supabaseAdmin
            .from("assignment_submissions")
            .select(`
                id, student_id, submission_status, submitted_at, feedback, marks_obtained, submission_file_url,
                students (id, name, roll_number, batch)
            `)
            .eq("assignment_id", assignment_id)
            .eq("organization_id", admin.organization_id);

        if (error) throw error;
        return NextResponse.json({ success: true, data });
    } catch (e: any) {
        console.error('GET submissions error:', e);
        return NextResponse.json({ error: e.message }, { status: 500 });
    }
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    try {
        const { admin } = await getAdminOrg(request);
        if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        const { id: assignment_id } = await params;

        const formData = await request.formData();
        const student_id = formData.get("student_id") as string;
        const submission_status = formData.get("submission_status") as string;
        const feedback = formData.get("feedback") as string;
        const marks_obtainedStr = formData.get("marks_obtained") as string;
        const marks_obtained = marks_obtainedStr ? parseInt(marks_obtainedStr) : null;
        const file = formData.get("eval_file") as File | null;

        if (!student_id) {
            return NextResponse.json({ error: "student_id is required" }, { status: 400 });
        }

        let updateData: any = {
            submission_status: submission_status || 'pending',
            feedback: feedback || null,
            marks_obtained: marks_obtained,
        };

        // File upload if present (e.g. teacher's corrected answer sheet)
        if (file && file.size > 0) {
            const bytes = await file.arrayBuffer();
            const buffer = Buffer.from(bytes);
            const ext = file.name.split(".").pop() || "pdf";
            const fileName = `assignments/evals/${admin.organization_id}/${assignment_id}/${student_id}_${Date.now()}.${ext}`;

            const { error: uploadError } = await supabaseAdmin.storage
                .from("documents")
                .upload(fileName, buffer, {
                    contentType: file.type || "application/pdf",
                    upsert: true,
                });

            if (uploadError) {
                console.error("Evaluation Upload Error:", uploadError);
                return NextResponse.json({ error: "Failed to upload evaluation file: " + uploadError.message }, { status: 500 });
            }

            const { data: { publicUrl } } = supabaseAdmin.storage.from("documents").getPublicUrl(fileName);
            // Reusing submission_file_url for admin evaluations or creating a new column? The prompt says "optionally upload corrected answer sheets or feedback files per student"
            // Wait, we need another column for admin Evaluation if student uploads their own.
            // But if we just overwrite submission_file_url it'll destroy the student's submission.
            // Oh right, we can just use `feedback` text for now unless we add an `evaluation_file_url`.
            // Let's create `evaluation_file_url` silently using SQL. Or just add another column.

            // For now let's just use `eval_file_url` on assignment_submissions via supabaseAdmin safely mapped
            updateData.eval_file_url = publicUrl;
        }

        const { data, error } = await supabaseAdmin
            .from("assignment_submissions")
            .update(updateData)
            .eq("assignment_id", assignment_id)
            .eq("student_id", student_id)
            .eq("organization_id", admin.organization_id)
            .select()
            .single();

        if (error) {
            // Let's catch if the column doesn't exist yet and handle gracefully
            if (error.code === '42703' && updateData.eval_file_url) {
                // Try to automatically add it via raw SQL if possible or just ignore adding eval_url. Since it's service role it can't alter table without raw postgres connection
                // We will run ALTER TABLE via migration query.
                throw new Error("Missing column eval_file_url. Please run the SQL migration.");
            }
            throw error;
        }

        return NextResponse.json({ success: true, data });
    } catch (error: any) {
        console.error('POST submissions error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
