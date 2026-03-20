import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "../../../../../../lib/supabase/client";
import { createServerClient, type CookieOptions } from "@supabase/ssr";

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    try {
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
        if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

        const { data: sp } = await supabaseAdmin
            .from("student_profiles")
            .select("student_id, organization_id")
            .eq("user_id", user.id)
            .single();

        if (!sp) return NextResponse.json({ error: "Student profile not found" }, { status: 404 });

        const { id: assignment_id } = await params;
        const formData = await request.formData();
        const file = formData.get("submission_file") as File | null;

        if (!file || file.size === 0) {
            return NextResponse.json({ error: "No file provided" }, { status: 400 });
        }

        if (file.size > 10 * 1024 * 1024) {
            return NextResponse.json({ error: "File size must be under 10MB" }, { status: 400 });
        }

        const bytes = await file.arrayBuffer();
        const buffer = Buffer.from(bytes);
        const ext = file.name.split(".").pop() || "pdf";
        const fileName = `assignments/submissions/${sp.organization_id}/${assignment_id}/${sp.student_id}_${Date.now()}.${ext}`;

        const { error: uploadError } = await supabaseAdmin.storage
            .from("documents")
            .upload(fileName, buffer, {
                contentType: file.type || "application/pdf",
                upsert: true,
            });

        if (uploadError) {
            console.error("Submission Upload Error:", uploadError);
            return NextResponse.json({ error: "Failed to upload file to storage" }, { status: 500 });
        }

        const { data: { publicUrl } } = supabaseAdmin.storage.from("documents").getPublicUrl(fileName);

        // Update or insert into assignment_submissions
        const { error: dbError } = await supabaseAdmin
            .from("assignment_submissions")
            .upsert({
                organization_id: sp.organization_id,
                student_id: sp.student_id,
                assignment_id: assignment_id,
                submission_status: "submitted",
                submission_file_url: publicUrl,
                submitted_at: new Date().toISOString(),
            }, {
                onConflict: 'student_id, assignment_id'
            });

        if (dbError) {
            // Check if column is missing, etc.
            if (dbError.code === '42703') {
                throw new Error("Missing column submission_file_url. Please run the SQL migration.");
            }
            throw dbError;
        }

        return NextResponse.json({ success: true, url: publicUrl });

    } catch (e: any) {
        console.error("Student upload assignment error:", e);
        return NextResponse.json({ error: e.message }, { status: 500 });
    }
}
