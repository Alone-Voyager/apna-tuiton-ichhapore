import fs from 'fs';
import path from 'path';
import { Client } from 'pg';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

async function runMigration() {
    const dbUrl = process.env.SUPABASE_DB_URL;
    if (!dbUrl) {
        console.error("No SUPABASE_DB_URL found in .env.local");
        process.exit(1);
    }

    const client = new Client({
        connectionString: dbUrl,
    });

    try {
        await client.connect();
        const filePath = path.join(process.cwd(), 'database', 'migration-assignments-files.sql');
        const sql = fs.readFileSync(filePath, 'utf8');

        console.log("Running migration...");
        await client.query(sql);
        console.log("Migration executed successfully. Calling schema cache reload.");

        // This query asks PostgREST to reload its schema cache
        await client.query(`NOTIFY pgrst, 'reload schema'`);
        console.log("Schema cache reloaded.");

    } catch (e) {
        console.error("Migration failed:", e);
    } finally {
        await client.end();
    }
}

runMigration();
