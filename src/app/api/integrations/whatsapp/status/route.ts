import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// POST /api/integrations/whatsapp/status - Check WhatsApp integration status
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { organizationId } = body;

    if (!organizationId) {
      return NextResponse.json({ error: 'Organization ID required' }, { status: 400 });
    }

    // Use service role key for status check
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY!
    );

    const { data: settings, error } = await supabase
      .from('integration_settings')
      .select('is_active, config')
      .eq('organization_id', organizationId)
      .eq('integration_type', 'whatsapp')
      .single();

    if (error || !settings) {
      return NextResponse.json(
        { enabled: false, connected: false },
        { status: 200 }
      );
    }

    return NextResponse.json(
      {
        enabled: settings.is_active,
        connected: settings.is_active && settings.config?.connection_status === 'connected',
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Error checking WhatsApp status:', error);
    return NextResponse.json({ enabled: false, connected: false }, { status: 200 });
  }
}
