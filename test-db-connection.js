const { Client } = require('pg');

async function testConnection() {
  const connectionStrings = [
    'postgresql://postgres.gvhguudtztutbxwolsxd:BbYuBmouBLMV2LMF@aws-0-ap-south-1.pooler.supabase.com:6543/postgres',
    'postgresql://postgres.gvhguudtztutbxwolsxd:BbYuBmouBLMV2LMF@aws-0-ap-south-1.pooler.supabase.com:5432/postgres'
  ];

  for (const conn of connectionStrings) {
    console.log('Testing connection string:', conn.replace(/:BbYuBmouBLMV2LMF@/, ':****@'));
    const client = new Client({ connectionString: conn, connectionTimeoutMillis: 5000 });
    try {
      await client.connect();
      console.log('CONNECTED SUCCESS!');
      const res = await client.query("NOTIFY pgrst, 'reload schema';");
      console.log('NOTIFY pgrst reload schema executed successfully!');
      
      const tables = await client.query(`SELECT table_name FROM information_schema.tables WHERE table_schema='public';`);
      console.log('Public tables:', tables.rows.map(r => r.table_name).join(', '));

      await client.end();
      return;
    } catch (err) {
      console.error('Connection failed:', err.message);
    }
  }
}

testConnection();
