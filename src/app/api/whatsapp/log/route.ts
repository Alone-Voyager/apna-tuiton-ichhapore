import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// POST /api/whatsapp/log - Log WhatsApp message to activity_logs
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      organizationId,
      phoneNumber,
      messageType,
      messageText,
      relatedStudentId,
      status,
      wassenderMessageId,
      errorMessage,
    } = body;

    // Use service role key to bypass RLS for logging
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY!
    );

    const { error } = await supabase
      .from('activity_logs')
      .insert({
        organization_id: organizationId,
        activity_type: 'whatsapp_message_sent',
        description: `WhatsApp ${messageType} sent to ${phoneNumber}${status === 'failed' ? ' (Failed)' : ''}`,
        related_entity_type: 'student',
        related_entity_id: relatedStudentId || null,
        metadata: {
          phone_number: phoneNumber,
          message_type: messageType,
          message_text: messageText,
          status,
          wassender_message_id: wassenderMessageId || null,
          error_message: errorMessage || null,
          sent_at: status === 'sent' ? new Date().toISOString() : null,
        },
      });

    if (error) {
      console.error('Error logging WhatsApp message:', error);
      return NextResponse.json({ error: 'Failed to log message' }, { status: 500 });
    }

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    console.error('Unexpected error in POST /api/whatsapp/log:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
