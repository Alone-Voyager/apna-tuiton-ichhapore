/**
 * Payment Notification Service
 * Sends WhatsApp notifications when fees are collected
 */

import { supabaseAdmin } from '../lib/supabase/client';
import { sendWhatsAppMessage, replaceTemplateVariables } from '../lib/whatsapp-service';

interface PaymentConfirmationParams {
  studentId: string;
  organizationId: string;
  amount: number;
  paymentMonth: string;
  paymentDate: string;
  paymentMethod: string;
  receiptNumber: string;
  collectedBy: string;
}

interface PaymentConfirmationResult {
  sent: boolean;
  message?: string;
  error?: string;
}

/**
 * Send payment confirmation WhatsApp message to parent
 * @param params Payment details
 * @returns Result indicating if notification was sent
 */
export async function sendPaymentConfirmation(
  params: PaymentConfirmationParams
): Promise<PaymentConfirmationResult> {
  const {
    studentId,
    organizationId,
    amount,
    paymentMonth,
    paymentDate,
    paymentMethod,
    receiptNumber,
    collectedBy,
  } = params;

  try {
    console.log('💰 [Payment Confirmation] Starting notification process...');

    // 1. Check if WhatsApp integration is active
    const { data: whatsappSettings, error: settingsError } = await supabaseAdmin
      .from('integration_settings')
      .select('is_active, config')
      .eq('organization_id', organizationId)
      .eq('integration_type', 'whatsapp')
      .single();

    if (settingsError || !whatsappSettings?.is_active) {
      console.log('⏭️  [Payment Confirmation] WhatsApp not enabled, skipping notification');
      return { sent: false, message: 'WhatsApp integration not active' };
    }

    // 2. Check if payment confirmations are enabled (optional config)
    const config = whatsappSettings.config || {};
    if (config.enable_payment_confirmations === false) {
      console.log('⏭️  [Payment Confirmation] Payment confirmations disabled in config');
      return { sent: false, message: 'Payment confirmations disabled' };
    }

    // 3. Get template for fee_payment_confirmation
    console.log('🔍 [Payment Confirmation] Looking for template with:', {
      organizationId,
      reminderType: 'fee_payment_confirmation'
    });

    const { data: template, error: templateError } = await supabaseAdmin
      .from('reminder_settings')
      .select('id, template_message, organization_id, is_enabled')
      .eq('reminder_type', 'fee_payment_confirmation')
      .eq('is_enabled', true)
      .or(`organization_id.eq.${organizationId},organization_id.is.null`)
      .limit(1)
      .single();

    if (templateError || !template) {
      console.log('⏭️  [Payment Confirmation] No active payment confirmation template found');
      console.log('Template error:', templateError);
      
      // Try without organization filter to see if template exists
      const { data: anyTemplate } = await supabaseAdmin
        .from('reminder_settings')
        .select('id, organization_id, reminder_type, is_enabled')
        .eq('reminder_type', 'fee_payment_confirmation')
        .limit(5);
      
      console.log('Available payment confirmation templates:', anyTemplate);
      return { sent: false, message: 'No payment confirmation template configured' };
    }

    console.log('✅ [Payment Confirmation] Template found:', template.id);

    // 4. Get student details
    const { data: student, error: studentError } = await supabaseAdmin
      .from('students')
      .select('id, name, whatsapp, parent_name, class_id')
      .eq('id', studentId)
      .single();

    if (studentError || !student) {
      console.error('❌ [Payment Confirmation] Student not found:', studentError);
      return { sent: false, error: 'Student not found' };
    }

    if (!student.whatsapp) {
      console.log('⏭️  [Payment Confirmation] No WhatsApp number for student');
      return { sent: false, message: 'No WhatsApp number configured' };
    }

    // 5. Get class name
    let className = 'N/A';
    if (student.class_id) {
      const { data: classData } = await supabaseAdmin
        .from('classes')
        .select('name')
        .eq('id', student.class_id)
        .single();
      
      if (classData) {
        className = classData.name;
      }
    }

    // 6. Get organization name
    const { data: orgData } = await supabaseAdmin
      .from('organizations')
      .select('name')
      .eq('id', organizationId)
      .single();

    const organizationName = orgData?.name || 'School';

    // 7. Format payment date
    const formattedDate = new Date(paymentDate).toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    });

    // 8. Replace template variables
    const message = replaceTemplateVariables(template.template_message, {
      student_name: student.name,
      parent_name: student.parent_name || 'Parent',
      class_name: className,
      amount: amount,
      payment_month: paymentMonth,
      payment_date: formattedDate,
      receipt_number: receiptNumber,
      payment_method: paymentMethod,
      organization_name: organizationName,
      date: new Date().toLocaleDateString('en-IN'),
    });

    console.log(`📤 [Payment Confirmation] Sending to ${student.parent_name || 'Parent'} (${student.whatsapp})`);

    // 9. Send WhatsApp message
    const result = await sendWhatsAppMessage({
      phoneNumber: student.whatsapp,
      message,
      organizationId,
      messageType: 'payment_confirmation',
      relatedStudentId: studentId,
    });

    if (result.success) {
      console.log('✅ [Payment Confirmation] Notification sent successfully');
      return { sent: true, message: 'Payment confirmation sent' };
    } else {
      console.error('❌ [Payment Confirmation] Failed to send:', result.error);
      return { sent: false, error: result.error };
    }

  } catch (error: any) {
    console.error('❌ [Payment Confirmation] Unexpected error:', error);
    return { sent: false, error: error.message || 'Failed to send notification' };
  }
}
