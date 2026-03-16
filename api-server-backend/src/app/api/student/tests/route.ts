import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "../../../../lib/supabase/client";
import { createServerClient, type CookieOptions } from "@supabase/ssr";

/**
 * GET /api/student/tests
 * Returns the authenticated student's test results with computed rank and improvement.
 */
export async function GET(request: NextRequest) {
  try {
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
      error: authError,
    } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Try student_profiles first
    let studentId: string | null = null;

    const { data: sp } = await supabaseAdmin
      .from("student_profiles")
      .select("student_id")
      .eq("user_id", user.id)
      .single();

    if (sp?.student_id) {
      studentId = sp.student_id;
    } else {
      // Fallback: look up student directly by user_id in the students table
      const { data: studentRecord } = await supabaseAdmin
        .from("students")
        .select("id")
        .eq("user_id", user.id)
        .single();

      if (studentRecord?.id) {
        studentId = studentRecord.id;
      }
    }

    if (!studentId) {
      return NextResponse.json(
        { error: "Student profile not found" },
        { status: 404 },
      );
    }

    // Get student's test results with test details
    const { data: results, error } = await supabaseAdmin
      .from("test_results")
      .select(
        `
        id, marks_obtained, rank, weak_topics, strong_areas, teacher_suggestions, improvement_plan, remarks, answer_sheet_path,
        tests (id, test_name, type, total_marks, subject, test_date, class_id, paper_path)
      `,
      )
      .eq("student_id", studentId)
      .order("id", { ascending: false });

    if (error) throw error;

    // Calculate improvement over previous test per subject
    const withImprovement = await Promise.all(
      (results ?? []).map(async (r: any, idx: number, arr: any[]) => {
        const subject = r.tests?.subject;
        const prevResult = arr
          .slice(idx + 1)
          .find((pr: any) => pr.tests?.subject === subject);
        let improvement = null;
        if (
          prevResult &&
          r.tests?.total_marks &&
          prevResult.tests?.total_marks
        ) {
          const currPct = (r.marks_obtained / r.tests.total_marks) * 100;
          const prevPct =
            (prevResult.marks_obtained / prevResult.tests.total_marks) * 100;
          improvement = Math.round((currPct - prevPct) * 10) / 10;
        }
        const percentage = r.tests?.total_marks
          ? Math.round((r.marks_obtained / r.tests.total_marks) * 100 * 10) / 10
          : 0;

        let paper_url = null;
        if (r.tests?.paper_path) {
          const { data } = await supabaseAdmin.storage
            .from("test_papers")
            .createSignedUrl(r.tests.paper_path, 3600 * 24 * 7);
          paper_url = data?.signedUrl || null;
        }

        return { ...r, percentage, improvement, paper_url };
      }),
    );

    // Summary
    const avgPercentage =
      withImprovement.length > 0
        ? Math.round(
          (withImprovement.reduce(
            (s: number, r: any) => s + r.percentage,
            0,
          ) /
            withImprovement.length) *
          10,
        ) / 10
        : 0;

    const bestRank = results?.reduce((best: number | null, r: any) => {
      if (r.rank === null) return best;
      return best === null ? r.rank : Math.min(best, r.rank);
    }, null);

    return NextResponse.json({
      success: true,
      data: {
        results: withImprovement,
        summary: {
          avgPercentage,
          bestRank,
          totalTests: withImprovement.length,
        },
      },
    });
  } catch (error: any) {
    console.error("Student tests error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
