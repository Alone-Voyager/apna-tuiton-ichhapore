import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { sendWhatsAppMessage, replaceTemplateVariables } from '../../../../lib/whatsapp-service';

export const dynamic = 'force-dynamic';

/**
 * POST /api/notifications/send-notification
 * Send a notification via WhatsApp to specified targets
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { notificationId, title, message, targetType, targetId } = body;

    console.log('=== SEND NOTIFICATION ===');
    console.log('ID:', notificationId);
    console.log('Title:', title);
    console.log('Target:', targetType, targetId);

    // Use service role key
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // Get notification to find organization_id
    const { data: notification, error: notifError } = await supabase
      .from('notifications')
      .select('organization_id')
      .eq('id', notificationId)
      .single();

    if (notifError || !notification) {
      console.error('Notification not found:', notifError);
      return NextResponse.json({ error: 'Notification not found' }, { status: 404 });
    }

    const organizationId = notification.organization_id;

    // Check WhatsApp integration is enabled
    const { data: whatsappSettings, error: settingsError } = await supabase
      .from('integration_settings')
      .select('*')
      .eq('organization_id', organizationId)
      .eq('integration_type', 'whatsapp')
      .single();

    if (settingsError || !whatsappSettings?.is_active) {
      console.error('WhatsApp not enabled');
      return NextResponse.json({ error: 'WhatsApp integration not enabled' }, { status: 400 });
    }

    // Get students based on target
    let students: any[] = [];

    if (targetType === 'all') {
      const { data: allStudents, error: studentsError } = await supabase
        .from('students')
        .select('id, name, whatsapp, parent_name, class_id')
        .eq('organization_id', organizationId)
        .eq('status', 'active');

      if (studentsError) {
        console.error('Error fetching students:', studentsError);
        return NextResponse.json({ error: 'Failed to fetch students' }, { status: 500 });
      }

      students = allStudents || [];
    } else if (targetType === 'class' && targetId) {
      const { data: classStudents, error: studentsError } = await supabase
        .from('students')
        .select('id, name, whatsapp, parent_name, class_id')
        .eq('organization_id', organizationId)
        .eq('class_id', targetId)
        .eq('status', 'active');

      if (studentsError) {
        console.error('Error fetching class students:', studentsError);
        return NextResponse.json({ error: 'Failed to fetch students' }, { status: 500 });
      }

      students = classStudents || [];
    } else if (targetType === 'student' && targetId) {
      const { data: student, error: studentError } = await supabase
        .from('students')
        .select('id, name, whatsapp, parent_name, class_id')
        .eq('organization_id', organizationId)
        .eq('id', targetId)
        .eq('status', 'active')
        .single();

      if (studentError || !student) {
        console.error('Student not found:', studentError);
        return NextResponse.json({ error: 'Student not found' }, { status: 404 });
      }

      students = [student];
    }

    console.log(`Total students to send to: ${students.length}`);

    if (students.length === 0) {
      return NextResponse.json({
        message: 'No students found for target',
        results: { sent: 0, failed: 0, errors: [] }
      });
    }

    // Get class names for all students
    const classIds = [...new Set(students.map(s => s.class_id).filter(Boolean))];
    const classMap = new Map();
    
    if (classIds.length > 0) {
      const { data: classesData } = await supabase
        .from('classes')
        .select('id, name')
        .in('id', classIds);
      
      if (classesData) {
        classesData.forEach(c => classMap.set(c.id, c.name));
      }
    }

    // Send WhatsApp messages
    const results = {
      sent: 0,
      failed: 0,
      errors: [] as string[],
    };

    for (const student of students) {
      if (!student.whatsapp) {
        results.failed++;
        results.errors.push(`${student.name}: No WhatsApp number`);
        continue;
      }

      // Replace template variables in message
      const finalMessage = replaceTemplateVariables(message, {
        student_name: student.name,
        parent_name: student.parent_name || 'Parent',
        class_name: classMap.get(student.class_id) || 'N/A',
        date: new Date().toLocaleDateString('en-IN'),
      });

      console.log(`Sending to ${student.name} (${student.whatsapp})`);

      // Send message
      const result = await sendWhatsAppMessage({
        phoneNumber: student.whatsapp,
        message: finalMessage,
        organizationId: organizationId,
        messageType: 'manual',
        relatedStudentId: student.id,
        relatedNotificationId: notificationId,
      });

      if (result.success) {
        results.sent++;
        console.log(`✓ Sent to ${student.name}`);
      } else {
        results.failed++;
        results.errors.push(`${student.name}: ${result.error}`);
        console.error(`✗ Failed for ${student.name}: ${result.error}`);
      }

      // Delay to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 500));
    }

    console.log('Send complete:', results);

    return NextResponse.json({
      success: true,
      results,
    });

  } catch (error: any) {
    console.error('Unexpected error in send-notification:', error);
    return NextResponse.json({
      error: 'Internal server error',
      details: error.message,
    }, { status: 500 });
  }
}
