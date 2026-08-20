import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';

/**
 * POST /api/notifications/check-scheduled
 * Check for notifications scheduled to be sent now and send them via WhatsApp
 */
export async function POST(request: NextRequest) {
  try {
    console.log('📅 Checking for scheduled notifications...');

    // Get Supabase credentials with fallbacks
    const supabaseUrl = (process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://cgbwcayquqpgbnyxnyzw.supabase.co');
    const supabaseKey = 
      (process.env.SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNnYndjYXlxdXFwZ2JueXhueXp3Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MjA1OTM1OCwiZXhwIjoyMDc3NjM1MzU4fQ.GI0n5RGF540FQvGm9N9P5wfQrLnOycM_hKZ2dQeDAEI') || 
      process.env.NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY ||
      (process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNnYndjYXlxdXFwZ2JueXhueXp3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjIwNTkzNTgsImV4cCI6MjA3NzYzNTM1OH0._KmePMak2LvDcnCe8M8_70NeZmyTfp7iw69gw6acoNg');

    const supabase = createClient(supabaseUrl, supabaseKey);

    const now = new Date().toISOString();
    const { data: scheduledNotifications } = await supabase
      .from('notifications')
      .select('*')
      .eq('status', 'scheduled')
      .lte('scheduled_for', now);

    console.log(`📋 Query returned ${scheduledNotifications?.length || 0} notifications`);

    if (!scheduledNotifications || scheduledNotifications.length === 0) {
      console.log('✓ No scheduled notifications due at this time');
      return NextResponse.json({
        success: true,
        message: 'No notifications due',
        results: { checked: 0, sent: 0, failed: 0 }
      });
    }

    console.log(`📬 Found ${scheduledNotifications.length} notification(s) to send`);

    const results = {
      checked: scheduledNotifications.length,
      sent: 0,
      failed: 0,
      errors: [] as string[],
    };

    // Process each notification
    for (const notification of scheduledNotifications) {
      console.log(`\n📨 Processing notification: ${notification.title} (${notification.id})`);

      // Update status to 'sending'
      await supabase
        .from('notifications')
        .update({ status: 'sending' })
        .eq('id', notification.id);

      try {
        // Send via WhatsApp using the existing send-whatsapp endpoint
        const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
        
        const sendResponse = await fetch(`${appUrl}/api/notifications/send-notification`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            notificationId: notification.id,
            title: notification.title,
            message: notification.message,
            targetType: notification.target_type,
            targetId: notification.target_id,
          }),
        });

        if (sendResponse.ok) {
          const sendData = await sendResponse.json();
          
          // Update notification status to 'sent'
          await supabase
            .from('notifications')
            .update({
              status: 'sent',
              sent_at: new Date().toISOString(),
              recipient_count: sendData.results?.sent || 0,
              delivered_count: sendData.results?.sent || 0,
              failed_count: sendData.results?.failed || 0,
            })
            .eq('id', notification.id);

          results.sent++;
          console.log(`✅ Notification sent successfully: ${sendData.results?.sent || 0} messages`);
        } else {
          throw new Error(`Send failed: ${sendResponse.statusText}`);
        }
      } catch (error: any) {
        console.error(`❌ Failed to send notification ${notification.id}:`, error);
        
        // Update status to 'failed'
        await supabase
          .from('notifications')
          .update({
            status: 'failed',
            sent_at: new Date().toISOString(),
          })
          .eq('id', notification.id);

        results.failed++;
        results.errors.push(`${notification.title}: ${error.message}`);
      }
    }

    console.log('\n📊 Scheduled notification check complete:', results);

    return NextResponse.json({
      success: true,
      results,
    });

  } catch (error: any) {
    console.error('Unexpected error in check-scheduled:', error);
    return NextResponse.json({
      error: 'Internal server error',
      details: error.message,
    }, { status: 500 });
  }
}
