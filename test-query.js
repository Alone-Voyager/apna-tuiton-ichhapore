const { Client } = require('pg');
async function run() {
    const client = new Client({ connectionString: 'postgresql://postgres:BbYuBmouBLMV2LMF@db.gvhguudtztutbxwolsxd.supabase.co:5432/postgres' });
    await client.connect();
    const res = await client.query("SELECT email, id FROM auth.users WHERE email LIKE '%@apnatuition.local'");
    console.log('auth.users:', res.rows);
    const profiles = await client.query("SELECT * FROM student_profiles");
    console.log('student_profiles:', profiles.rows);
    await client.end();
}
run();
