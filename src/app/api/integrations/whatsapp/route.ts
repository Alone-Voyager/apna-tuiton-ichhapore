import { NextRequest, NextResponse } from 'next/server';
import { createServerClient, type CookieOptions } from '@supabase/ssr';

// GET /api/integrations/whatsapp - Fetch WhatsApp settings
export async function GET(request: NextRequest) {
  try {
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          get(name: string) {
            return request.cookies.get(name)?.value;
          },
          set(name: string, value: string, options: CookieOptions) {
            request.cookies.set(name, value);
          },
          remove(name: string, options: CookieOptions) {
            request.cookies.delete(name);
          },
        },
      }
    );

    // Get authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get user's organization
    const { data: userData, error: userError } = await supabase
      .from('admin_profiles')
      .select('organization_id')
      .eq('user_id', user.id)
      .single();

    if (userError || !userData?.organization_id) {
      return NextResponse.json({ error: 'Organization not found' }, { status: 404 });
    }

    // Fetch WhatsApp integration settings
    const { data: integration, error: settingsError } = await supabase
      .from('integration_settings')
      .select('*')
      .eq('organization_id', userData.organization_id)
      .eq('integration_type', 'whatsapp')
      .single();

    if (settingsError && settingsError.code !== 'PGRST116') {
      console.error('Error fetching WhatsApp settings:', settingsError);
      return NextResponse.json({ error: 'Failed to fetch settings' }, { status: 500 });
    }

    if (!integration) {
      return NextResponse.json({ settings: null });
    }

    // Build settings object
    const settings = {
      id: integration.id,
      api_token: integration.api_key ? '••••••••' : '',
      webhook_secret: integration.webhook_secret ? '••••••••' : '',
      is_connected: integration.config?.connection_status === 'connected',
      connected_phone_number: integration.config?.phone_number || null,
      connection_status: integration.config?.connection_status || 'disconnected',
      last_connected_at: integration.config?.last_connected_at || null,
      last_error: integration.config?.last_error || null,
      webhook_url: integration.config?.webhook_url || '',
      enable_notifications: integration.is_active ?? true,
      enable_fee_reminders: integration.config?.enable_fee_reminders ?? true,
      enable_attendance_alerts: integration.config?.enable_attendance_alerts ?? true,
      enable_admission_updates: integration.config?.enable_admission_updates ?? true,
    };

    return NextResponse.json({ settings });
  } catch (error) {
    console.error('Unexpected error in GET /api/integrations/whatsapp:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST /api/integrations/whatsapp - Create WhatsApp settings
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      api_token,
      webhook_secret,
      enable_notifications = true,
      enable_fee_reminders = true,
      enable_attendance_alerts = true,
      enable_admission_updates = true,
    } = body;

    if (!api_token || !webhook_secret) {
      return NextResponse.json(
        { error: 'API token and webhook secret are required' },
        { status: 400 }
      );
    }

    // Trim and validate tokens
    const cleanApiToken = api_token.trim();
    const cleanWebhookSecret = webhook_secret.trim();
    
    if (cleanApiToken.length < 20 || cleanWebhookSecret.length < 20) {
      return NextResponse.json(
        { error: 'Invalid token format. Please check your tokens.' },
        { status: 400 }
      );
    }

    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          get(name: string) {
            return request.cookies.get(name)?.value;
          },
          set(name: string, value: string, options: CookieOptions) {
            request.cookies.set(name, value);
          },
          remove(name: string, options: CookieOptions) {
            request.cookies.delete(name);
          },
        },
      }
    );

    // Get authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get user's organization and admin profile
    const { data: userData, error: userError } = await supabase
      .from('admin_profiles')
      .select('organization_id, id')
      .eq('user_id', user.id)
      .single();

    if (userError || !userData?.organization_id) {
      return NextResponse.json({ error: 'Organization not found' }, { status: 404 });
    }

    // Generate webhook URL
    const webhookUrl = `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/webhooks/whatsapp`;

    // Prepare config
    const config = {
      webhook_url: webhookUrl,
      connection_status: 'disconnected',
      enable_fee_reminders,
      enable_attendance_alerts,
      enable_admission_updates,
    };

    // Insert integration settings (single row with both api_key and webhook_secret)
    const { error: insertError } = await supabase
      .from('integration_settings')
      .insert({
        organization_id: userData.organization_id,
        integration_type: 'whatsapp',
        api_key: cleanApiToken,
        webhook_secret: cleanWebhookSecret,
        is_active: enable_notifications,
        config,
        created_by: userData.id,
      });

    if (insertError) {
      console.error('Error creating integration settings:', insertError);
      return NextResponse.json({ error: 'Failed to create settings' }, { status: 500 });
    }

    return NextResponse.json(
      { 
        message: 'WhatsApp settings created successfully',
        settings: {
          api_token: '••••••••',
          webhook_secret: '••••••••',
          webhook_url: webhookUrl,
          is_active: enable_notifications,
        }
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Unexpected error in POST /api/integrations/whatsapp:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// PATCH /api/integrations/whatsapp - Update WhatsApp settings
export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      api_token,
      webhook_secret,
      enable_notifications,
      enable_fee_reminders,
      enable_attendance_alerts,
      enable_admission_updates,
    } = body;

    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          get(name: string) {
            return request.cookies.get(name)?.value;
          },
          set(name: string, value: string, options: CookieOptions) {
            request.cookies.set(name, value);
          },
          remove(name: string, options: CookieOptions) {
            request.cookies.delete(name);
          },
        },
      }
    );

    // Get authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get user's organization
    const { data: userData, error: userError } = await supabase
      .from('admin_profiles')
      .select('organization_id')
      .eq('user_id', user.id)
      .single();

    if (userError || !userData?.organization_id) {
      return NextResponse.json({ error: 'Organization not found' }, { status: 404 });
    }

    // Build update object
    const updateData: any = { updated_at: new Date().toISOString() };

    // Update API key if provided
    if (api_token && api_token !== '••••••••' && !api_token.includes('•')) {
      const cleanToken = api_token.trim();
      
      if (cleanToken.length < 20) {
        return NextResponse.json({ error: 'Invalid API token format' }, { status: 400 });
      }
      
      updateData.api_key = cleanToken;
    }

    // Update webhook secret if provided
    if (webhook_secret && webhook_secret !== '••••••••') {
      updateData.webhook_secret = webhook_secret;
    }

    // Update config
    const { data: existing } = await supabase
      .from('integration_settings')
      .select('config')
      .eq('organization_id', userData.organization_id)
      .eq('integration_type', 'whatsapp')
      .single();

    const config: any = { ...existing?.config };
    if (enable_fee_reminders !== undefined) config.enable_fee_reminders = enable_fee_reminders;
    if (enable_attendance_alerts !== undefined) config.enable_attendance_alerts = enable_attendance_alerts;
    if (enable_admission_updates !== undefined) config.enable_admission_updates = enable_admission_updates;
    
    updateData.config = config;
    
    if (enable_notifications !== undefined) updateData.is_active = enable_notifications;

    // Perform single update
    const { error: updateError } = await supabase
      .from('integration_settings')
      .update(updateData)
      .eq('organization_id', userData.organization_id)
      .eq('integration_type', 'whatsapp');

    if (updateError) {
      console.error('Error updating integration settings:', updateError);
      return NextResponse.json({ error: 'Failed to update settings' }, { status: 500 });
    }

    return NextResponse.json(
      { 
        message: 'WhatsApp settings updated successfully',
        settings: {
          api_token: '••••••••',
          webhook_secret: '••••••••',
          ...updateData,
        }
      }
    );
  } catch (error) {
    console.error('Unexpected error in PATCH /api/integrations/whatsapp:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
