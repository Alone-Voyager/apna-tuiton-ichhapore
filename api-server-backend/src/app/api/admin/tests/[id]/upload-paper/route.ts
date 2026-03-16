import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "../../../../../../lib/supabase/client";

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    const { id: testId } = await params;

    try {
        const formData = await request.formData();
        const file = formData.get("test_paper") as File;

        if (!file) {
            return NextResponse.json({ error: "No file provided" }, { status: 400 });
        }

        if (file.size > 10 * 1024 * 1024) {
            return NextResponse.json({ error: "File too large (max 10MB)" }, { status: 400 });
        }

        if (file.type !== "application/pdf") {
            return NextResponse.json({ error: "Only PDF files are allowed" }, { status: 400 });
        }

        const bytes = await file.arrayBuffer();
        const buffer = Buffer.from(bytes);

        const fileName = `${testId}/question_paper_${Date.now()}.pdf`;

        const { error: uploadError } = await supabaseAdmin.storage
            .from("test_papers")
            .upload(fileName, buffer, { contentType: "application/pdf", upsert: true });

        if (uploadError) {
            console.error("Upload Error:", uploadError);
            return NextResponse.json({ error: "Failed to upload file to storage" }, { status: 500 });
        }

        const { data: { publicUrl } } = supabaseAdmin.storage.from("test_papers").getPublicUrl(fileName);

        const { error: updateError } = await supabaseAdmin
            .from("tests")
            .update({ paper_path: publicUrl })
            .eq("id", testId);

        if (updateError) {
            return NextResponse.json({ error: "Failed to update record with uploaded file" }, { status: 500 });
        }

        return NextResponse.json({ success: true, url: publicUrl });

    } catch (e: any) {
        return NextResponse.json({ error: e.message }, { status: 500 });
    }
}
