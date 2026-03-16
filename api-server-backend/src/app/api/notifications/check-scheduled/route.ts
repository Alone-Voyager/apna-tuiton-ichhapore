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
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = 
      process.env.SUPABASE_SERVICE_ROLE_KEY || 
      process.env.NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY ||
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseKey) {
      console.error('❌ Missing Supabase credentials:', { 
        hasUrl: !!supabaseUrl, 
        hasKey: !!supabaseKey 
      });
      return NextResponse.json(
        { error: 'Server configuration error - missing Supabase credentials' }, 
        { status: 500 }
      );
    }

    // Log which key type we're using
    const keyType = process.env.SUPABASE_SERVICE_ROLE_KEY ? 'SERVICE_ROLE' : 
                    process.env.NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY ? 'PUBLIC_SERVICE_ROLE' : 
                    'ANON';
    console.log('🔑 Using Supabase key type:', keyType);

    const supabase = createClient(supabaseUrl, supabaseKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    });

    // Get current time
    const now = new Date();
    
    // Find notifications that are scheduled and due to be sent
    // Check notifications scheduled within the last 2 minutes to account for cron timing
    const twoMinutesAgo = new Date(now.getTime() - 2 * 60 * 1000);
    
    console.log('🔍 Looking for notifications between:', {
      from: twoMinutesAgo.toISOString(),
      to: now.toISOString(),
      current: now.toISOString()
    });
    
    // Debug: Check ALL scheduled notifications first
    const { data: allScheduled } = await supabase
      .from('notifications')
      .select('id, scheduled_at, status')
      .eq('status', 'scheduled');
    
    console.log('📊 All scheduled notifications in DB:', allScheduled?.length || 0);
    if (allScheduled && allScheduled.length > 0) {
      console.log('Sample:', allScheduled.slice(0, 3));
    }
    
    const { data: scheduledNotifications, error } = await supabase
      .from('notifications')
      .select('*')
      .eq('status', 'scheduled')
      .lte('scheduled_at', now.toISOString())
      .gte('scheduled_at', twoMinutesAgo.toISOString())
      .order('scheduled_at', { ascending: true });

    if (error) {
      console.error('Error fetching scheduled notifications:', error);
      return NextResponse.json({ error: 'Failed to fetch notifications' }, { status: 500 });
    }

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
