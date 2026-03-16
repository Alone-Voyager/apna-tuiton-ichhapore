import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "../../../../../../lib/supabase/client";
import { createServerClient, type CookieOptions } from "@supabase/ssr";

export async function GET(request: NextRequest, context: { params: Promise<{ id: string }> }) {
    const { id: testId } = await context.params;

    try {
        const response = NextResponse.next();
        const supabase = createServerClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
            cookies: {
                get(name: string) { return request.cookies.get(name)?.value; },
                set(name: string, value: string, options: CookieOptions) { response.cookies.set({ name, value, ...options }); },
                remove(name: string, options: CookieOptions) { response.cookies.set({ name, value: "", ...options }); },
            },
        });
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        const { data: admin } = await supabaseAdmin.from("admin_profiles").select("id, organization_id").eq("user_id", user.id).single();
        if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

        // Get test info
        const { data: currentTest } = await supabaseAdmin.from("tests").select("subject, class_id, test_date").eq("id", testId).single();
        if (!currentTest) return NextResponse.json({});

        // Get all previous tests for this class and subject before this test date
        const { data: previousTests } = await supabaseAdmin
            .from("tests")
            .select("id, total_marks")
            .eq("class_id", currentTest.class_id)
            .eq("subject", currentTest.subject)
            .lt("test_date", currentTest.test_date)
            .order("test_date", { ascending: false })
            .limit(1);

        if (!previousTests || previousTests.length === 0) {
            return NextResponse.json({ success: true, improvements: {} });
        }

        const prevTestId = previousTests[0].id;
        const prevTotalMarks = previousTests[0].total_marks;

        const { data: prevResults } = await supabaseAdmin
            .from("test_results")
            .select("student_id, marks_obtained")
            .eq("test_id", prevTestId);

        const improvements: Record<string, number> = {};
        if (prevResults) {
            prevResults.forEach((r: any) => {
                improvements[r.student_id] = (r.marks_obtained / prevTotalMarks) * 100;
            });
        }

        return NextResponse.json({ success: true, improvements, previousTestId: prevTestId });
    } catch (e: any) {
        return NextResponse.json({ error: e.message }, { status: 500 });
    }
}
