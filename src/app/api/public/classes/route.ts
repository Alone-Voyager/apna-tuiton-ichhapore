import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '../../../../lib/supabase/client';

export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const orgId = searchParams.get('org_id');

        if (!orgId) return NextResponse.json({ error: 'org_id is required' }, { status: 400 });

        const { data, error } = await supabaseAdmin
            .from('classes')
            .select('id, name')
            .eq('organization_id', orgId)
            .eq('is_active', true)
            .order('name');

        if (error) throw error;
        return NextResponse.json({ success: true, data });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
