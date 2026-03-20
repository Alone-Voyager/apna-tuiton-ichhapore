import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// POST /api/integrations/whatsapp/get-token - Get API token for sending messages (internal use)
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { organizationId } = body;

    if (!organizationId) {
      return NextResponse.json({ error: 'Organization ID required' }, { status: 400 });
    }

    // Use service role key for internal operations
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // Get WhatsApp API key from database
    const { data: apiKeySettings, error } = await supabase
      .from('integration_settings')
      .select('api_key')
      .eq('organization_id', organizationId)
      .eq('integration_type', 'whatsapp')
      .eq('is_active', true)
      .single();

    if (error || !apiKeySettings?.api_key) {
      return NextResponse.json({ error: 'WhatsApp not configured' }, { status: 404 });
    }

    return NextResponse.json({ apiKey: apiKeySettings.api_key }, { status: 200 });
  } catch (error) {
    console.error('Error fetching WhatsApp API token:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
