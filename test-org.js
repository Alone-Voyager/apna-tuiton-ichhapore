const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://gvhguudtztutbxwolsxd.supabase.co';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function check() {
  console.log('Connecting to Supabase at:', supabaseUrl);

  const { data: orgs, error: orgErr } = await supabase.from('organizations').select('*');
  console.log('\n--- ORGANIZATIONS (' + (orgs?.length || 0) + ') ---');
  if (orgErr) console.error('Error fetching orgs:', orgErr);
  else console.table(orgs);

  const { data: admins, error: adminErr } = await supabase.from('admin_profiles').select('*');
  console.log('\n--- ADMIN PROFILES (' + (admins?.length || 0) + ') ---');
  if (adminErr) console.error('Error fetching admin profiles:', adminErr);
  else console.table(admins);
}

check();
