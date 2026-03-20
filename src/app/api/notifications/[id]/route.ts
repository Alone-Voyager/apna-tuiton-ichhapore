import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { NextRequest, NextResponse } from 'next/server';

// PUT - Update scheduled notification
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
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

    // Get authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get admin profile with organization_id
    const { data: adminProfile, error: profileError } = await supabase
      .from('admin_profiles')
      .select('organization_id')
      .eq('user_id', user.id)
      .single();

    console.log('[Update Notification] Admin profile:', adminProfile);

    if (profileError || !adminProfile) {
      console.error('[Update Notification] Profile error:', profileError);
      return NextResponse.json({ error: 'Admin profile not found' }, { status: 404 });
    }

    const body = await request.json();
    const { type, title, message, target_type, target_id, scheduled_at } = body;

    console.log('[Update Notification] ID:', id);
    console.log('[Update Notification] User Organization ID:', adminProfile.organization_id);

    // First, check if notification exists at all
    const { data: notificationCheck, error: checkError } = await supabase
      .from('notifications')
      .select('*')
      .eq('id', id)
      .single();

    console.log('[Update Notification] Notification lookup (any org):', { notificationCheck, checkError });

    // Validate that the notification is scheduled and not yet sent
    const { data: existingNotification, error: fetchError } = await supabase
      .from('notifications')
      .select('*')
      .eq('id', id)
      .single();

    console.log('[Update Notification] Fetch result:', { existingNotification, fetchError });

    if (fetchError || !existingNotification) {
      console.error('[Update Notification] Not found:', fetchError);
      return NextResponse.json({ 
        error: 'Notification not found',
        details: fetchError?.message,
        id,
        user_organization_id: adminProfile.organization_id,
        notification_organization_id: notificationCheck?.organization_id
      }, { status: 404 });
    }

    // Check organization match
    if (existingNotification.organization_id !== adminProfile.organization_id) {
      console.error('[Update Notification] Organization mismatch');
      return NextResponse.json({ 
        error: 'Organization mismatch - you can only edit notifications from your organization',
        user_org: adminProfile.organization_id,
        notification_org: existingNotification.organization_id
      }, { status: 403 });
    }

    if (existingNotification.status !== 'scheduled') {
      return NextResponse.json(
        { error: 'Only scheduled notifications can be edited' },
        { status: 400 }
      );
    }

    // Update the notification
    const { data, error } = await supabase
      .from('notifications')
      .update({
        type,
        title,
        message,
        target_type,
        target_id: target_id || null,
        scheduled_at: scheduled_at || null,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('[Update Notification] Update error:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    console.log('[Update Notification] Updated successfully:', data.id);
    return NextResponse.json(data);
  } catch (error: any) {
    console.error('Error in PUT /api/notifications/[id]:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to update notification' },
      { status: 500 }
    );
  }
}

// DELETE - Delete notification
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
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

    // Get authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get admin profile with organization_id
    const { data: adminProfile, error: profileError } = await supabase
      .from('admin_profiles')
      .select('organization_id')
      .eq('user_id', user.id)
      .single();

    if (profileError || !adminProfile) {
      return NextResponse.json({ error: 'Admin profile not found' }, { status: 404 });
    }

    // Delete the notification
    const { error } = await supabase
      .from('notifications')
      .delete()
      .eq('id', id)
      .eq('organization_id', adminProfile.organization_id);

    if (error) {
      console.error('Error deleting notification:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, message: 'Notification deleted' });
  } catch (error: any) {
    console.error('Error in DELETE /api/notifications/[id]:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to delete notification' },
      { status: 500 }
    );
  }
}
