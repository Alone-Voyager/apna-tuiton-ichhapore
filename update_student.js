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
async function update() {
    await client.connect();
    const userRes = await client.query('SELECT id FROM auth.users WHERE email = $1', ['student@test.com']);
    if (userRes.rows.length > 0) {
        await client.query('UPDATE student_profiles SET must_change_password = false WHERE user_id = $1', [userRes.rows[0].id]);
        console.log('Updated must_change_password to false');
    }
    await client.end();
}
update();
