4/**
 * Next.js Instrumentation Hook
 * This file runs once when the server starts
 * Perfect place to initialize cron jobs
 */

export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    // Only run in Node.js runtime (server-side), not in Edge runtime
    const { initializeReminderScheduler } = await import('./lib/cron-service');
    
    console.log('🔧 Server started - Initializing cron jobs...');
    initializeReminderScheduler();
  }
}
