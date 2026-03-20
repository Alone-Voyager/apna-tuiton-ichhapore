import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '../../../../lib/supabase/client';
import { createServerClient, type CookieOptions } from '@supabase/ssr';

/**
 * GET /api/student/fees
 * Returns the authenticated student's fee payment records.
 */
export async function GET(request: NextRequest) {
    try {
        const response = NextResponse.next();
        const supabase = createServerClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
            {
                cookies: {
                    get(name: string) { return request.cookies.get(name)?.value; },
                    set(name: string, value: string, options: CookieOptions) { response.cookies.set({ name, value, ...options }); },
                    remove(name: string, options: CookieOptions) { response.cookies.set({ name, value: '', ...options }); },
                },
            }
        );

        const { data: { user }, error: authError } = await supabase.auth.getUser();
        if (authError || !user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        // Try student_profiles first, then fall back to students table
        let studentId: string | null = null;
        const { data: sp } = await supabaseAdmin
            .from('student_profiles')
            .select('student_id')
            .eq('user_id', user.id)
            .single();

        if (sp?.student_id) {
            studentId = sp.student_id;
        } else {
            const { data: studentRecord } = await supabaseAdmin
                .from('students')
                .select('id')
                .eq('user_id', user.id)
                .single();
            if (studentRecord?.id) studentId = studentRecord.id;
        }

        if (!studentId) {
            return NextResponse.json({ error: 'Student profile not found' }, { status: 404 });
        }

        const { data: fees, error } = await supabaseAdmin
            .from('fee_payments')
            .select('id, amount, payment_month, payment_date, due_date, payment_method, receipt_number, status, paid_amount, discount, late_fee, notes')
            .eq('student_id', studentId)
            .order('due_date', { ascending: false });

        if (error) throw error;

        // Summary
        const totalPaid = fees?.filter((f: any) => f.status?.toLowerCase() === 'paid').reduce((s: number, f: any) => s + (Number(f.paid_amount) || Number(f.amount) || 0), 0) ?? 0;
        const totalPending = fees?.filter((f: any) => ['pending', 'partial'].includes(f.status?.toLowerCase())).reduce((s: number, f: any) => s + (Number(f.amount) || 0) - (Number(f.paid_amount) || 0), 0) ?? 0;
        const totalOverdue = fees?.filter((f: any) => f.status?.toLowerCase() === 'overdue').reduce((s: number, f: any) => s + (Number(f.amount) || 0) - (Number(f.paid_amount) || 0), 0) ?? 0;

        return NextResponse.json({
            success: true,
            data: {
                fees: fees ?? [],
                summary: { totalPaid, totalPending, totalOverdue },
            },
        });
    } catch (error: any) {
        console.error('Student fees error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
