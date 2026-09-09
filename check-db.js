const { createClient } = require('@supabase/supabase-js');
const supabaseAdmin = createClient(
  'https://cgbwcayquqpgbnyxnyzw.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNnYndjYXlxdXFwZ2JueXhueXp3Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MjA1OTM1OCwiZXhwIjoyMDc3NjM1MzU4fQ.GI0n5RGF540FQvGm9N9P5wfQrLnOycM_hKZ2dQeDAEI'
);

async function run() {
  const tables = ['students', 'fee_payments', 'fee_payment_history'];
  for (const table of tables) {
    const { data, error } = await supabaseAdmin.from(table).select('organization_id').limit(1);
    if (error) console.error(`Error on ${table}:`, error.message);
    else console.log(`${table} has organization_id`);
  }
}
run();
