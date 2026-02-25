import { NextResponse } from 'next/server';
import { getSchedulerStatus } from '../../../../lib/cron-service';

/**
 * API Route: /api/cron/status
 * Get the status of the cron scheduler
 */
export async function GET() {
  const status = getSchedulerStatus();
  
  return NextResponse.json({
    scheduler: status,
    message: status.isRunning 
      ? 'Cron scheduler is running' 
      : 'Cron scheduler is not running',
  });
}
