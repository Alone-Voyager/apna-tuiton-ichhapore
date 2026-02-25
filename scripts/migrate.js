#!/usr/bin/env node
/**
 * migrate.js — Run database/migration-tests-assignments.sql against Supabase.
 *
 * Strategy (tries in order):
 *  1. Direct PostgreSQL via pg  — uses SUPABASE_DB_* vars from .env.local (fastest)
 *  2. Supabase Management API   — uses SUPABASE_ACCESS_TOKEN from .env.local
 *     Get your token → https://supabase.com/dashboard/account/tokens
 *  3. pg-meta /pg/query         — works on Pro/Team plan
 *  4. Manual SQL editor         — fallback instructions printed
 *
 * Usage:
 *   node scripts/migrate.js
 */

const { readFileSync, existsSync } = require('fs');
const { resolve } = require('path');

// ── Load .env.local ────────────────────────────────────────────────────────
const envPath = resolve(__dirname, '..', '.env.local');

if (!existsSync(envPath)) {
  console.error('ERROR: .env.local not found at project root.');
  process.exit(1);
}

const envContent = readFileSync(envPath, 'utf8');
for (const line of envContent.split('\n')) {
  const trimmed = line.trim();
  if (!trimmed || trimmed.startsWith('#')) continue;
  const idx = trimmed.indexOf('=');
  if (idx === -1) continue;
  const key = trimmed.slice(0, idx).trim();
  const val = trimmed.slice(idx + 1).trim().replace(/^["']|["']$/g, '');
  if (!process.env[key]) process.env[key] = val;
}

// ── Resolve credentials ────────────────────────────────────────────────────
const SUPABASE_URL     = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_ROLE_KEY = process.env.NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY;
const ACCESS_TOKEN     = process.env.SUPABASE_ACCESS_TOKEN;

// Direct DB connection params (preferred — no plan restrictions)
const DB_HOST     = process.env.SUPABASE_DB_HOST;
const DB_PORT     = parseInt(process.env.SUPABASE_DB_PORT || '5432', 10);
const DB_NAME     = process.env.SUPABASE_DB_NAME || 'postgres';
const DB_USER     = process.env.SUPABASE_DB_USER || 'postgres';
const DB_PASSWORD = process.env.SUPABASE_DB_PASSWORD;

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  console.error('ERROR: NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY missing in .env.local');
  process.exit(1);
}

// Extract project ref from URL (e.g. https://gvhguudtztutbxwolsxd.supabase.co)
const PROJECT_REF = SUPABASE_URL.replace('https://', '').split('.')[0];

// ── Read SQL file ──────────────────────────────────────────────────────────
const sqlPath = resolve(__dirname, '..', 'database', 'migration-tests-assignments.sql');
if (!existsSync(sqlPath)) {
  console.error('ERROR: Migration file not found: ' + sqlPath);
  process.exit(1);
}
const sql = readFileSync(sqlPath, 'utf8');

console.log('Running migration against: ' + SUPABASE_URL);
console.log('Project ref: ' + PROJECT_REF);
console.log('SQL file: ' + sqlPath);
console.log('');

// ── Strategy 1: Direct PostgreSQL connection via pg ────────────────────────
async function tryDirectPg() {
  if (!DB_HOST || !DB_PASSWORD) {
    console.log('Direct pg: SUPABASE_DB_HOST or SUPABASE_DB_PASSWORD not set, skipping...');
    return false;
  }
  let pg;
  try { pg = require('pg'); } catch {
    console.log('Direct pg: pg package not installed, skipping...');
    return false;
  }
  const client = new pg.Client({
    host    : DB_HOST,
    port    : DB_PORT,
    database: DB_NAME,
    user    : DB_USER,
    password: DB_PASSWORD,
    ssl     : { rejectUnauthorized: false },
    connectionTimeoutMillis: 10000,
  });
  console.log('Trying direct PostgreSQL connection to ' + DB_HOST + ':' + DB_PORT + '...');
  try {
    await client.connect();
    await client.query(sql);
    await client.end();
    console.log('SUCCESS: Migration applied via direct PostgreSQL connection!');
    return true;
  } catch (e) {
    try { await client.end(); } catch {}
    console.warn('Direct pg failed: ' + e.message);
    return false;
  }
}

// ── Strategy 2: Supabase Management API ───────────────────────────────────
async function tryManagementApi() {
  if (!ACCESS_TOKEN || ACCESS_TOKEN === 'YOUR-SUPABASE-PERSONAL-ACCESS-TOKEN') {
    return false; // no token configured
  }
  console.log('Trying Supabase Management API...');
  const url = 'https://api.supabase.com/v1/projects/' + PROJECT_REF + '/database/query';
  try {
    const res = await fetch(url, {
      method : 'POST',
      headers: {
        'Content-Type' : 'application/json',
        'Authorization': 'Bearer ' + ACCESS_TOKEN,
      },
      body: JSON.stringify({ query: sql }),
    });
    if (res.ok) {
      console.log('SUCCESS: Migration applied via Management API!');
      return true;
    }
    const errText = await res.text();
    console.warn('Management API failed (HTTP ' + res.status + '): ' + errText);
  } catch (e) {
    console.warn('Management API network error: ' + e.message);
  }
  return false;
}

// ── Strategy 3: pg-meta /pg/query (higher-tier plans) ─────────────────────
async function tryPgMeta() {
  console.log('Trying pg-meta /pg/query endpoint...');
  const url = SUPABASE_URL + '/pg/query';
  try {
    const res = await fetch(url, {
      method : 'POST',
      headers: {
        'Content-Type' : 'application/json',
        'Authorization': 'Bearer ' + SERVICE_ROLE_KEY,
        'apikey'       : SERVICE_ROLE_KEY,
      },
      body: JSON.stringify({ query: sql }),
    });
    if (res.ok) {
      console.log('SUCCESS: Migration applied via pg-meta!');
      return true;
    }
    if (res.status !== 404) {
      const errText = await res.text();
      console.warn('pg-meta failed (HTTP ' + res.status + '): ' + errText);
    }
  } catch (e) {
    console.warn('pg-meta network error: ' + e.message);
  }
  return false;
}

// ── Strategy 4: Print manual instructions ─────────────────────────────────
function printManual() {
  const dashboardUrl = 'https://supabase.com/dashboard/project/' + PROJECT_REF + '/sql/new';
  console.log('');
  console.log('='.repeat(70));
  console.log('  AUTO-MIGRATION NOT AVAILABLE ON THIS PLAN');
  console.log('  Run the SQL manually in the Supabase SQL Editor:');
  console.log('');
  console.log('  1. Open: ' + dashboardUrl);
  console.log('  2. Paste the contents of:');
  console.log('       database/migration-tests-assignments.sql');
  console.log('  3. Click "Run"');
  console.log('');
  console.log('  -- OR -- add your personal access token to .env.local:');
  console.log('  Get token: https://supabase.com/dashboard/account/tokens');
  console.log('  Add to .env.local:  SUPABASE_ACCESS_TOKEN=sbp_xxxxxxxxxxxx');
  console.log('  Then re-run:  node scripts/migrate.js');
  console.log('='.repeat(70));
}

async function main() {
  const ok1 = await tryDirectPg();
  if (ok1) return;

  const ok2 = await tryManagementApi();
  if (ok2) return;

  const ok3 = await tryPgMeta();
  if (ok3) return;

  printManual();
  process.exit(1);
}

main().catch(err => {
  console.error('Unexpected error:', err);
  process.exit(1);
});
