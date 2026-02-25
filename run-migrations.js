const fs = require('fs');
const { Client } = require('pg');

const envStr = fs.readFileSync('.env.local', 'utf8');
const env = {};
envStr.split('\n').filter(Boolean).forEach(line => {
    const [key, ...rest] = line.split('=');
    const val = rest.join('=');
    if (key && val) env[key.trim()] = val.trim();
});

async function run() {
    console.log('Connecting to database...');
    if (!env.SUPABASE_DB_URL) {
        console.error('SUPABASE_DB_URL not found in .env.local!');
        return;
    }
    const client = new Client({
        connectionString: env.SUPABASE_DB_URL
    });

    try {
        await client.connect();
        console.log('Connected!');

        // Read migrations
        const m1 = fs.readFileSync('database/migration-new-tables.sql', 'utf8');
        const m2 = fs.readFileSync('database/migration-student-portal.sql', 'utf8');
        const m3 = fs.readFileSync('database/migration-student-signup.sql', 'utf8');
        const m4 = fs.readFileSync('database/migration-test-answers.sql', 'utf8');

        console.log('Running migration 1 (tests/assignments)...');
        await client.query(m1);

        console.log('Running migration 2 (student portal)...');
        await client.query(m2);

        console.log('Running migration 3 (student signup)...');
        await client.query(m3);

        console.log('Running migration 4 (test answers)...');
        await client.query(m4);

        console.log('\n✅ Migrations applied successfully!');

        // -----------------------------------------
        // Set up test student account
        // -----------------------------------------
        console.log('\nSetting up test student data...');
        const email = 'student@test.com';

        // Find organization and class
        const orgRes = await client.query('SELECT id FROM organizations LIMIT 1');
        const orgId = orgRes.rows[0]?.id;

        const classRes = await client.query('SELECT id FROM classes LIMIT 1');
        const classId = classRes.rows[0]?.id;

        // 1. Create User in auth.users (if not exists)
        let userId;
        const authRes = await client.query('SELECT id FROM auth.users WHERE email = $1', [email]);
        if (authRes.rows.length > 0) {
            userId = authRes.rows[0].id;
            console.log('Found user in auth.users:', userId);
        } else {
            console.log('Please create the user in Supabase Auth Dashboard first!');
            console.log('Email:', email);
            return;
        }

        // 2. Create Student in students table (if not exists)
        let studentId;
        const studentRes = await client.query('SELECT id FROM students WHERE name = $1', ['Test Student']);
        if (studentRes.rows.length > 0) {
            studentId = studentRes.rows[0].id;
            console.log('Found student:', studentId);
        } else {
            const newStudentRes = await client.query(
                'INSERT INTO students (name, organization_id, class_id, status, admission_date, monthly_fee, batch) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING id',
                ['Test Student', orgId, classId, 'active', new Date().toISOString().split('T')[0], 1000, 'Morning']
            );
            studentId = newStudentRes.rows[0].id;
            console.log('Created student record:', studentId);
        }

        // 3. Link them in student_profiles
        const profileRes = await client.query('SELECT id FROM student_profiles WHERE user_id = $1', [userId]);
        if (profileRes.rows.length === 0) {
            await client.query(
                'INSERT INTO student_profiles (user_id, student_id, organization_id, email) VALUES ($1, $2, $3, $4)',
                [userId, studentId, orgId, email]
            );
            console.log('Linked auth user to student profile!');
        } else {
            console.log('Student profile link already exists.');
        }

        console.log('\nAll done! You can now test the portal.');
    } catch (err) {
        console.error('Script failed:', err.message);
    } finally {
        await client.end();
    }
}

run();
