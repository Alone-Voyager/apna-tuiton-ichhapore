import { NextRequest, NextResponse } from 'next/server';
import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { sendWhatsAppMessage, replaceTemplateVariables } from '../../../../lib/whatsapp-service';

// POST /api/notifications/send-whatsapp - Send notification via WhatsApp
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      reminderId,
      targetType,
      targetId,
    } = body;

    console.log('=== SEND WHATSAPP REQUEST ===');
    console.log('Body:', JSON.stringify(body, null, 2));
    console.log('reminderId:', reminderId);
    console.log('targetType:', targetType);
    console.log('targetId:', targetId);

    // Check if this is a cron job request (bypass auth)
    const authHeader = request.headers.get('authorization');
    const cronSecret = process.env.CRON_SECRET || 'your-secret-key';
    const isCronRequest = authHeader === `Bearer ${cronSecret}`;

    let supabase;
    let organizationId;

    if (isCronRequest) {
      // Cron job - use service role key and get org from reminder
      const { createClient } = await import('@supabase/supabase-js');
      supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!
      );
      
      // Get organization from reminder settings
      const { data: reminderData } = await supabase
        .from('reminder_settings')
        .select('organization_id')
        .eq('id', reminderId)
        .single();
      
      organizationId = reminderData?.organization_id;
      console.log('🤖 Cron request - Organization ID:', organizationId);
    } else {
      // Regular user request - use cookies
      const response = NextResponse.json({ success: true });

      supabase = createServerClient(
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
      
      organizationId = userData.organization_id;
    }

    if (!organizationId) {
      return NextResponse.json({ error: 'Organization ID not found' }, { status: 404 });
    }

    // Check if WhatsApp is enabled
    const { data: whatsappSettings, error: settingsError } = await supabase
      .from('integration_settings')
      .select('is_active, config')
      .eq('organization_id', organizationId)
      .eq('integration_type', 'whatsapp')
      .single();

    console.log('WhatsApp settings check:', {
      found: !!whatsappSettings,
      error: settingsError,
      is_active: whatsappSettings?.is_active,
      connection_status: whatsappSettings?.config?.connection_status
    });

    if (settingsError || !whatsappSettings?.is_active || whatsappSettings.config?.connection_status !== 'connected') {
      console.error('❌ WhatsApp not enabled or connected');
      return NextResponse.json(
        { error: 'WhatsApp is not enabled or connected' },
        { status: 400 }
      );
    }

    // Get reminder details
    const { data: reminder, error: reminderError } = await supabase
      .from('reminder_settings')
      .select('*')
      .eq('id', reminderId)
      .single();

    if (reminderError || !reminder) {
      return NextResponse.json({ error: 'Reminder not found' }, { status: 404 });
    }

    // Check if this reminder type is enabled for WhatsApp
    const reminderType = reminder.reminder_type;
    const config = whatsappSettings.config || {};
    
    console.log('Reminder type check:', {
      reminderType,
      enable_fee_reminders: config.enable_fee_reminders,
      enable_attendance_alerts: config.enable_attendance_alerts,
      enable_admission_updates: config.enable_admission_updates
    });
    
    if (
      (reminderType.includes('fee') && !config.enable_fee_reminders) ||
      (reminderType.includes('attendance') && !config.enable_attendance_alerts) ||
      (reminderType.includes('admission') && !config.enable_admission_updates)
    ) {
      console.error(`❌ WhatsApp notifications disabled for ${reminderType}`);
      return NextResponse.json(
        { error: `WhatsApp notifications are disabled for ${reminderType}` },
        { status: 400 }
      );
    }

    // Get students to send messages to
    let students: any[] = [];

    console.log('Fetching students with targetType:', targetType, 'targetId:', targetId);

    if (targetType === 'all') {
      // Send to all students
      const { data: allStudents, error: studentsError } = await supabase
        .from('students')
        .select('id, name, whatsapp, parent_name, monthly_fee, class_id')
        .eq('organization_id', organizationId)
        .eq('status', 'active');

      console.log('All students query result:', { count: allStudents?.length || 0, error: studentsError });

      if (studentsError) {
        console.error('Error fetching students:', studentsError);
        return NextResponse.json({ error: 'Failed to fetch students' }, { status: 500 });
      }

      students = allStudents || [];
    } else if (targetType === 'class' && targetId) {
      // Send to specific class
      const { data: classStudents, error: studentsError } = await supabase
        .from('students')
        .select('id, name, whatsapp, parent_name, monthly_fee, class_id')
        .eq('organization_id', organizationId)
        .eq('class_id', targetId)
        .eq('status', 'active');

      console.log('Class students query result:', { count: classStudents?.length || 0, error: studentsError });

      if (studentsError) {
        console.error('Error fetching class students:', studentsError);
        return NextResponse.json({ error: 'Failed to fetch students' }, { status: 500 });
      }

      students = classStudents || [];
    } else if (targetType === 'student' && targetId) {
      // Send to specific student
      const { data: student, error: studentError } = await supabase
        .from('students')
        .select('id, name, whatsapp, parent_name, monthly_fee, class_id')
        .eq('id', targetId)
        .single();

      console.log('Single student query result:', { found: !!student, error: studentError });

      if (studentError) {
        console.error('Error fetching student:', studentError);
        return NextResponse.json({ error: 'Student not found' }, { status: 404 });
      }

      students = [student];
    }

    console.log('Total students to send to:', students.length);
    console.log('Student details:', students.map(s => ({ 
      id: s.id, 
      name: s.name, 
      whatsapp: s.whatsapp,
      parent_name: s.parent_name 
    })));

    if (students.length === 0) {
      return NextResponse.json({ error: 'No students found to send messages' }, { status: 400 });
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

    // Filter students based on reminder type and trigger condition
    if (reminderType === 'fee_overdue' || reminderType === 'fee_overdue_reminder' || reminderType === 'fee_due' || reminderType === 'fee_due_reminder') {
      console.log(`Filtering students by fee payment status for reminder type: ${reminderType}`);
      
      // Get current month in format "Month YYYY" (e.g., "November 2025")
      const currentDate = new Date();
      const currentMonth = currentDate.toLocaleString('en-US', { month: 'long', year: 'numeric' });
      
      // Determine which status to filter by based on reminder type
      let statusFilter: string[];
      let paymentMonthFilter: string | null = null;
      
      if (reminderType === 'fee_overdue' || reminderType === 'fee_overdue_reminder') {
        // Fee Overdue: Only students with overdue status (any past month)
        statusFilter = ['Overdue'];
        console.log('🔴 Looking for students with OVERDUE fees (any past month)');
      } else {
        // Fee Due: Only students with unpaid status for CURRENT MONTH ONLY
        statusFilter = ['Unpaid'];
        paymentMonthFilter = currentMonth;
        console.log(`🟡 Looking for students with UNPAID fees for current month: ${currentMonth}`);
      }
      
      const now = new Date();
      
      // Build fee payments query
      let feeQuery = supabase
        .from('fee_payments')
        .select('student_id, due_date, amount, paid_amount, status, payment_month')
        .eq('organization_id', organizationId)
        .in('status', statusFilter);
      
      // For Unpaid (fee_due), filter by current month only
      if (paymentMonthFilter) {
        feeQuery = feeQuery.eq('payment_month', paymentMonthFilter);
        console.log(`📅 Filtering by payment_month: ${paymentMonthFilter}`);
      }
      
      const { data: feePayments, error: feeError } = await feeQuery;
      
      console.log(`Fee payments found with status ${statusFilter.join(', ')}:`, feePayments?.length || 0);
      
      if (feeError) {
        console.error('Error fetching fee payments:', feeError);
      }
      
      if (feePayments && feePayments.length > 0) {
        console.log('Fee payment details:', feePayments.map(f => ({ 
          student_id: f.student_id, 
          payment_month: f.payment_month,
          due_date: f.due_date,
          status: f.status,
          amount: f.amount,
          paid_amount: f.paid_amount
        })));
        
        // Get unique student IDs with the matching status
        const studentIdsWithDueFees = new Set(feePayments.map(p => p.student_id));
        
        const filteredStudents = students.filter(s => studentIdsWithDueFees.has(s.id));
        
        console.log(`✓ Filtered: ${filteredStudents.length} students with ${statusFilter.join(' or ')} fees`);
        
        if (filteredStudents.length === 0) {
          return NextResponse.json({ 
            message: `No students found with ${statusFilter.join(' or ')} fees`,
            results: { sent: 0, failed: 0, errors: [] }
          }, { status: 200 });
        }
        
        students = filteredStudents;
      } else {
        console.log(`No ${statusFilter.join(' or ')} fees found - no messages to send`);
        return NextResponse.json({ 
          message: `No students with ${statusFilter.join(' or ')} fees found`,
          results: { sent: 0, failed: 0, errors: [] }
        }, { status: 200 });
      }
    }

    console.log('Final student count after filtering:', students.length);

    // Send WhatsApp messages
    const results = {
      sent: 0,
      failed: 0,
      errors: [] as string[],
    };

    console.log('Starting to send messages...');

    for (const student of students) {
      console.log(`Processing student: ${student.name}, whatsapp: ${student.whatsapp}`);
      
      if (!student.whatsapp) {
        results.failed++;
        results.errors.push(`${student.name}: No WhatsApp number`);
        console.log(`❌ ${student.name}: No WhatsApp number found`);
        continue;
      }

      // Get student's fee payment info for template variables
      let dueDate = new Date().toLocaleDateString('en-IN');
      let amountDue = student.monthly_fee || 0;
      let paymentMonth = '';
      
      if (reminderType.includes('fee') || reminderType === 'fee_overdue' || reminderType === 'fee_due' || 
          reminderType === 'fee_overdue_reminder' || reminderType === 'fee_due_reminder') {
        
        // Determine status to query based on reminder type
        let statusToQuery: string[];
        if (reminderType === 'fee_overdue' || reminderType === 'fee_overdue_reminder') {
          statusToQuery = ['Overdue'];
        } else if (reminderType === 'fee_due' || reminderType === 'fee_due_reminder') {
          statusToQuery = ['Unpaid'];
        } else {
          // For generic fee reminders, check both
          statusToQuery = ['Unpaid', 'Overdue', 'Partial'];
        }
        
        const { data: studentFee } = await supabase
          .from('fee_payments')
          .select('due_date, amount, paid_amount, status, payment_month')
          .eq('student_id', student.id)
          .in('status', statusToQuery)
          .order('due_date', { ascending: true })
          .limit(1)
          .single();
        
        if (studentFee) {
          dueDate = new Date(studentFee.due_date).toLocaleDateString('en-IN');
          amountDue = studentFee.amount - (studentFee.paid_amount || 0);
          paymentMonth = studentFee.payment_month || '';
        }
      }

      // Get student's attendance data for template variables
      let attendancePercentage = 'N/A';
      
      if (reminderType.includes('attendance')) {
        // Calculate attendance for last 30 days
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        
        const { data: attendanceRecords, error: attendanceError } = await supabase
          .from('attendance')
          .select('status')
          .eq('student_id', student.id)
          .gte('date', thirtyDaysAgo.toISOString().split('T')[0])
          .lte('date', new Date().toISOString().split('T')[0]);
        
        if (!attendanceError && attendanceRecords && attendanceRecords.length > 0) {
          const presentDays = attendanceRecords.filter(r => r.status === 'present').length;
          const totalDays = attendanceRecords.length;
          attendancePercentage = `${Math.round((presentDays / totalDays) * 100)}%`;
        }
      }

      // Replace template variables
      const message = replaceTemplateVariables(reminder.template_message, {
        student_name: student.name,
        parent_name: student.parent_name || 'Parent',
        class_name: classMap.get(student.class_id) || 'N/A',
        amount: amountDue,
        due_date: dueDate,
        payment_month: paymentMonth,
        date: new Date().toLocaleDateString('en-IN'),
        attendance: attendancePercentage,
      });

      console.log(`Sending WhatsApp to parent: ${student.parent_name || 'Parent'} (${student.whatsapp})`);
      console.log(`Message: ${message.substring(0, 50)}...`);

      // Send message
      const result = await sendWhatsAppMessage({
        phoneNumber: student.whatsapp,
        message,
        organizationId: organizationId,
        messageType: reminderType.includes('fee') ? 'fee_reminder' : 
                     reminderType.includes('attendance') ? 'attendance_alert' : 'admission_update',
        relatedStudentId: student.id,
        relatedReminderId: reminderId,
      });

      if (result.success) {
        results.sent++;
        console.log(`✓ Message sent successfully to ${student.whatsapp}`);
      } else {
        results.failed++;
        results.errors.push(`${student.name}: ${result.error}`);
        console.error(`✗ Failed to send to ${student.whatsapp}: ${result.error}`);
      }

      // Add delay to avoid rate limiting (5 seconds for Wassender API protection)
      await new Promise(resolve => setTimeout(resolve, 5000));
    }

    // Update reminder's last_sent_at timestamp
    if (reminderId) {
      await supabase
        .from('reminder_settings')
        .update({ last_sent_at: new Date().toISOString() })
        .eq('id', reminderId);
    }

    return NextResponse.json({
      message: 'WhatsApp messages sent',
      results,
    });

  } catch (error: any) {
    console.error('Unexpected error in POST /api/notifications/send-whatsapp:', error);
    return NextResponse.json({ 
      error: 'Internal server error',
      details: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    }, { status: 500 });
  }
}
