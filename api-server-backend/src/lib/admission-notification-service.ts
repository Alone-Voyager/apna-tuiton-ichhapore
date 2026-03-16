/**
 * Admission Notification Service
 * Sends WhatsApp welcome messages when a student is admitted
 */

import { supabaseAdmin } from '../lib/supabase/client';
import { sendWhatsAppMessage, replaceTemplateVariables } from '../lib/whatsapp-service';

interface AdmissionNotificationParams {
  studentId: string;
  studentName: string;
  organizationId: string;
  classId: string | null;
  admissionDate: string;
  parentName: string;
  rollNumber?: string;
  monthlyFee: number;
  whatsappNumber: string | null;
}

interface AdmissionNotificationResult {
  sent: boolean;
  message?: string;
  error?: string;
}

/**
 * Send welcome WhatsApp message to parent when student is admitted
 * @param params Admission details
 * @returns Result indicating if notification was sent
 */
export async function sendAdmissionWelcome(
  params: AdmissionNotificationParams
): Promise<AdmissionNotificationResult> {
  const {
    studentId,
    studentName,
    organizationId,
    classId,
    admissionDate,
    parentName,
    rollNumber,
    monthlyFee,
    whatsappNumber,
  } = params;

  try {
    console.log('🎓 [Admission Welcome] Starting notification process...');

    // 1. Check if WhatsApp integration is active
    const { data: whatsappSettings, error: settingsError } = await supabaseAdmin
      .from('integration_settings')
      .select('is_active, config')
      .eq('organization_id', organizationId)
      .eq('integration_type', 'whatsapp')
      .single();

    if (settingsError || !whatsappSettings?.is_active) {
      console.log('⏭️  [Admission Welcome] WhatsApp not enabled, skipping notification');
      return { sent: false, message: 'WhatsApp integration not active' };
    }

    // 2. Check if admission welcome is enabled in config (optional)
    const config = whatsappSettings.config || {};
    if (config.enable_admission_welcome === false) {
      console.log('⏭️  [Admission Welcome] Admission welcome disabled in config');
      return { sent: false, message: 'Admission welcome notifications disabled' };
    }

    // 3. Get template for admission_welcome
    const { data: template, error: templateError } = await supabaseAdmin
      .from('reminder_settings')
      .select('id, template_message')
      .eq('organization_id', organizationId)
      .eq('reminder_type', 'admission_welcome')
      .eq('is_enabled', true)
      .single();

    if (templateError || !template) {
      console.log('⏭️  [Admission Welcome] No active admission welcome template found');
      console.log('Template error:', templateError);
      
      // Try without organization filter to see if template exists
      const { data: anyTemplate } = await supabaseAdmin
        .from('reminder_settings')
        .select('id, organization_id, reminder_type, is_enabled')
        .eq('reminder_type', 'admission_welcome')
        .limit(5);
      
      console.log('Available admission welcome templates:', anyTemplate);
      return { sent: false, message: 'No admission welcome template configured' };
    }

    console.log('✅ [Admission Welcome] Template found:', template.id);

    // 4. Verify WhatsApp number
    if (!whatsappNumber) {
      console.log('⏭️  [Admission Welcome] No WhatsApp number provided');
      return { sent: false, message: 'No WhatsApp number configured' };
    }

    // 5. Get class details (if class is assigned)
    let className = 'Not Assigned';
    if (classId) {
      const { data: classData, error: classError } = await supabaseAdmin
        .from('classes')
        .select('name')
        .eq('id', classId)
        .single();

      if (classError) {
        console.error('❌ [Admission Welcome] Class not found:', classError);
        // Don't fail - just use default value
        console.log('⚠️  [Admission Welcome] Proceeding without class name');
      } else {
        className = classData.name;
      }
    } else {
      console.log('ℹ️  [Admission Welcome] No class assigned for this student');
    }

    // 6. Get organization details
    const { data: organization, error: orgError } = await supabaseAdmin
      .from('organizations')
      .select('name')
      .eq('id', organizationId)
      .single();

    if (orgError) {
      console.error('❌ [Admission Welcome] Organization not found:', orgError);
      return { sent: false, error: 'Organization not found' };
    }

    // 7. Format admission date
    const formattedAdmissionDate = new Date(admissionDate).toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'long',
      year: 'numeric'
    });

    // 8. Replace template variables
    const variables = {
      student_name: studentName,
      parent_name: parentName || 'Parent',
      class_name: className,
      roll_number: rollNumber || 'TBA',
      admission_date: formattedAdmissionDate,
      monthly_fee: monthlyFee.toString(),
      organization_name: organization.name,
      date: new Date().toLocaleDateString('en-IN')
    };

    const finalMessage = replaceTemplateVariables(template.template_message, variables);

    console.log('📤 [Admission Welcome] Sending message to:', whatsappNumber);

    // 9. Send WhatsApp message
    const result = await sendWhatsAppMessage({
      phoneNumber: whatsappNumber,
      message: finalMessage,
      organizationId: organizationId,
      messageType: 'admission_welcome',
      relatedStudentId: studentId,
    });

    if (result.success) {
      console.log('✅ [Admission Welcome] Message sent successfully');
      return {
        sent: true,
        message: 'Welcome message sent successfully'
      };
    } else {
      console.error('❌ [Admission Welcome] Failed to send:', result.error);
      return {
        sent: false,
        error: result.error || 'Failed to send message'
      };
    }

  } catch (error: any) {
    console.error('❌ [Admission Welcome] Unexpected error:', error);
    return {
      sent: false,
      error: error.message || 'Unexpected error occurred'
    };
  }
}
