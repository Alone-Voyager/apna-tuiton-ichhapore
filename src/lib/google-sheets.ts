import { google } from 'googleapis';
import fs from 'fs';
import path from 'path';

const DATA_DIR = path.join(process.cwd(), 'data');
const CONFIG_FILE = path.join(DATA_DIR, 'google-sheets.json');

export interface GoogleSheetsConfig {
  clientEmail: string;
  privateKey: string;
  spreadsheetId: string;
  studentSheetName: string;
  feeSheetName: string;
  isActive: boolean;
}

export function getGoogleSheetsConfig(): GoogleSheetsConfig | null {
  try {
    if (!fs.existsSync(CONFIG_FILE)) {
      return null;
    }
    const data = fs.readFileSync(CONFIG_FILE, 'utf-8');
    return JSON.parse(data);
  } catch (error) {
    console.error('Error reading Google Sheets config:', error);
    return null;
  }
}

export function saveGoogleSheetsConfig(config: GoogleSheetsConfig): void {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    fs.writeFileSync(CONFIG_FILE, JSON.stringify(config, null, 2));
  } catch (error) {
    console.error('Error saving Google Sheets config:', error);
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
  const config = getGoogleSheetsConfig();
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
  const config = getGoogleSheetsConfig();
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
