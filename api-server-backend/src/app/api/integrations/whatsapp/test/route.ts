import { NextRequest, NextResponse } from 'next/server';
import { createServerClient, type CookieOptions } from '@supabase/ssr';

// POST /api/integrations/whatsapp/test - Test WhatsApp connection
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
            response.cookies.set({ name, value, ...options });
          },
          remove(name: string, options: CookieOptions) {
            response.cookies.set({ name, value: '', ...options });
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

    // Get WhatsApp API key
    const { data: apiKeySettings, error: settingsError } = await supabase
      .from('integration_settings')
      .select('api_key, config')
      .eq('organization_id', userData.organization_id)
      .eq('integration_type', 'whatsapp')
      .single();

    if (settingsError || !apiKeySettings?.api_key) {
      return NextResponse.json(
        { error: 'WhatsApp settings not configured' },
        { status: 404 }
      );
    }

    // Test connection with Wassender API
    try {
      // Use the token from database (UI input), not environment variable
      const apiKey = apiKeySettings.api_key;
      
      // Check if token is masked (starts with bullets)
      if (!apiKey || apiKey.includes('•')) {
        return NextResponse.json(
          { error: 'Please re-enter your API token. Masked tokens cannot be used.' },
          { status: 400 }
        );
      }
      
      console.log('Testing WhatsApp connection with API key length:', apiKey?.length);
      console.log('API Key first 10 chars:', apiKey?.substring(0, 10));
      console.log('API Key last 10 chars:', apiKey?.substring(apiKey.length - 10));
      console.log('Making request to Wassender API...');
      
      // Test API call to Wassender - Get session status
      const testResponse = await fetch('https://wasenderapi.com/api/status', {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
      });

      console.log('Wassender API response status:', testResponse.status);

      if (!testResponse.ok) {
        const errorData = await testResponse.json().catch(() => ({}));
        console.error('Wassender API error response:', errorData);
        console.error('Response status:', testResponse.status, testResponse.statusText);
        
        const errorMessage = errorData.message || errorData.error || `API returned ${testResponse.status}: ${testResponse.statusText}`;
        
        // Update connection status to error
        await supabase
          .from('integration_settings')
          .update({
            config: {
              ...apiKeySettings.config,
              connection_status: 'error',
              last_error: errorMessage,
            }
          })
          .eq('organization_id', userData.organization_id)
          .eq('integration_type', 'whatsapp');

        return NextResponse.json(
          { 
            error: `Failed to connect to WhatsApp API: ${errorMessage}`,
            details: errorData,
            status: testResponse.status
          },
          { status: 400 }
        );
      }

      const responseData = await testResponse.json();
      console.log('Wassender API response data:', JSON.stringify(responseData, null, 2));
      
      // Check session status
      const status = responseData.status;
      const isConnected = status === 'authenticated' || status === 'connected';
      const phoneNumber = responseData.phone || responseData.phoneNumber || responseData.user?.id?.split('@')[0] || 'Unknown';
      
      console.log('Session status:', status);
      console.log('Is connected:', isConnected);
      console.log('Phone number:', phoneNumber);

      if (!isConnected) {
        await supabase
          .from('integration_settings')
          .update({
            config: {
              ...apiKeySettings.config,
              connection_status: 'error',
              last_error: 'No active WhatsApp session found. Please scan QR code in Wassender dashboard.',
            }
          })
          .eq('organization_id', userData.organization_id)
          .eq('integration_type', 'whatsapp');

        return NextResponse.json(
          { error: 'No active WhatsApp session. Please connect your phone in Wassender dashboard.' },
          { status: 400 }
        );
      }

      // Update connection status to connected
      await supabase
        .from('integration_settings')
        .update({
          is_active: true,
          config: {
            ...apiKeySettings.config,
            connection_status: 'connected',
            phone_number: phoneNumber,
            last_connected_at: new Date().toISOString(),
            last_error: null,
          }
        })
        .eq('organization_id', userData.organization_id)
        .eq('integration_type', 'whatsapp');

      return NextResponse.json(
        {
          message: 'WhatsApp connection successful!',
          phone_number: phoneNumber,
          connected: true,
        },
        { status: 200, headers: response.headers }
      );
    } catch (apiError: any) {
      console.error('Error testing Wassender API:', apiError);
      
      // Update connection status to error
      await supabase
        .from('integration_settings')
        .update({
          config: {
            ...apiKeySettings.config,
            connection_status: 'error',
            last_error: apiError.message || 'Network error connecting to WhatsApp API',
          }
        })
        .eq('organization_id', userData.organization_id)
        .eq('integration_type', 'whatsapp');

      return NextResponse.json(
        { error: 'Failed to test connection. Please try again.' },
        { status: 500 }
      );
    }

  } catch (error) {
    console.error('Unexpected error in POST /api/integrations/whatsapp/test:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
