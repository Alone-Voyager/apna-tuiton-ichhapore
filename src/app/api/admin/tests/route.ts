import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "../../../../lib/supabase/client";
import { createServerClient, type CookieOptions } from "@supabase/ssr";

async function getAdminOrg(request: NextRequest) {
  const response = NextResponse.next();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return request.cookies.get(name)?.value;
        },
        set(name: string, value: string, options: CookieOptions) {
          response.cookies.set({ name, value, ...options });
        },
        remove(name: string, options: CookieOptions) {
          response.cookies.set({ name, value: "", ...options });
        },
      },
    },
  );
  // Use anon client just to verify the session/user identity
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { user: null, admin: null };

  // Use supabaseAdmin (service role) to bypass RLS and read admin_profiles
  const { data: admin } = await supabaseAdmin
    .from("admin_profiles")
    .select("id, organization_id, role")
    .eq("user_id", user.id)
    .eq("is_active", true)
    .single();

  return { user, admin };
}

/**
 * GET /api/admin/tests — List all tests for admin's org
 * POST /api/admin/tests — Create a new test
 */
export async function GET(request: NextRequest) {
  try {
    const { admin } = await getAdminOrg(request);
    if (!admin)
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { searchParams } = new URL(request.url);
    const classId = searchParams.get("class_id");
    const type = searchParams.get("type");

    // Note: do NOT join admin_profiles here — it doesn't have a column we need
    // and the foreign key join syntax can fail if schema doesn't match exactly
    let query = supabaseAdmin
      .from("tests")
      .select(
        `
        id, test_name, type, total_marks, subject, test_date, class_id,
        classes (id, name),
        test_results (id, marks_obtained, rank, student_id)
      `,
      )
      .eq("organization_id", admin.organization_id)
      .order("test_date", { ascending: false });

    if (classId) query = query.eq("class_id", classId);
    if (type) query = query.eq("type", type);

    const { data, error } = await query;
    if (error) throw error;

    return NextResponse.json({ success: true, data: data ?? [] });
  } catch (error: any) {
    console.error("GET /api/admin/tests error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const { admin } = await getAdminOrg(request);
    if (!admin)
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const formData = await request.formData();
    const test_name = formData.get("test_name") as string;
    const type = formData.get("type") as string;
    const total_marks = formData.get("total_marks") as string;
    const subject = formData.get("subject") as string;
    const test_date = formData.get("test_date") as string;
    const class_id = formData.get("class_id") as string;
    const file = formData.get("test_paper") as File | null;

    if (!test_name || !type || !total_marks || !subject || !test_date) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 },
      );
    }

    let paper_path = null;

    if (file && file.size > 0) {
      // Validate it's a PDF
      if (file.type !== "application/pdf") {
        return NextResponse.json(
          { error: "Only PDF files are allowed" },
          { status: 400 },
        );
      }
      if (file.size > 5 * 1024 * 1024) {
        // 5MB limit
        return NextResponse.json(
          { error: "File size must be under 5MB" },
          { status: 400 },
        );
      }

      const bytes = await file.arrayBuffer();
      const buffer = Buffer.from(bytes);

      // Generate unique path
      const ext = file.name.split(".").pop() || "pdf";
      const fileName = `test_${Date.now()}_${Math.random().toString(36).substring(7)}.${ext}`;
      const filePath = `${admin.organization_id}/${fileName}`;

      const { error: uploadError } = await supabaseAdmin.storage
        .from("test_papers")
        .upload(filePath, buffer, {
          contentType: "application/pdf",
          upsert: false,
        });

      if (uploadError) {
        console.error("File upload error:", uploadError);
        return NextResponse.json(
          { error: "Failed to upload test paper PDF" },
          { status: 500 },
        );
      }

      paper_path = filePath;
    }

    const { data, error } = await supabaseAdmin
      .from("tests")
      .insert({
        organization_id: admin.organization_id,
        test_name,
        type,
        total_marks: parseInt(total_marks),
        subject,
        test_date,
        class_id: class_id || null,
        created_by: admin.id,
        paper_path,
      })
      .select()
      .single();

    if (error) throw error;
    return NextResponse.json({ success: true, data }, { status: 201 });
  } catch (error: any) {
    console.error("POST /api/admin/tests error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
