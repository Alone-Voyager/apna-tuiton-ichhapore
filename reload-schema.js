const { Client } = require('pg');

async function reload() {
    const connectionString = 'postgresql://postgres:BbYuBmouBLMV2LMF@db.gvhguudtztutbxwolsxd.supabase.co:5432/postgres';
    const client = new Client({ connectionString });

    try {
        await client.connect();
        await client.query(`NOTIFY pgrst, 'reload schema';`);
        console.log('PostgREST schema cache reloaded!');

        // Let's also check if user_id is properly defined
        const res = await client.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'students';
    `);
        console.log(res.rows);

    } catch (error) {
        console.error('Migration failed:', error);
    } finally {
        await client.end();
    }
}

reload();
