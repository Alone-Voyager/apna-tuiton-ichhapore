const fs = require('fs');
const path = require('path');

const URL_FALLBACK = "(process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://cgbwcayquqpgbnyxnyzw.supabase.co')";
const ANON_FALLBACK = "(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNnYndjYXlxdXFwZ2JueXhueXp3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjIwNTkzNTgsImV4cCI6MjA3NzYzNTM1OH0._KmePMak2LvDcnCe8M8_70NeZmyTfp7iw69gw6acoNg')";
const SERVICE_FALLBACK = "(process.env.SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNnYndjYXlxdXFwZ2JueXhueXp3Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MjA1OTM1OCwiZXhwIjoyMDc3NjM1MzU4fQ.GI0n5RGF540FQvGm9N9P5wfQrLnOycM_hKZ2dQeDAEI')";

function processFile(filePath) {
  let content = fs.readFileSync(filePath, 'utf8');
  let originalContent = content;

  // Replace `process.env.NEXT_PUBLIC_SUPABASE_URL!` or `process.env.NEXT_PUBLIC_SUPABASE_URL` 
  // ONLY if not already followed by ` || 'https://...`
  // Actually, we can simplify by first converting ALL `process.env.NEXT_PUBLIC_SUPABASE_URL!` to `process.env.NEXT_PUBLIC_SUPABASE_URL`
  
  // Replace the bangs
  content = content.replace(/process\.env\.NEXT_PUBLIC_SUPABASE_URL!/g, 'process.env.NEXT_PUBLIC_SUPABASE_URL');
  content = content.replace(/process\.env\.NEXT_PUBLIC_SUPABASE_ANON_KEY!/g, 'process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY');
  content = content.replace(/process\.env\.SUPABASE_SERVICE_ROLE_KEY!/g, 'process.env.SUPABASE_SERVICE_ROLE_KEY');

  // Regex to find env vars that are NOT followed by ` || '...'` or enclosed in our parens yet.
  // We can do a negative lookahead for `\s*\|\|` or we can just replace all of them and then clean up duplicates.
  // Let's replace ALL of them with a temporary token, then replace the token with the fallback.
  // Wait, what if they were already replaced by my sed? Then they look like `(process.env.VAR || 'fallback')`
  // Let's just use a regex that matches `process.env.VAR` NOT preceded by `\(` and NOT followed by `\s*\|\|`.
  
  const replacer = (regex, fallback) => {
    return content.replace(regex, (match, p1, p2, p3, offset, string) => {
      // If it's already part of our fallback or has a fallback, skip
      if (string.slice(offset, offset + fallback.length) === fallback) return match;
      if (string.slice(Math.max(0, offset - 1), offset) === '(' && string.slice(offset).includes('|| \'http')) return match;
      if (string.slice(Math.max(0, offset - 1), offset) === '(' && string.slice(offset).includes('|| \'eyJ')) return match;
      
      return fallback;
    });
  };

  // Actually a simpler way: just replace all occurrences of `process.env.VAR` that are not already our fallback string
  // To do this reliably:
  
  // 1. Revert any existing fallbacks back to just `process.env.VAR` to normalize.
  content = content.replace(/\(process\.env\.NEXT_PUBLIC_SUPABASE_URL \|\| 'https:\/\/cgbwcayquqpgbnyxnyzw\.supabase\.co'\)/g, 'process.env.NEXT_PUBLIC_SUPABASE_URL');
  content = content.replace(/process\.env\.NEXT_PUBLIC_SUPABASE_URL \|\| 'https:\/\/cgbwcayquqpgbnyxnyzw\.supabase\.co'/g, 'process.env.NEXT_PUBLIC_SUPABASE_URL');
  
  content = content.replace(/\(process\.env\.NEXT_PUBLIC_SUPABASE_ANON_KEY \|\| 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9\.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNnYndjYXlxdXFwZ2JueXhueXp3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjIwNTkzNTgsImV4cCI6MjA3NzYzNTM1OH0\._KmePMak2LvDcnCe8M8_70NeZmyTfp7iw69gw6acoNg'\)/g, 'process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY');
  content = content.replace(/process\.env\.NEXT_PUBLIC_SUPABASE_ANON_KEY \|\| 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9\.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNnYndjYXlxdXFwZ2JueXhueXp3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjIwNTkzNTgsImV4cCI6MjA3NzYzNTM1OH0\._KmePMak2LvDcnCe8M8_70NeZmyTfp7iw69gw6acoNg'/g, 'process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY');
  
  content = content.replace(/\(process\.env\.SUPABASE_SERVICE_ROLE_KEY \|\| 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9\.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNnYndjYXlxdXFwZ2JueXhueXp3Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MjA1OTM1OCwiZXhwIjoyMDc3NjM1MzU4fQ\.GI0n5RGF540FQvGm9N9P5wfQrLnOycM_hKZ2dQeDAEI'\)/g, 'process.env.SUPABASE_SERVICE_ROLE_KEY');
  content = content.replace(/process\.env\.SUPABASE_SERVICE_ROLE_KEY \|\| 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9\.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNnYndjYXlxdXFwZ2JueXhueXp3Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MjA1OTM1OCwiZXhwIjoyMDc3NjM1MzU4fQ\.GI0n5RGF540FQvGm9N9P5wfQrLnOycM_hKZ2dQeDAEI'/g, 'process.env.SUPABASE_SERVICE_ROLE_KEY');

  // 2. Now replace ALL `process.env.VAR` (except in console.log or !! boolean checks if we want, but let's just replace all)
  // Wait, if it's `!!process.env.SUPABASE_SERVICE_ROLE_KEY` it will become `!!(process.env.SUPABASE_SERVICE_ROLE_KEY || '...')` which is always true. That's actually correct if we are hardcoding the fallback!
  content = content.replace(/process\.env\.NEXT_PUBLIC_SUPABASE_URL/g, URL_FALLBACK);
  content = content.replace(/process\.env\.NEXT_PUBLIC_SUPABASE_ANON_KEY/g, ANON_FALLBACK);
  content = content.replace(/process\.env\.SUPABASE_SERVICE_ROLE_KEY/g, SERVICE_FALLBACK);

  // 3. Remove 503 error blocks
  // Specifically: 
  // if (!supabaseUrl || !supabaseAnonKey || !supabaseServiceRoleKey) { ... }
  // if (!supabaseUrl || !supabaseKey) { ... }
  // Let's use a regex to match these blocks
  content = content.replace(/if\s*\(\s*!supabaseUrl\s*\|\|[^{]*\)\s*\{\s*console\.error[^}]*return\s*NextResponse\.json\([^}]*\}[^}]*\}[^}]*\}/gs, '');
  content = content.replace(/if\s*\(\s*!supabaseUrl\s*\|\|[^{]*\)\s*\{[^}]*return\s*NextResponse\.json\([^}]*\}[^}]*\}[^}]*\}/gs, '');
  
  // Custom for check-scheduled and check-reminders
  content = content.replace(/if\s*\(!supabaseUrl \|\| !supabaseKey\)\s*\{[\s\S]*?return NextResponse\.json\([\s\S]*?\}\);?\s*\}/g, '');

  if (content !== originalContent) {
    fs.writeFileSync(filePath, content, 'utf8');
    console.log('Updated: ' + filePath);
  }
}

function walkDir(dir) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const fullPath = path.join(dir, file);
    if (fs.statSync(fullPath).isDirectory()) {
      walkDir(fullPath);
    } else if (fullPath.endsWith('.ts')) {
      processFile(fullPath);
    }
  }
}

walkDir(path.join(__dirname, 'src/app/api'));
