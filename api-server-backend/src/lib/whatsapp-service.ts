/**
 * WhatsApp Service - Wassender API Integration
 * Provides functions to send WhatsApp messages via Wassender API
 */

import { supabaseAdmin } from '../lib/supabase/client';

interface SendMessageParams {
  phoneNumber: string;
  message: string;
  organizationId: string;
  messageType?: 'fee_reminder' | 'attendance_alert' | 'admission_update' | 'payment_confirmation' | 'admission_welcome' | 'manual';
  relatedStudentId?: string;
  relatedNotificationId?: string;
  relatedReminderId?: string;
}

interface SendMessageResponse {
  success: boolean;
  messageId?: string;
  error?: string;
}

/**
 * Format phone number for WhatsApp (E.164 format)
 * @param phone - Phone number (can include country code or not)
 * @returns Formatted phone number with country code
 */
export function formatPhoneNumber(phone: string): string {
  // Remove all non-digit characters
  let cleaned = phone.replace(/\D/g, '');
  
  // If number starts with 0, remove it (Indian numbers)
  if (cleaned.startsWith('0')) {
    cleaned = cleaned.substring(1);
  }
  
  // If number doesn't start with country code, add Indian country code (91)
  if (!cleaned.startsWith('91') && cleaned.length === 10) {
    cleaned = '91' + cleaned;
  }
  
  return cleaned;
}

/**
 * Send a WhatsApp message via Wassender API
 * @param params - Message parameters
 * @returns Response with success status and message ID
 */
export async function sendWhatsAppMessage(params: SendMessageParams): Promise<SendMessageResponse> {
  const {
    phoneNumber,
    message,
    organizationId,
    messageType = 'manual',
    relatedStudentId,
    relatedNotificationId,
    relatedReminderId,
  } = params;

  try {
    // Format phone number
    const formattedPhone = formatPhoneNumber(phoneNumber);
    
    console.log(`📱 Formatting phone: ${phoneNumber} → ${formattedPhone}`);
    
    // Get API key from database (integration_settings table)
    const { data: integration, error: integrationError } = await supabaseAdmin
      .from('integration_settings')
      .select('api_key, is_active')
      .eq('organization_id', organizationId)
      .eq('integration_type', 'whatsapp')
      .single();

    if (integrationError || !integration) {
      console.error('❌ Failed to get WhatsApp integration from database:', integrationError);
      return { success: false, error: 'WhatsApp API not configured for your organization' };
    }

    if (!integration.is_active) {
      console.error('❌ WhatsApp integration is disabled');
      return { success: false, error: 'WhatsApp integration is disabled' };
    }

    const apiKey = integration.api_key;
    
    if (!apiKey) {
      console.error('❌ WhatsApp API key not configured for organization');
      return { success: false, error: 'WhatsApp API not configured' };
    }

    // Send message via Wassender API
    console.log(`📤 Sending WhatsApp message to ${formattedPhone}`);
    const response = await fetch('https://wasenderapi.com/api/send-message', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        to: formattedPhone,
        text: message,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error('❌ Wassender API error:', errorData);
      console.error('Response status:', response.status, response.statusText);
      
      // Log failed message
      await logMessage({
        organizationId,
        phoneNumber: formattedPhone,
        messageType,
        messageText: message,
        relatedStudentId,
        relatedNotificationId,
        relatedReminderId,
        status: 'failed',
        errorMessage: errorData.message || 'Failed to send message',
      });

      return { 
        success: false, 
        error: errorData.message || 'Failed to send WhatsApp message' 
      };
    }

    const data = await response.json();
    const messageId = data.messageId || data.id;

    console.log(`✅ WhatsApp message sent successfully! Message ID: ${messageId}`);

    // Log successful message
    await logMessage({
      organizationId,
      phoneNumber: formattedPhone,
      messageType,
      messageText: message,
      relatedStudentId,
      relatedNotificationId,
      relatedReminderId,
      status: 'sent',
      wassenderMessageId: messageId,
    });

    return { success: true, messageId };

  } catch (error: any) {
    console.error('Error sending WhatsApp message:', error);
    
    // Log failed message
    await logMessage({
      organizationId,
      phoneNumber: formatPhoneNumber(phoneNumber),
      messageType,
      messageText: message,
      relatedStudentId,
      relatedNotificationId,
      relatedReminderId,
      status: 'failed',
      errorMessage: error.message || 'Network error',
    });

    return { success: false, error: error.message || 'Failed to send message' };
  }
}

/**
 * Log WhatsApp message to database
 */
async function logMessage(params: {
  organizationId: string;
  phoneNumber: string;
  messageType: string;
  messageText: string;
  relatedStudentId?: string;
  relatedNotificationId?: string;
  relatedReminderId?: string;
  status: string;
  wassenderMessageId?: string;
  errorMessage?: string;
}) {
  try {
    // Insert log entry into whatsapp_messages table
    const { error } = await supabaseAdmin
      .from('whatsapp_messages')
      .insert({
        organization_id: params.organizationId,
        phone_number: params.phoneNumber,
        message_type: params.messageType,
        message: params.messageText,
        related_student_id: params.relatedStudentId,
        related_notification_id: params.relatedNotificationId,
        status: params.status,
        response: params.wassenderMessageId ? { message_id: params.wassenderMessageId } : null,
      });

    if (error) {
      console.error('❌ Failed to log WhatsApp message:', error);
    } else {
      console.log('✅ WhatsApp message logged successfully');
    }
  } catch (error) {
    console.error('❌ Error logging WhatsApp message:', error);
  }
}

/**
 * Send bulk WhatsApp messages
 * @param messages - Array of message parameters
 * @returns Array of results
 */
export async function sendBulkWhatsAppMessages(
  messages: SendMessageParams[]
): Promise<SendMessageResponse[]> {
  const results: SendMessageResponse[] = [];
  
  // Send messages with delay to avoid rate limiting
  for (const message of messages) {
    const result = await sendWhatsAppMessage(message);
    results.push(result);
    
    // Add delay between messages (5 seconds for Wassender API protection)
    await new Promise(resolve => setTimeout(resolve, 5000));
  }
  
  return results;
}

/**
 * Replace template variables in message text
 * @param template - Message template with variables like {{student_name}} or [STUDENT_NAME]
 * @param variables - Object with variable values
 * @returns Message with replaced variables
 */
export function replaceTemplateVariables(
  template: string,
  variables: Record<string, string | number>
): string {
  let message = template;
  
  // Replace all {{variable}} patterns (lowercase)
  Object.keys(variables).forEach(key => {
    const pattern = new RegExp(`{{${key}}}`, 'g');
    message = message.replace(pattern, String(variables[key]));
  });
  
  // Replace all [VARIABLE] patterns (uppercase, case-insensitive)
  Object.keys(variables).forEach(key => {
    const upperKey = key.toUpperCase();
    const pattern = new RegExp(`\\[${upperKey}\\]`, 'gi');
    message = message.replace(pattern, String(variables[key]));
  });
  
  return message;
}

/**
 * Check if WhatsApp is configured and enabled for an organization
 * @param organizationId - Organization ID
 * @returns Boolean indicating if WhatsApp is enabled
 */
export async function isWhatsAppEnabled(organizationId: string): Promise<boolean> {
  try {
    const response = await fetch('/api/integrations/whatsapp/status', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ organizationId }),
    });

    if (!response.ok) return false;

    const data = await response.json();
    return data.enabled && data.connected;
  } catch (error) {
    console.error('Error checking WhatsApp status:', error);
    return false;
  }
}
