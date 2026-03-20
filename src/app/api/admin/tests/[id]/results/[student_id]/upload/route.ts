import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "../../../../../../../../lib/supabase/client";

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string; student_id: string }> }) {
    const { id: testId, student_id: studentId } = await params;

    try {
        const formData = await request.formData();
        const file = formData.get("answer_sheet") as File;

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

        const fileName = `${testId}/answer_sheets/${studentId}_${Date.now()}.pdf`;

        const { error: uploadError } = await supabaseAdmin.storage
            .from("test_papers")
            .upload(fileName, buffer, { contentType: "application/pdf", upsert: true });

        if (uploadError) {
            console.error("Upload Error:", uploadError);
            return NextResponse.json({ error: "Failed to upload file to storage: " + uploadError.message }, { status: 500 });
        }

        const { data: { publicUrl } } = supabaseAdmin.storage.from("test_papers").getPublicUrl(fileName);

        // Update the test_results table
        const { error: updateError } = await supabaseAdmin
            .from("test_results")
            .update({ answer_sheet_path: publicUrl })
            .eq("test_id", testId)
            .eq("student_id", studentId);

        if (updateError) {
            return NextResponse.json({ error: "Failed to update record with uploaded file" }, { status: 500 });
        }

        return NextResponse.json({ success: true, url: publicUrl });

    } catch (e: any) {
        return NextResponse.json({ error: e.message }, { status: 500 });
    }
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string; student_id: string }> }) {
    const { id: testId, student_id: studentId } = await params;

    try {
        // Find existing record
        const { data: resultData } = await supabaseAdmin
            .from("test_results")
            .select("answer_sheet_path")
            .eq("test_id", testId)
            .eq("student_id", studentId)
            .single();

        if (resultData && resultData.answer_sheet_path) {
            // Extract the simple filename path from the URL to delete from storage
            // Example URL: https://xyz.supabase.co/storage/v1/object/public/test_papers/test_id/answer_sheets/name.pdf
            const urlParts = resultData.answer_sheet_path.split("/public/test_papers/");
            const storagePath = urlParts.length > 1 ? urlParts[1] : null;

            if (storagePath) {
                await supabaseAdmin.storage.from("test_papers").remove([storagePath]);
            }
        }

        // Clear in database
        const { error: updateError } = await supabaseAdmin
            .from("test_results")
            .update({ answer_sheet_path: null })
            .eq("test_id", testId)
            .eq("student_id", studentId);

        if (updateError) {
            return NextResponse.json({ error: updateError.message }, { status: 500 });
        }

        return NextResponse.json({ success: true });

    } catch (e: any) {
        return NextResponse.json({ error: e.message }, { status: 500 });
    }
}
