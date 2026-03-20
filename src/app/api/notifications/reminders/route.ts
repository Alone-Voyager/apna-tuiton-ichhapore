import { NextRequest, NextResponse } from 'next/server';
import { createServerClient, type CookieOptions } from '@supabase/ssr';

export const dynamic = 'force-dynamic';

// GET - Fetch all reminder settings
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

    // Get user's organization_id
    const { data: userData, error: userError } = await supabase
      .from('admin_profiles')
      .select('organization_id')
      .eq('user_id', user.id)
      .single();

    if (userError || !userData?.organization_id) {
      console.error('[GET Reminders] Organization lookup failed:', userError);
      console.error('[GET Reminders] User ID:', user.id);
      console.warn('[GET Reminders] No admin profile found. User needs to be added to admin_profiles table.');
      // Return empty array instead of error to allow UI to load
      return NextResponse.json({ 
        success: true,
        reminders: [],
        warning: 'No organization profile found. Please contact administrator.'
      });
    }

    // Fetch reminder settings from database filtered by organization
    const { data: reminders, error } = await supabase
      .from('reminder_settings')
      .select('*')
      .eq('organization_id', userData.organization_id)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching reminders:', error);
      return NextResponse.json({ error: 'Failed to fetch reminders' }, { status: 500 });
    }

    return NextResponse.json({ 
      success: true,
      reminders: reminders || [] 
    });
  } catch (error) {
    console.error('Error in reminders API:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST - Create a new reminder setting
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

    console.log('[POST Reminders] User ID:', user.id);

    // Get user's organization_id
    const { data: userData, error: userError } = await supabase
      .from('admin_profiles')
      .select('organization_id')
      .eq('user_id', user.id)
      .single();

    console.log('[POST Reminders] Admin profile lookup:', { userData, userError });

    if (userError || !userData?.organization_id) {
      console.error('[POST Reminders] ❌ Organization lookup failed!');
      console.error('[POST Reminders] Error details:', userError);
      console.error('[POST Reminders] User needs record in admin_profiles table with id:', user.id);
      return NextResponse.json({ 
        error: 'Organization profile not found. Please contact administrator to set up your account.' 
      }, { status: 400 });
    }

    console.log('[POST Reminders] ✓ Organization ID:', userData.organization_id);

    const body = await request.json();
    const {
      reminder_type,
      template_id,
      template_message,
      days_before,
      frequency,
      target_type,
      target_id,
      trigger_condition,
      is_enabled
    } = body;

    // Validate required fields
    if (!reminder_type || !template_message || !frequency) {
      return NextResponse.json({ error: 'Missing required fields: reminder_type, template_message, frequency' }, { status: 400 });
    }

    // Validate target_type and target_id consistency
    if (target_type === 'class' && !target_id) {
      return NextResponse.json({ error: 'target_id is required when target_type is "class"' }, { status: 400 });
    }
    if (target_type === 'student' && !target_id) {
      return NextResponse.json({ error: 'target_id is required when target_type is "student"' }, { status: 400 });
    }

    // Create reminder setting
    const insertData = {
      organization_id: userData.organization_id,
      reminder_type,
      template_id: template_id || null,
      template_message,
      days_before: days_before || 0,
      frequency,
      target_type: target_type || 'all',
      target_id: target_id || null,
      trigger_condition: trigger_condition || null,
      is_enabled: is_enabled !== false,
      notification_method: 'WhatsApp',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
    
    console.log('[POST Reminders] 📝 Inserting reminder with data:', JSON.stringify(insertData, null, 2));
    
    const { data: reminder, error } = await supabase
      .from('reminder_settings')
      .insert(insertData)
      .select()
      .single();
    
    console.log('[POST Reminders] Insert result:', { reminder, error });

    if (error) {
      console.error('Error creating reminder:', error);
      return NextResponse.json({ error: 'Failed to create reminder' }, { status: 500 });
    }

    return NextResponse.json({ 
      success: true,
      reminder 
    }, { status: 201 });
  } catch (error) {
    console.error('Error in reminders POST API:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
