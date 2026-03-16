import { NextRequest, NextResponse } from 'next/server';
import { manuallyTriggerCheck } from '../../../../lib/cron-service';

/**
 * API Route: /api/cron/trigger
 * Manually trigger a reminder check (for testing)
 */
export async function POST(request: NextRequest) {
  try {
    const result = await manuallyTriggerCheck();
    
    return NextResponse.json({
      success: true,
      message: 'Manual reminder check completed',
      results: result.results,
    });
  } catch (error: any) {
    console.error('Error in manual trigger:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: error.message || 'Failed to trigger check' 
      },
      { status: 500 }
    );
  }
}

/**
 * GET endpoint for easy testing from browser
 */
export async function GET(request: NextRequest) {
  return POST(request);
}
