import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '../../../../../lib/supabase/client';
import { syncStudentFeePayments } from '../../../../../lib/fees-service';

/**
 * POST /api/students/[id]/sync-fees
 * Triggers a server-side recalculation and synchronization of fee payments
 * for a specific student using admin privileges.
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const resolvedParams = await params;
    const studentId = resolvedParams.id;

    if (!studentId) {
      return NextResponse.json({ error: 'Student ID is required' }, { status: 400 });
    }

    // Sync student's fee payments using the central service (with admin client)
    await syncStudentFeePayments(supabaseAdmin, studentId);

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error('Error in student fees sync API:', err);
    return NextResponse.json({ error: err.message || 'Internal server error' }, { status: 500 });
  }
}
