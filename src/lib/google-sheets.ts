import { google } from 'googleapis';
import { supabaseAdmin } from './supabase/client';

export interface GoogleSheetsConfig {
  clientEmail: string;
  privateKey: string;
  spreadsheetId: string;
  studentSheetName: string;
  feeSheetName: string;
  isActive: boolean;
}

export async function getGoogleSheetsConfig(): Promise<GoogleSheetsConfig | null> {
  try {
    const { data: integration, error } = await supabaseAdmin
      .from('integration_settings')
      .select('config, api_key, webhook_secret, is_active')
      .eq('integration_type', 'google_sheets')
      .single();

    if (error || !integration) {
      return null;
    }

    return {
      clientEmail: integration.api_key || '',
      privateKey: integration.webhook_secret || '',
      spreadsheetId: integration.config?.spreadsheetId || '',
      studentSheetName: integration.config?.studentSheetName || 'Students',
      feeSheetName: integration.config?.feeSheetName || 'Fee Payments',
      isActive: integration.is_active ?? true,
    };
  } catch (error) {
    console.error('Error reading Google Sheets config from DB:', error);
    return null;
  }
}

export async function saveGoogleSheetsConfig(config: GoogleSheetsConfig, organizationId: string = 'default-org'): Promise<void> {
  try {
    const { data: existing } = await supabaseAdmin
      .from('integration_settings')
      .select('id')
      .eq('integration_type', 'google_sheets')
      .maybeSingle();

    const payload = {
      organization_id: organizationId,
      integration_type: 'google_sheets',
      api_key: config.clientEmail,
      webhook_secret: config.privateKey,
      is_active: config.isActive,
      config: {
        spreadsheetId: config.spreadsheetId,
        studentSheetName: config.studentSheetName,
        feeSheetName: config.feeSheetName,
      },
      updated_at: new Date().toISOString(),
    };

    if (existing) {
      await supabaseAdmin.from('integration_settings').update(payload).eq('id', existing.id);
    } else {
      await supabaseAdmin.from('integration_settings').insert(payload);
    }
  } catch (error) {
    console.error('Error saving Google Sheets config to DB:', error);
    throw new Error('Failed to save config');
  }
}

async function getGoogleAuth(config: GoogleSheetsConfig) {
  const auth = new google.auth.JWT({
    email: config.clientEmail,
    key: config.privateKey.replace(/\\n/g, '\n'),
    scopes: ['https://www.googleapis.com/auth/spreadsheets']
  });
  return auth;
}

export async function syncStudentToSheet(student: any) {
  const config = await getGoogleSheetsConfig();
  if (!config || !config.isActive || !config.spreadsheetId) return;

  try {
    const auth = await getGoogleAuth(config);
    const sheets = google.sheets({ version: 'v4', auth });

    const values = [
      [
        student.id,
        student.name,
        student.roll_number || '',
        student.class_id || '',
        student.phone || '',
        student.whatsapp || '',
        student.parent_name || '',
        student.monthly_fee || 0,
        student.admission_date || new Date().toISOString(),
        student.status || 'active'
      ]
    ];

    await sheets.spreadsheets.values.append({
      spreadsheetId: config.spreadsheetId,
      range: `${config.studentSheetName}!A1`,
      valueInputOption: 'USER_ENTERED',
      insertDataOption: 'INSERT_ROWS',
      requestBody: { values },
    });
    console.log(`Successfully synced student ${student.name} to Google Sheets`);
  } catch (error) {
    console.error('Error syncing student to Google Sheets:', error);
  }
}

export async function syncFeeToSheet(fee: any, student: any) {
  const config = await getGoogleSheetsConfig();
  if (!config || !config.isActive || !config.spreadsheetId) return;

  try {
    const auth = await getGoogleAuth(config);
    const sheets = google.sheets({ version: 'v4', auth });

    const values = [
      [
        fee.id,
        student?.name || fee.student_name || '',
        student?.roll_number || fee.roll_number || '',
        fee.payment_month || '',
        fee.paid_amount || fee.amount || 0,
        fee.payment_method || 'Cash',
        fee.payment_date || new Date().toISOString(),
        fee.receipt_number || '',
        fee.status || 'Paid',
        fee.notes || ''
      ]
    ];

    await sheets.spreadsheets.values.append({
      spreadsheetId: config.spreadsheetId,
      range: `${config.feeSheetName}!A1`,
      valueInputOption: 'USER_ENTERED',
      insertDataOption: 'INSERT_ROWS',
      requestBody: { values },
    });
    console.log(`Successfully synced fee for ${student?.name || 'student'} to Google Sheets`);
  } catch (error) {
    console.error('Error syncing fee to Google Sheets:', error);
  }
}
