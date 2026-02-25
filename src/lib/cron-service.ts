/**
 * Cron Service - Automated Reminder Scheduler
 * Uses node-cron to schedule automated reminder checks
 */

import cron from 'node-cron';
import type { ScheduledTask } from 'node-cron';

let isSchedulerInitialized = false;
const scheduledJobs: any[] = [];

/**
 * Initialize the reminder scheduler
 * This should be called once when the server starts
 */
export function initializeReminderScheduler() {
  if (isSchedulerInitialized) {
    console.log('⏰ Reminder scheduler already initialized');
    return;
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

  console.log('🚀 Initializing reminder scheduler...');

  // Schedule 0: Check for scheduled notifications every minute
  const scheduledNotificationsJob = cron.schedule('* * * * *', async () => {
    console.log('\n📅 [Scheduled Check] Checking for due notifications...');
    
    try {
      const response = await fetch(`${appUrl}/api/notifications/check-scheduled`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        const data = await response.json();
        if (data.results.sent > 0 || data.results.failed > 0) {
          console.log('✅ [Scheduled Check] Results:', data.results);
        }
      } else {
        console.error('❌ [Scheduled Check] Failed:', response.status, response.statusText);
      }
    } catch (error) {
      console.error('❌ [Scheduled Check] Error:', error);
    }
  });

  // Schedule 1: Check reminders every hour
  // This allows for timely delivery based on different trigger conditions
  const hourlyJob = cron.schedule('0 * * * *', async () => {
    console.log('\n⏰ [Hourly Check] Running automated reminder check...');
    
    try {
      const response = await fetch(`${appUrl}/api/notifications/check-reminders`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        const data = await response.json();
        console.log('✅ [Hourly Check] Results:', data.results);
      } else {
        console.error('❌ [Hourly Check] Failed:', response.status, response.statusText);
      }
    } catch (error) {
      console.error('❌ [Hourly Check] Error:', error);
    }
  });

  // Schedule 2: Morning check at 9 AM IST (good time for reminders)
  const morningJob = cron.schedule('0 9 * * *', async () => {
    console.log('\n☀️ [Morning Check] Running automated reminder check at 9 AM...');
    
    try {
      const response = await fetch(`${appUrl}/api/notifications/check-reminders`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        const data = await response.json();
        console.log('✅ [Morning Check] Results:', data.results);
      } else {
        console.error('❌ [Morning Check] Failed:', response.status, response.statusText);
      }
    } catch (error) {
      console.error('❌ [Morning Check] Error:', error);
    }
  }, {
    timezone: 'Asia/Kolkata'
  });

  // Schedule 3: Evening check at 5 PM IST (second reminder time)
  const eveningJob = cron.schedule('0 17 * * *', async () => {
    console.log('\n🌆 [Evening Check] Running automated reminder check at 5 PM...');
    
    try {
      const response = await fetch(`${appUrl}/api/notifications/check-reminders`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        const data = await response.json();
        console.log('✅ [Evening Check] Results:', data.results);
      } else {
        console.error('❌ [Evening Check] Failed:', response.status, response.statusText);
      }
    } catch (error) {
      console.error('❌ [Evening Check] Error:', error);
    }
  }, {
    timezone: 'Asia/Kolkata'
  });

  scheduledJobs.push(scheduledNotificationsJob, hourlyJob, morningJob, eveningJob);
  isSchedulerInitialized = true;

  console.log('✅ Reminder scheduler initialized successfully!');
  console.log('📅 Scheduled jobs:');
  console.log('   - Scheduled notifications: Every minute (* * * * *)');
  console.log('   - Hourly check: Every hour (0 * * * *)');
  console.log('   - Morning check: Daily at 9:00 AM IST');
  console.log('   - Evening check: Daily at 5:00 PM IST');
}

/**
 * Stop all scheduled jobs
 */
export function stopReminderScheduler() {
  console.log('⏹️ Stopping reminder scheduler...');
  
  scheduledJobs.forEach(job => job.stop());
  scheduledJobs.length = 0;
  isSchedulerInitialized = false;
  
  console.log('✅ Reminder scheduler stopped');
}

/**
 * Get scheduler status
 */
export function getSchedulerStatus() {
  return {
    isRunning: isSchedulerInitialized,
    activeJobs: scheduledJobs.length,
  };
}

/**
 * Manually trigger a reminder check (useful for testing)
 */
export async function manuallyTriggerCheck() {
  console.log('🔔 Manually triggering reminder check...');
  
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
  
  try {
    const response = await fetch(`${appUrl}/api/notifications/check-reminders`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (response.ok) {
      const data = await response.json();
      console.log('✅ Manual check completed:', data.results);
      return data;
    } else {
      console.error('❌ Manual check failed:', response.status);
      throw new Error(`Manual check failed: ${response.statusText}`);
    }
  } catch (error) {
    console.error('❌ Manual check error:', error);
    throw error;
  }
}
