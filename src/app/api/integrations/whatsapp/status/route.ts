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
      'https://cgbwcayquqpgbnyxnyzw.supabase.co',
      'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNnYndjYXlxdXFwZ2JueXhueXp3Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MjA1OTM1OCwiZXhwIjoyMDc3NjM1MzU4fQ.GI0n5RGF540FQvGm9N9P5wfQrLnOycM_hKZ2dQeDAEI'!
    );

    const { data: settings, error } = await supabase
      .from('integration_settings')
      .select('is_active, config')
      // [ORG-FILTER-SKIP] .eq('organization_id', organizationId)
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
