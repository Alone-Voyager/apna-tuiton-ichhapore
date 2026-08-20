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
      'https://cgbwcayquqpgbnyxnyzw.supabase.co',
      'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNnYndjYXlxdXFwZ2JueXhueXp3Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MjA1OTM1OCwiZXhwIjoyMDc3NjM1MzU4fQ.GI0n5RGF540FQvGm9N9P5wfQrLnOycM_hKZ2dQeDAEI'!
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
