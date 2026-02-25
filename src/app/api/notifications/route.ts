import { NextRequest, NextResponse } from 'next/server';
import { createServerClient, type CookieOptions } from '@supabase/ssr';

export const dynamic = 'force-dynamic';

// GET - Fetch all notifications
export async function GET(request: NextRequest) {
  try {
    const response = NextResponse.json({ success: true });

    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
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

    // Fetch notifications from database
    const { data: notifications, error } = await supabase
      .from('notifications')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching notifications:', error);
      return NextResponse.json({ error: 'Failed to fetch notifications' }, { status: 500 });
    }

    return NextResponse.json({ 
      success: true,
      notifications: notifications || [] 
    });
  } catch (error) {
    console.error('Error in notifications API:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST - Create a new notification
export async function POST(request: NextRequest) {
  try {
    const response = NextResponse.json({ success: true });

    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
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

    // Get user's organization_id
    const { data: userData, error: userError } = await supabase
      .from('admin_profiles')
      .select('organization_id')
      .eq('user_id', user.id)
      .single();

    if (userError || !userData?.organization_id) {
      console.error('[Create Notification] Organization lookup failed:', userError);
      return NextResponse.json({ error: 'Organization not found' }, { status: 404 });
    }

    const body = await request.json();
    const {
      type,
      title,
      message,
      target_type,
      target_id,
      scheduled_at,
      use_template,
      template_id
    } = body;

    // Validate required fields
    if (!type || !title || !message || !target_type) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Create notification record (without created_by to avoid foreign key constraint)
    const { data: notification, error } = await supabase
      .from('notifications')
      .insert({
        organization_id: userData.organization_id,
        type,
        title,
        message,
        target_type,
        target_id: target_id || null,
        status: scheduled_at ? 'scheduled' : 'pending',
        scheduled_at: scheduled_at || null,
        created_at: new Date().toISOString()
      })
      .select()
      .single();

    if (error) {
      console.error('[Create Notification] Database error:', error);
      return NextResponse.json({ 
        error: 'Failed to create notification',
        details: error.message 
      }, { status: 500 });
    }

    console.log('[Create Notification] Success:', notification.id);

    // TODO: If not scheduled, trigger immediate sending via WhatsApp API
    // This would integrate with your WhatsApp Business API

    return NextResponse.json({ 
      success: true,
      id: notification.id,
      notification 
    }, { status: 201 });
  } catch (error) {
    console.error('Error in notifications POST API:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
