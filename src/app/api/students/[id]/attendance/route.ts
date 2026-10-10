import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '../../../../../lib/supabase/client';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: studentId } = await params;
    if (!studentId) {
      return NextResponse.json({ error: 'Student ID is required' }, { status: 400 });
    }

    const { searchParams } = new URL(request.url);
    const from = searchParams.get('from');
    const to = searchParams.get('to');

    let query = supabaseAdmin
      .from('attendance')
      .select('attendance_date, status')
      .eq('student_id', studentId)
      .order('attendance_date', { ascending: true });

    if (from) {
      query = query.gte('attendance_date', from);
    }
    if (to) {
      query = query.lte('attendance_date', to);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching attendance for student:', error);
      return NextResponse.json({ error: 'Failed to fetch attendance' }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      data: data || [],
    });
  } catch (err: any) {
    console.error('Attendance route exception:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
