const { Client } = require('pg');

const connectionString = 'postgresql://postgres:Tuition%402025@db.cgbwcayquqpgbnyxnyzw.supabase.co:5432/postgres';

async function migrate() {
  const client = new Client({ connectionString });
  
  try {
    await client.connect();
    
    // Create the table
    const createTableQuery = `
      CREATE TABLE IF NOT EXISTS google_sheets_integrations (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        organization_id TEXT NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
        client_email TEXT NOT NULL,
        private_key TEXT NOT NULL,
        spreadsheet_id TEXT NOT NULL,
        student_sheet_name TEXT DEFAULT 'Students',
        fee_sheet_name TEXT DEFAULT 'Fee Payments',
        is_active BOOLEAN DEFAULT true,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW(),
        UNIQUE(organization_id)
      );
    `;
    
    await client.query(createTableQuery);
    console.log('Successfully created google_sheets_integrations table');
    
  } catch (error) {
    console.error('Migration failed:', error);
  } finally {
    await client.end();
  }
}

migrate();
