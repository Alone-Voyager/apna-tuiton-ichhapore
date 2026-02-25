const fs = require('fs');
const { Client } = require('pg');
const envStr = fs.readFileSync('.env.local', 'utf8');
const env = {};
envStr.split('\n').filter(Boolean).forEach(line => {
    const [key, ...rest] = line.split('=');
    const val = rest.join('=');
    if (key && val) env[key.trim()] = val.trim();
});
const client = new Client({ connectionString: env.SUPABASE_DB_URL });
async function check() {
    await client.connect();
    const userRes = await client.query('SELECT id FROM auth.users WHERE email = $1', ['student@test.com']);
    if (userRes.rows.length === 0) { console.log('no user'); return; }
    const userId = userRes.rows[0].id;
    console.log('User ID:', userId);
    const adminRes = await client.query('SELECT * FROM admin_profiles WHERE user_id = $1', [userId]);
    console.log('Admin Profile:', adminRes.rows);
    const studentRes = await client.query('SELECT * FROM student_profiles WHERE user_id = $1', [userId]);
    console.log('Student Profile:', studentRes.rows);
    await client.query('DELETE FROM admin_profiles WHERE user_id = $1', [userId]);
    console.log('Deleted potential admin profile for this student to prevent redirect bypass.');
    await client.end();
}
check();
