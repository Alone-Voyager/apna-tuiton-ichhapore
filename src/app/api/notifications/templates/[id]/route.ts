import { NextRequest, NextResponse } from 'next/server';
import { createServerClient, type CookieOptions } from '@supabase/ssr';

export const dynamic = 'force-dynamic';

// PATCH - Update a template
export async function PATCH(
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
    
    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { name, type, message } = body;

    // Extract variables from message if provided
    let variables: string[] | undefined = undefined;
    if (message) {
      const variableRegex = /\[([A-Z_]+)\]/g;
      variables = [];
      let match;
      while ((match = variableRegex.exec(message)) !== null) {
        if (!variables.includes(match[0])) {
          variables.push(match[0]);
        }
      }
    }

    // Update reminder_settings (acting as template)
    const updateData: any = {
      updated_at: new Date().toISOString()
    };
    if (type !== undefined) updateData.reminder_type = type;
    if (message !== undefined) updateData.template_message = message;

    const { data: reminder, error } = await supabase
      .from('reminder_settings')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Error updating template:', error);
      return NextResponse.json({ error: 'Failed to update template' }, { status: 500 });
    }

    return NextResponse.json({ 
      success: true,
      template: {
        id: reminder.id,
        name: getReminderTypeName(reminder.reminder_type),
        type: reminder.reminder_type,
        message: reminder.template_message,
        variables: extractVariables(reminder.template_message || ''),
        usageCount: 0
      }
    });
  } catch (error) {
    console.error('Error in template PATCH API:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// DELETE - Delete a template
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
    
    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Delete reminder setting (acting as template)
    const { error } = await supabase
      .from('reminder_settings')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Error deleting template:', error);
      return NextResponse.json({ error: 'Failed to delete template' }, { status: 500 });
    }

    return NextResponse.json({ 
      success: true,
      message: 'Template deleted successfully'
    });
  } catch (error) {
    console.error('Error in template DELETE API:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// Helper functions
function getReminderTypeName(type: string): string {
  const names: Record<string, string> = {
    fee_due: 'Fee Due Reminder',
    fee_overdue: 'Fee Overdue Alert',
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
