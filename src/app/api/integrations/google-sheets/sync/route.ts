import { NextRequest, NextResponse } from 'next/server';
import { getGoogleSheetsConfig } from '../../../../../lib/google-sheets';
import { supabaseAdmin } from '../../../../../lib/supabase/client';
import { google } from 'googleapis';

export async function POST(request: NextRequest) {
  try {
    const config = await getGoogleSheetsConfig();
    
    if (!config || !config.spreadsheetId) {
      return NextResponse.json(
        { error: 'Google Sheets integration is not configured' },
        { status: 400 }
      );
    }

    const auth = new google.auth.JWT({
      email: config.clientEmail,
      key: config.privateKey.replace(/\\n/g, '\n'),
      scopes: ['https://www.googleapis.com/auth/spreadsheets']
    });
    const sheets = google.sheets({ version: 'v4', auth });

    // 1. Fetch Students
    const { data: students, error: studentsError } = await supabaseAdmin
      .from('students')
      .select('*')
      .order('created_at', { ascending: false });

    if (studentsError) throw studentsError;

    // 2. Fetch Fee Payments
    const { data: fees, error: feesError } = await supabaseAdmin
      .from('fee_payments')
      .select('*, students(name, roll_number)')
      .eq('status', 'Paid')
      .order('payment_date', { ascending: false });

    if (feesError) throw feesError;

    const studentRows = (students || []).map((s: any) => [
      s.id,
      s.name,
      s.roll_number || '',
      s.class_id || '',
      s.phone || '',
      s.whatsapp || '',
      s.parent_name || '',
      s.monthly_fee || 0,
      s.admission_date || '',
      s.status || 'active'
    ]);

    const feeRows = (fees || []).map((f: any) => [
      f.id,
      f.students?.name || '',
      f.students?.roll_number || '',
      f.payment_month || '',
      f.paid_amount || f.amount || 0,
      f.payment_method || 'Cash',
      f.payment_date || '',
      f.receipt_number || '',
      f.status || 'Paid',
      f.notes || ''
    ]);

    if (studentRows.length === 0 && feeRows.length === 0) {
      return NextResponse.json(
        { error: 'Database is empty. Aborting sync to prevent erasing your Google Sheet data.' },
        { status: 400 }
      );
    }

    // 3. Clear and Update Students Sheet
    const studentHeaders = ['ID', 'Name', 'Roll Number', 'Class ID', 'Phone', 'WhatsApp', 'Parent Name', 'Monthly Fee', 'Admission Date', 'Status'];
    if (studentRows.length > 0) {
      await sheets.spreadsheets.values.clear({
        spreadsheetId: config.spreadsheetId,
        range: `${config.studentSheetName}!A:J`,
      });

      await sheets.spreadsheets.values.update({
        spreadsheetId: config.spreadsheetId,
        range: `${config.studentSheetName}!A1`,
        valueInputOption: 'USER_ENTERED',
        requestBody: { values: [studentHeaders, ...studentRows] },
      });
    }

    // 4. Clear and Update Fees Sheet
    const feeHeaders = ['ID', 'Student Name', 'Roll Number', 'Payment Month', 'Amount', 'Payment Method', 'Payment Date', 'Receipt Number', 'Status', 'Notes'];
    if (feeRows.length > 0) {
      await sheets.spreadsheets.values.clear({
        spreadsheetId: config.spreadsheetId,
        range: `${config.feeSheetName}!A:J`,
      });

      await sheets.spreadsheets.values.update({
        spreadsheetId: config.spreadsheetId,
        range: `${config.feeSheetName}!A1`,
        valueInputOption: 'USER_ENTERED',
        requestBody: { values: [feeHeaders, ...feeRows] },
      });
    }

    return NextResponse.json({ success: true, message: `Synced ${studentRows.length} students and ${feeRows.length} fee records.` });
  } catch (error: any) {
    console.error('Error during manual sync:', error);
    return NextResponse.json(
      { error: 'Failed to sync data: ' + error.message },
      { status: 500 }
    );
  }
}
