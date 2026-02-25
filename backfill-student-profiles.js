const { Client } = require('pg');
async function run() {
    const client = new Client({ connectionString: 'postgresql://postgres:BbYuBmouBLMV2LMF@db.gvhguudtztutbxwolsxd.supabase.co:5432/postgres' });
    await client.connect();

    // 1. Get auth users
    const authRes = await client.query("SELECT email, id FROM auth.users WHERE email LIKE '%@apnatuition.local'");

    // 2. Loop and attach
    for (const user of authRes.rows) {
        const username = user.email.split('@')[0].toUpperCase();

        // Find the student
        const studentRes = await client.query(`SELECT id, organization_id, name FROM students WHERE roll_number = $1`, [username]);
        if (studentRes.rows.length > 0) {
            const student = studentRes.rows[0];
            const nameParts = student.name.split(' ');

            // Check if profile exists
            const profRes = await client.query(`SELECT id FROM student_profiles WHERE user_id = $1`, [user.id]);
            if (profRes.rows.length === 0) {
                console.log('Inserting profile for', username);
                try {
                    await client.query(`
            INSERT INTO student_profiles (user_id, student_id, organization_id, email, is_active, must_change_password)
            VALUES ($1, $2, $3, $4, true, true)
          `, [
                        user.id,
                        student.id,
                        student.organization_id,
                        user.email
                    ]);
                    console.log('Success for', username);
                } catch (e) {
                    console.error('Failed to insert for', username, e);
                }
            } else {
                console.log('Profile already exists for', username);
            }
        }
    }

    await client.end();
}
run();
