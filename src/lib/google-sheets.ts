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
    const { data: setting, error } = await supabaseAdmin
      .from('system_settings')
      .select('setting_value')
      .eq('setting_key', 'google_sheets_config')
      .single();

    if (error || !setting || !setting.setting_value) {
      return null;
    }

    const config = typeof setting.setting_value === 'string' ? JSON.parse(setting.setting_value) : setting.setting_value;

    return {
      clientEmail: config.clientEmail || '',
      privateKey: config.privateKey || '',
      spreadsheetId: config.spreadsheetId || '',
      studentSheetName: config.studentSheetName || 'Students',
      feeSheetName: config.feeSheetName || 'Fee Payments',
      isActive: config.isActive ?? true,
    };
  } catch (error) {
    console.error('Error reading Google Sheets config from DB:', error);
    return null;
  }
}

export async function saveGoogleSheetsConfig(config: GoogleSheetsConfig, organizationId: string = 'default-org'): Promise<void> {
  try {
    const { data: existing } = await supabaseAdmin
      .from('system_settings')
      .select('id')
      .eq('setting_key', 'google_sheets_config')
      .maybeSingle();

    const payload = {
      setting_key: 'google_sheets_config',
      setting_value: config,
      setting_type: 'json',
      description: 'Google Sheets Integration Configuration',
      updated_at: new Date().toISOString(),
    };

    if (existing) {
      await supabaseAdmin.from('system_settings').update(payload).eq('id', existing.id);
    } else {
      await supabaseAdmin.from('system_settings').insert(payload);
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
