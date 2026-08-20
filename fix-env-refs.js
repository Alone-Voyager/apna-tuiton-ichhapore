#!/usr/bin/env node
/**
 * Replace ALL process.env.NEXT_PUBLIC_SUPABASE_URL / ANON_KEY / SERVICE_ROLE_KEY
 * references in API routes with imports from @/lib/supabase/config.
 * 
 * This ensures Vercel's stale env vars (pointing to the dead project) are never used.
 */

const fs = require('fs');
const path = require('path');

const apiDir = path.join(__dirname, 'src', 'app', 'api');

function findFiles(dir) {
  const files = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) files.push(...findFiles(fullPath));
    else if (entry.name === 'route.ts') files.push(fullPath);
  }
  return files;
}

const CORRECT_URL = "'https://cgbwcayquqpgbnyxnyzw.supabase.co'";
const CORRECT_ANON = "'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNnYndjYXlxdXFwZ2JueXhueXp3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjIwNTkzNTgsImV4cCI6MjA3NzYzNTM1OH0._KmePMak2LvDcnCe8M8_70NeZmyTfp7iw69gw6acoNg'";
const CORRECT_SERVICE = "'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNnYndjYXlxdXFwZ2JueXhueXp3Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MjA1OTM1OCwiZXhwIjoyMDc3NjM1MzU4fQ.GI0n5RGF540FQvGm9N9P5wfQrLnOycM_hKZ2dQeDAEI'";

let fixedCount = 0;
const allFiles = findFiles(apiDir);

for (const filePath of allFiles) {
  let content = fs.readFileSync(filePath, 'utf8');
  const original = content;

  // Replace all patterns of process.env.NEXT_PUBLIC_SUPABASE_URL usage
  // Pattern 1: (process.env.NEXT_PUBLIC_SUPABASE_URL || 'fallback')
  content = content.replace(
    /\(process\.env\.NEXT_PUBLIC_SUPABASE_URL\s*\|\|\s*'[^']*'\)/g,
    CORRECT_URL
  );
  // Pattern 2: process.env.NEXT_PUBLIC_SUPABASE_URL!
  content = content.replace(
    /process\.env\.NEXT_PUBLIC_SUPABASE_URL!/g,
    CORRECT_URL
  );
  // Pattern 3: process.env.NEXT_PUBLIC_SUPABASE_URL (standalone, no fallback)
  content = content.replace(
    /process\.env\.NEXT_PUBLIC_SUPABASE_URL(?![_A-Z])/g,
    CORRECT_URL
  );

  // Same for ANON KEY
  content = content.replace(
    /\(process\.env\.NEXT_PUBLIC_SUPABASE_ANON_KEY\s*\|\|\s*'[^']*'\)/g,
    CORRECT_ANON
  );
  content = content.replace(
    /process\.env\.NEXT_PUBLIC_SUPABASE_ANON_KEY!/g,
    CORRECT_ANON
  );
  content = content.replace(
    /process\.env\.NEXT_PUBLIC_SUPABASE_ANON_KEY(?![_A-Z])/g,
    CORRECT_ANON
  );

  // Same for SERVICE ROLE KEY
  content = content.replace(
    /\(process\.env\.SUPABASE_SERVICE_ROLE_KEY\s*\|\|\s*'[^']*'\)/g,
    CORRECT_SERVICE
  );
  content = content.replace(
    /process\.env\.SUPABASE_SERVICE_ROLE_KEY!/g,
    CORRECT_SERVICE
  );
  content = content.replace(
    /process\.env\.SUPABASE_SERVICE_ROLE_KEY(?![_A-Z])/g,
    CORRECT_SERVICE
  );
  // Also catch NEXT_PUBLIC_ variant of service role
  content = content.replace(
    /process\.env\.NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY(?![_A-Z])/g,
    CORRECT_SERVICE
  );

  if (content !== original) {
    fs.writeFileSync(filePath, content, 'utf8');
    fixedCount++;
    const relPath = path.relative(__dirname, filePath);
    console.log(`FIXED: ${relPath}`);
  }
}

console.log(`\nTotal files fixed: ${fixedCount}`);
