import { NextRequest, NextResponse } from 'next/server';
import { createServerClient, type CookieOptions } from '@supabase/ssr';

export const dynamic = 'force-dynamic';

// GET - Fetch all notification templates
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
      console.error('[GET Templates] Organization lookup failed:', userError);
      // Return empty array instead of error
      return NextResponse.json({ 
        success: true,
        templates: [] 
      });
    }

    // Fetch templates from reminder_settings filtered by organization
    const { data: reminders, error } = await supabase
      .from('reminder_settings')
      .select('*')
      .eq('organization_id', userData.organization_id)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching reminder templates:', error);
      // Return empty array instead of error - templates are optional
      return NextResponse.json({ 
        success: true,
        templates: [] 
      });
    }

    // Format reminders as templates
    const formattedTemplates = (reminders || []).map((reminder: any) => ({
      id: reminder.id,
      name: getReminderTypeName(reminder.reminder_type),
      type: reminder.reminder_type,
      message: reminder.template_message || '',
      variables: extractVariables(reminder.template_message || ''),
      usageCount: 0 // Not tracked when using reminder_settings
    }));

    return NextResponse.json({ 
      success: true,
      templates: formattedTemplates 
    });
  } catch (error) {
    console.error('Error in templates API:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST - Create a new template
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
      console.error('[POST Templates] Organization lookup failed:', userError);
      return NextResponse.json({ 
        error: 'Organization profile not found. Please contact administrator.' 
      }, { status: 400 });
    }

    const body = await request.json();
    const { name, type, message } = body;

    // Validate required fields
    if (!name || !type || !message) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Extract variables from message (e.g., [STUDENT_NAME], [AMOUNT])
    const variableRegex = /\[([A-Z_]+)\]/g;
    const variables: string[] = [];
    let match;
    while ((match = variableRegex.exec(message)) !== null) {
      if (!variables.includes(match[0])) {
        variables.push(match[0]);
      }
    }

    // Create a new reminder setting that acts as a template
    const { data: reminder, error } = await supabase
      .from('reminder_settings')
      .insert({
        organization_id: userData.organization_id, // ✅ Add organization_id
        reminder_type: type,
        template_message: message,
        // Auto-enable fee_payment_confirmation templates (they're used automatically on payment)
        // Auto-enable admission_welcome templates (they're used automatically on admission)
        is_enabled: type === 'fee_payment_confirmation' || type === 'admission_welcome' ? true : false,
        days_before: 3,
        frequency: 'daily',
        notification_method: 'WhatsApp',
        target_type: 'all',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating template:', error);
      return NextResponse.json({ error: 'Failed to create template' }, { status: 500 });
    }

    return NextResponse.json({ 
      success: true,
      template: {
        id: reminder.id,
        name: getReminderTypeName(reminder.reminder_type),
        type: reminder.reminder_type,
        message: reminder.template_message,
        variables: extractVariables(reminder.template_message),
        usageCount: 0
      }
    }, { status: 201 });
  } catch (error) {
    console.error('Error in templates POST API:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// Helper functions
function getReminderTypeName(type: string): string {
  const names: Record<string, string> = {
    fee_due: 'Fee Due Reminder',
    fee_overdue: 'Fee Overdue Alert',
    fee_payment_confirmation: 'Fee Payment Confirmation',
    admission_welcome: 'Admission Welcome Message',
    attendance_low: 'Low Attendance Alert',
    admission_followup: 'Admission Follow-up',
    fee_reminder: 'Fee Payment Reminder',
    admission: 'Welcome New Student',
    attendance: 'Low Attendance Alert',
    announcement: 'Announcement Template',
    alert: 'Alert Template'
  };
  return names[type] || type;
}

function extractVariables(message: string): string[] {
  const variableRegex = /\[([A-Z_]+)\]/g;
  const variables: string[] = [];
  let match;
  while ((match = variableRegex.exec(message)) !== null) {
    if (!variables.includes(match[0])) {
      variables.push(match[0]);
    }
  }
  return variables;
}
