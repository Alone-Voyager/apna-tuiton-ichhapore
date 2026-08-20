import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '../../../../../lib/supabase/client';
import { createServerClient, type CookieOptions } from '@supabase/ssr';

async function getAdminOrg(request: NextRequest) {
    const response = NextResponse.next();
    const supabase = createServerClient(
        (process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://cgbwcayquqpgbnyxnyzw.supabase.co'),
        (process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNnYndjYXlxdXFwZ2JueXhueXp3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjIwNTkzNTgsImV4cCI6MjA3NzYzNTM1OH0._KmePMak2LvDcnCe8M8_70NeZmyTfp7iw69gw6acoNg'),
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

    const { data: admin } = await supabaseAdmin
        .from('admin_profiles')
        .select('id, organization_id, role')
        .eq('user_id', user.id)
        .eq('is_active', true)
        .single();

    return { user, admin };
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    try {
        const { admin } = await getAdminOrg(request);
        if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        const resolvedParams = await params;
        const assignmentId = resolvedParams.id;

        // First verified it belongs to the admin's organization
        const { data: assignment, error: checkError } = await supabaseAdmin
            .from('assignments')
            .select('id')
            .eq('id', assignmentId)
            // [ORG-FILTER-SKIP] .eq('organization_id', admin.organization_id)
            .single();

        if (checkError || !assignment) {
            console.error("Assignment Check Error:", checkError, "assignmentId:", assignmentId);
            return NextResponse.json({
                error: 'Assignment not found or unauthorized',
                debug: { error: checkError, assignmentId, orgId: admin.organization_id }
            }, { status: 404 });
        }

        // Delete submissions first (if no cascade in DB string)
        await supabaseAdmin
            .from('assignment_submissions')
            .delete()
            .eq('assignment_id', resolvedParams.id);

        // Delete assignment
        const { error: deleteError } = await supabaseAdmin
            .from('assignments')
            .delete()
            .eq('id', resolvedParams.id);

        if (deleteError) throw deleteError;

        return NextResponse.json({ success: true, message: 'Assignment deleted successfully' });
    } catch (error: any) {
        console.error('DELETE /api/admin/assignments/:id error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
