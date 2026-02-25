const { Client } = require('pg');

async function test() {
    const connectionString = 'postgresql://postgres:BbYuBmouBLMV2LMF@db.gvhguudtztutbxwolsxd.supabase.co:5432/postgres';
    const client = new Client({ connectionString });

    try {
        await client.connect();

        // Check if table users exists
        const res = await client.query(`
      SELECT * FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name = 'users';
    `);
        console.log('Tables matching "users":', res.rows.length);

        // Try a direct insert
        const insertRes = await client.query(`
      INSERT INTO users (username, password_hash, role, status) 
      VALUES ('AT-TEST-DB', 'hash123', 'student', 'active')
      RETURNING id;
    `);
        console.log('Inserted id:', insertRes.rows[0].id);

        // delete it
        await client.query(`DELETE FROM users WHERE username = 'AT-TEST-DB'`);

    } catch (error) {
        console.error('Error:', error);
    } finally {
        await client.end();
    }
}

test();
