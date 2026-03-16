import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

/**
 * API Route: /api/notifications/check-reminders
 * Purpose: Check and send automated reminders based on trigger conditions
 * This should be called by a cron job (e.g., every hour or daily)
 */
export async function POST(request: NextRequest) {
  try {
    console.log('⏰ Checking automated reminders...');

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

    const supabase = createClient(supabaseUrl, supabaseKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    });

    console.log('🔔 Starting automated reminder check...');

    // Get all active reminders
    const { data: reminders, error: remindersError } = await supabase
      .from('reminder_settings')
      .select('*')
      .eq('is_enabled', true);

    if (remindersError) {
      console.error('Error fetching reminders:', remindersError);
      return NextResponse.json({ error: 'Failed to fetch reminders' }, { status: 500 });
    }

    if (!reminders || reminders.length === 0) {
      console.log('No active reminders found');
      return NextResponse.json({ message: 'No active reminders' }, { status: 200 });
    }

    const results = {
      checked: 0,
      sent: 0,
      failed: 0,
      skipped: 0,
      errors: [] as string[],
    };

    for (const reminder of reminders) {
      results.checked++;
      console.log(`\n📋 Checking reminder: ${reminder.reminder_type} (${reminder.id})`);

      try {
        // Check if reminder should be triggered based on condition
        const shouldSend = await checkReminderTrigger(reminder, supabase);

        if (!shouldSend) {
          console.log(`⏭️  Skipping - trigger condition not met`);
          results.skipped++;
          continue;
        }

        console.log(`✅ Trigger condition met, sending reminder...`);

        // Send the reminder via WhatsApp
        const sendResponse = await fetch(`${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/notifications/send-whatsapp`, {
          method: 'POST',
          headers: { 
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            reminderId: reminder.id,
            targetType: reminder.target_type,
            targetId: reminder.target_id,
          }),
        });

        if (sendResponse.ok) {
          const sendData = await sendResponse.json();
          results.sent += sendData.results?.sent || 0;
          results.failed += sendData.results?.failed || 0;
          console.log(`📤 Sent: ${sendData.results?.sent}, Failed: ${sendData.results?.failed}`);
          
          // Update last_sent_at timestamp
          await supabase
            .from('reminder_settings')
            .update({ last_sent_at: new Date().toISOString() })
            .eq('id', reminder.id);
            
        } else {
          results.failed++;
          results.errors.push(`${reminder.reminder_type}: Failed to send`);
          console.error(`❌ Failed to send reminder: ${reminder.id}`);
        }

      } catch (error: any) {
        results.failed++;
        results.errors.push(`${reminder.reminder_type}: ${error.message}`);
        console.error(`❌ Error processing reminder ${reminder.id}:`, error);
      }
    }

    console.log('\n📊 Reminder check complete:', results);

    return NextResponse.json({
      message: 'Reminder check completed',
      results,
    }, { status: 200 });

  } catch (error) {
    console.error('Unexpected error in check-reminders:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * Check if a reminder should be triggered based on its condition
 */
async function checkReminderTrigger(reminder: any, supabase: any): Promise<boolean> {
  const now = new Date();
  const today = now.toISOString().split('T')[0];

  // Check frequency - has enough time passed since last send?
  if (reminder.last_sent_at) {
    const lastSent = new Date(reminder.last_sent_at);
    const hoursSinceLastSend = (now.getTime() - lastSent.getTime()) / (1000 * 60 * 60);

    switch (reminder.frequency) {
      case 'daily':
        if (hoursSinceLastSend < 24) {
          console.log(`   ⏭️  Too soon - last sent ${Math.round(hoursSinceLastSend)}h ago (need 24h)`);
          return false;
        }
        break;
      case 'weekly':
        if (hoursSinceLastSend < 24 * 7) {
          console.log(`   ⏭️  Too soon - last sent ${Math.round(hoursSinceLastSend / 24)}d ago (need 7d)`);
          return false;
        }
        break;
      case 'monthly':
        if (hoursSinceLastSend < 24 * 30) {
          console.log(`   ⏭️  Too soon - last sent ${Math.round(hoursSinceLastSend / 24)}d ago (need 30d)`);
          return false;
        }
        break;
      case 'quarterly':
        if (hoursSinceLastSend < 24 * 90) {
          console.log(`   ⏭️  Too soon - last sent ${Math.round(hoursSinceLastSend / 24)}d ago (need 90d)`);
          return false;
        }
        break;
    }
  }

  // Check trigger condition based on reminder type
  const reminderType = reminder.reminder_type;
  
  // Fee-related reminders (handle both 'fee_due_reminder', 'fee_due', and 'fee_reminder')
  if (reminderType === 'fee_due_reminder' || reminderType === 'fee_due' || reminderType === 'fee_reminder') {
    // Check trigger: days_before_due, monthly_check, or specific_date
    if (reminder.trigger_condition === 'days_before_due') {
      const daysBeforeDue = reminder.days_before || 3;
      
      // Calculate the target date range (X days from now)
      const targetDate = new Date(now);
      targetDate.setDate(targetDate.getDate() + daysBeforeDue);
      const targetDateStr = targetDate.toISOString().split('T')[0];
      
      // Query fee_payments table to check if any fees are due on target date
      const { data: upcomingFees } = await supabase
        .from('fee_payments')
        .select('id')
        .in('status', ['pending', 'Unpaid', 'unpaid'])
        .gte('due_date', targetDateStr)
        .lte('due_date', targetDateStr);
      
      if (upcomingFees && upcomingFees.length > 0) {
        console.log(`   ✓ Found ${upcomingFees.length} fees due in ${daysBeforeDue} days (${targetDateStr})`);
        return true;
      }
      
      console.log(`   ⏭️  No fees due on ${targetDateStr} (${daysBeforeDue} days from now)`);
      return false;
    }
    
    if (reminder.trigger_condition === 'monthly_check') {
      // Send on 1st of every month
      const isFirstOfMonth = now.getDate() === 1;
      if (isFirstOfMonth) {
        console.log(`   ✓ First of month - sending monthly fee reminder`);
      }
      return isFirstOfMonth;
    }
  }
  
  if (reminderType === 'fee_overdue_reminder' || reminderType === 'fee_overdue') {
    // Check trigger: fee_overdue or days_before_due
    if (reminder.trigger_condition === 'fee_overdue') {
      // Send reminders for already overdue fees - check daily or specific days
      const dayOfMonth = now.getDate();
      const shouldCheck = dayOfMonth === 2 || dayOfMonth === 5 || dayOfMonth === 10;
      
      if (shouldCheck) {
        console.log(`   ✓ Day ${dayOfMonth} - checking for overdue fees`);
        return true;
      }
      return false;
    }
    
    if (reminder.trigger_condition === 'days_before_due') {
      // Send X days before fees become overdue
      // For daily frequency, check every day if there are fees due soon
      console.log(`   ✓ Checking for fees with upcoming due dates (${reminder.days_before || 30} days before)`);
      return true;
    }
    
    // Default: check daily for any overdue fees
    console.log(`   ✓ Daily check for overdue fees`);
    return true;
  }
  
  // Attendance-related reminders (handle both naming conventions)
  if (reminderType === 'attendance_low_alert' || reminderType === 'attendance_low') {
    // Check trigger: attendance_below
    // Send weekly on Mondays to check low attendance
    const isMonday = now.getDay() === 1;
    
    if (isMonday) {
      console.log(`   ✓ Monday - checking for low attendance`);
      return true;
    }
    return false;
  }
  
  // Admission-related reminders (handle both naming conventions)
  if (reminderType === 'admission_followup' || reminderType === 'admission') {
    // Check trigger: days_after_inquiry, weekly_followup
    if (reminder.trigger_condition === 'days_after_inquiry') {
      // Check if there are inquiries from X days ago
      const daysAfter = reminder.days_after || 3;
      const targetDate = new Date(now);
      targetDate.setDate(targetDate.getDate() - daysAfter);
      const targetDateStr = targetDate.toISOString().split('T')[0];
      
      // Query inquiries from that date
      const { data: inquiries } = await supabase
        .from('inquiries')
        .select('id')
        .gte('created_at', targetDateStr)
        .lt('created_at', targetDate.toISOString().split('T')[0])
        .eq('status', 'pending');
      
      if (inquiries && inquiries.length > 0) {
        console.log(`   ✓ Found ${inquiries.length} inquiries from ${daysAfter} days ago`);
        return true;
      }
      return false;
    }
    
    if (reminder.trigger_condition === 'weekly_followup') {
      // Weekly follow-ups on Tuesdays
      const isTuesday = now.getDay() === 2;
      if (isTuesday) {
        console.log(`   ✓ Tuesday - sending weekly admission follow-ups`);
      }
      return isTuesday;
    }
  }

  // Default: if no specific logic, don't send
  console.log(`   ❓ Unknown trigger condition: ${reminder.trigger_condition}`);
  return false;
}

/**
 * Manual trigger endpoint - can be called manually
 */
export async function GET(request: NextRequest) {
  // Allow manual testing without cron secret
  return POST(request);
}
