import { NextRequest, NextResponse } from 'next/server';
import { createServerClient, type CookieOptions } from '@supabase/ssr';

export const dynamic = 'force-dynamic';

// GET - Fetch notification statistics
export async function GET(request: NextRequest) {
  try {
    const response = NextResponse.json({ success: true });

    const supabase = createServerClient(
      (process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://cgbwcayquqpgbnyxnyzw.supabase.co'),
      (process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNnYndjYXlxdXFwZ2JueXhueXp3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjIwNTkzNTgsImV4cCI6MjA3NzYzNTM1OH0._KmePMak2LvDcnCe8M8_70NeZmyTfp7iw69gw6acoNg'),
      {
        cookies: {
          get(name: string) {
            return request.cookies.get(name)?.value;
          },
          set(name: string, value: string, options: CookieOptions) {
            response.cookies.set({
              name,
              value,
              ...options,
            });
          },
          remove(name: string, options: CookieOptions) {
            response.cookies.set({
              name,
              value: '',
              ...options,
            });
          },
        },
      }
    );
    
    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayISO = today.toISOString();

    // Fetch notifications sent today
    const { data: sentToday, error: sentError } = await supabase
      .from('notifications')
      .select('id')
      .eq('status', 'sent')
      .gte('sent_at', todayISO);

    // Fetch pending notifications
    const { data: pending, error: pendingError } = await supabase
      .from('notifications')
      .select('id')
      .eq('status', 'pending');

    // Fetch active reminders
    const { data: activeReminders, error: remindersError } = await supabase
      .from('reminder_settings')
      .select('id')
      .eq('is_enabled', true);

    // Calculate delivery rate (sent vs failed today)
    const { data: deliveredToday, error: deliveredError } = await supabase
      .from('notifications')
      .select('recipient_count, delivered_count')
      .eq('status', 'sent')
      .gte('sent_at', todayISO);

    let deliveryRate = '0';
    if (deliveredToday && deliveredToday.length > 0) {
      const totalRecipients = deliveredToday.reduce((sum: number, n: any) => sum + (n.recipient_count || 0), 0);
      const totalDelivered = deliveredToday.reduce((sum: number, n: any) => sum + (n.delivered_count || 0), 0);
      if (totalRecipients > 0) {
        deliveryRate = ((totalDelivered / totalRecipients) * 100).toFixed(1);
      }
    }

    return NextResponse.json({ 
      success: true,
      sentToday: sentToday?.length || 0,
      pending: pending?.length || 0,
      deliveryRate,
      activeReminders: activeReminders?.length || 0
    });
  } catch (error) {
    console.error('Error in notifications stats API:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
