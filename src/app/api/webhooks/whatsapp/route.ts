import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// POST /api/webhooks/whatsapp - Receive WhatsApp webhook events from Wassender
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    // Log webhook for debugging
    console.log('Webhook received:', JSON.stringify(body, null, 2));
    console.log('Headers:', Object.fromEntries(request.headers.entries()));
    
    // Verify webhook secret (Wassender may send in different format)
    // Skip validation for now during testing
    // const webhookSecret = request.headers.get('x-webhook-secret') || request.headers.get('authorization');
    // const expectedSecret = process.env.WASSENDER_WEBHOOK_SECRET;
    // if (expectedSecret && webhookSecret !== expectedSecret && webhookSecret !== `Bearer ${expectedSecret}`) {
    //   console.error('Invalid webhook secret');
    //   return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    // }

    // Use anon key - RLS policy allows webhook inserts to activity_logs
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );

    // Extract event data from Wassender webhook
    const {
      event,
      data,
      sessionId,
      messageId,
      from,
      fromName,
      body: messageBody,
      timestamp,
    } = body;

    // For messages.received and chats.update, extract data differently
    let actualFrom = from;
    let actualBody = messageBody;
    
    if (event === 'messages.received' && data?.remoteJid) {
      actualFrom = data.remoteJid;
      actualBody = data.messageBody || data.messages?.message?.imageMessage?.caption || data.messages?.message?.extendedTextMessage?.text;
    } else if (event === 'chats.update' && data?.chats?.messages?.[0]) {
      const msg = data.chats.messages[0].message;
      actualFrom = data.chats.id;
      actualBody = msg?.message?.imageMessage?.caption || msg?.message?.extendedTextMessage?.text;
    }

    console.log('WhatsApp webhook received:', { event, sessionId, from: actualFrom });

    // Handle different event types
    switch (event) {
      case 'message':
      case 'messages.upsert':
      case 'messages.received':
      case 'chats.update': {
        // Incoming message - log to activity_logs instead of separate table
        if (!actualFrom || !actualBody) {
          console.error('Invalid message data:', body);
          return NextResponse.json({ error: 'Invalid message data' }, { status: 400 });
        }

        // Find organization by checking which org has WhatsApp enabled
        const { data: settings, error: settingsError } = await supabase
          .from('integration_settings')
          .select('organization_id')
          .eq('integration_type', 'whatsapp')
          .eq('is_active', true)
          .limit(1)
          .single();

        if (settingsError || !settings) {
          console.error('No connected WhatsApp settings found');
          return NextResponse.json({ error: 'No active WhatsApp integration' }, { status: 404 });
        }

        // Log incoming message as activity
        await supabase
          .from('activity_logs')
          .insert({
            organization_id: settings.organization_id,
            activity_type: 'whatsapp_message_received',
            description: `Received WhatsApp message from ${actualFrom}: ${actualBody.substring(0, 100)}...`,
            metadata: {
              phone_number: actualFrom,
              sender_name: fromName || 'Unknown',
              message_text: actualBody,
              message_type: data?.messageType || 'text',
              wassender_message_id: messageId,
              timestamp: timestamp,
            },
          });

        break;
      }

      case 'message.sent':
      case 'message.delivered':
      case 'message.read': {
        // Message status updates - log as activity
        if (messageId) {
          const statusMap: any = {
            'message.sent': 'sent',
            'message.delivered': 'delivered',
            'message.read': 'read',
          };

          // Log status update as activity
          await supabase
            .from('activity_logs')
            .insert({
              activity_type: 'whatsapp_status_update',
              description: `WhatsApp message ${statusMap[event]}: ${messageId}`,
              metadata: {
                wassender_message_id: messageId,
                status: statusMap[event],
                event_type: event,
                timestamp: new Date().toISOString(),
              },
            });
        }
        break;
      }

      default:
        console.log('Unhandled webhook event:', event);
    }

    return NextResponse.json({ success: true, message: 'Webhook processed' }, { status: 200 });

  } catch (error) {
    console.error('Error processing WhatsApp webhook:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// GET /api/webhooks/whatsapp - Webhook verification (if needed by provider)
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const challenge = searchParams.get('hub.challenge');
  
  if (challenge) {
    return new NextResponse(challenge, { status: 200 });
  }

  return NextResponse.json({ message: 'WhatsApp webhook endpoint active' }, { status: 200 });
}
