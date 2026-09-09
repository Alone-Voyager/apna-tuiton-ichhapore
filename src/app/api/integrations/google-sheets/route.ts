import { NextRequest, NextResponse } from 'next/server';
import { getGoogleSheetsConfig, saveGoogleSheetsConfig, GoogleSheetsConfig } from '../../../../lib/google-sheets';
import { getRequestOrgContext } from '../../../../lib/supabase/server';

export async function GET(request: NextRequest) {
  try {
    const config = await getGoogleSheetsConfig();
    
    if (!config) {
      return NextResponse.json({ config: null });
    }

    // Mask private key before sending to frontend
    const maskedConfig = {
      ...config,
      privateKey: config.privateKey ? '********' : '',
    };

    return NextResponse.json({ config: maskedConfig });
  } catch (error: any) {
    console.error('Error fetching Google Sheets config:', error);
    return NextResponse.json(
      { error: 'Failed to fetch configuration' },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const { user, organizationId } = await getRequestOrgContext(request);
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { clientEmail, privateKey, spreadsheetId, studentSheetName, feeSheetName, isActive } = body;

    // If privateKey is '********', it means it wasn't changed by the user, so keep the old one
    let finalPrivateKey = privateKey;
    if (privateKey === '********') {
      const existingConfig = await getGoogleSheetsConfig();
      if (existingConfig) {
        finalPrivateKey = existingConfig.privateKey;
      }
    }

    // Auto-extract Spreadsheet ID if a full URL is pasted
    let cleanSpreadsheetId = spreadsheetId || '';
    if (cleanSpreadsheetId.includes('/d/')) {
      const match = cleanSpreadsheetId.match(/\/d\/([a-zA-Z0-9-_]+)/);
      if (match && match[1]) {
        cleanSpreadsheetId = match[1];
      }
    }

    const newConfig: GoogleSheetsConfig = {
      clientEmail: clientEmail || '',
      privateKey: finalPrivateKey || '',
      spreadsheetId: cleanSpreadsheetId,
      studentSheetName: studentSheetName || 'Students',
      feeSheetName: feeSheetName || 'Fee Payments',
      isActive: isActive !== undefined ? isActive : true,
    };

    await saveGoogleSheetsConfig(newConfig, organizationId);

    return NextResponse.json({ success: true, message: 'Configuration saved successfully' });
  } catch (error: any) {
    console.error('Error saving Google Sheets config:', error);
    return NextResponse.json(
      { error: 'Failed to save configuration' },
      { status: 500 }
    );
  }
}
