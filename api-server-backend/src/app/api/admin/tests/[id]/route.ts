import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "../../../../../lib/supabase/client";
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
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { user: null, admin: null };
  const { data: admin } = await supabaseAdmin
    .from("admin_profiles")
    .select("id, organization_id, role")
    .eq("user_id", user.id)
    .single();
  return { user, admin };
}

type Context = { params: Promise<{ id: string }> };

/**
 * GET /api/admin/tests/[id] — Get test + all student results
 * POST /api/admin/tests/[id] — Bulk upsert test results with auto-ranking
 * DELETE /api/admin/tests/[id] — Delete test
 */
export async function GET(request: NextRequest, context: Context) {
  const { id } = await context.params;
  try {
    const { admin } = await getAdminOrg(request);
    if (!admin)
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { data: test } = await supabaseAdmin
      .from("tests")
      .select("*")
      .eq("id", id)
      .eq("organization_id", admin.organization_id)
      .single();

    if (!test)
      return NextResponse.json({ error: "Test not found" }, { status: 404 });

    const { data: results } = await supabaseAdmin
      .from("test_results")
      .select(
        `
        id, marks_obtained, rank, strong_areas, weak_topics, teacher_suggestions, improvement_plan, remarks, answer_sheet_path,
        students (id, name, roll_number, batch, classes(name))
      `,
      )
      .eq("test_id", id)
      .order("marks_obtained", { ascending: false });

    return NextResponse.json({
      success: true,
      data: { test, results: results ?? [] },
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request: NextRequest, context: Context) {
  const { id } = await context.params;
  try {
    const { admin } = await getAdminOrg(request);
    if (!admin)
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await request.json();
    const { results } = body;

    if (!results || !Array.isArray(results)) {
      return NextResponse.json(
        { error: "results array required" },
        { status: 400 },
      );
    }

    const { data: test } = await supabaseAdmin
      .from("tests")
      .select("total_marks, organization_id")
      .eq("id", id)
      .single();

    if (!test || test.organization_id !== admin.organization_id) {
      return NextResponse.json({ error: "Test not found" }, { status: 404 });
    }

    // Sort by marks descending to assign ranks
    const sorted = [...results].sort(
      (a: any, b: any) => b.marks_obtained - a.marks_obtained,
    );
    const withRanks = sorted.map((r: any, idx: number) => ({
      organization_id: admin.organization_id,
      test_id: id,
      student_id: r.student_id,
      marks_obtained: parseInt(r.marks_obtained),
      rank: idx + 1,
      weak_topics: r.weak_topics || null,
      strong_areas: r.strong_areas || null,
      teacher_suggestions: r.teacher_suggestions || null,
      improvement_plan: r.improvement_plan || null,
      remarks: r.remarks || null,
      answer_sheet_path: r.answer_sheet_path || null,
    }));

    const { data, error } = await supabaseAdmin
      .from("test_results")
      .upsert(withRanks, { onConflict: "student_id,test_id" })
      .select();

    if (error) throw error;
    return NextResponse.json({ success: true, data });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest, context: Context) {
  const { id } = await context.params;
  try {
    const { admin } = await getAdminOrg(request);
    if (!admin)
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    // First delete related results safely
    await supabaseAdmin
      .from("test_results")
      .delete()
      .eq("test_id", id)
      .eq("organization_id", admin.organization_id);

    // Delete the test itself
    const { error } = await supabaseAdmin
      .from("tests")
      .delete()
      .eq("id", id)
      .eq("organization_id", admin.organization_id);

    if (error) throw error;
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
