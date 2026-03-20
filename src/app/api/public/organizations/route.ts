import { NextResponse } from 'next/server';
import { supabaseAdmin } from '../../../../lib/supabase/client';

export async function GET() {
    try {
        const { data, error } = await supabaseAdmin
            .from('organizations')
            .select('id, name')
            .eq('is_active', true)
            .order('name');

        if (error) throw error;
        return NextResponse.json({ success: true, data });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
