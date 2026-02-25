import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '../../../../lib/supabase/client';

export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const classId = searchParams.get('class_id');

        if (!classId) return NextResponse.json({ error: 'class_id is required' }, { status: 400 });

        const { data, error } = await supabaseAdmin
            .from('batches')
            .select('id, name')
            .eq('class_id', classId)
            .order('name');

        if (error) throw error;
        return NextResponse.json({ success: true, data });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
