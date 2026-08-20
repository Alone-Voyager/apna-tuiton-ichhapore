// Central Supabase configuration with hardcoded fallbacks
// Rejects old deprecated project domains (gvhguudtztutbxwolsxd) automatically

const HARDCODED_SUPABASE_URL = 'https://cgbwcayquqpgbnyxnyzw.supabase.co';
const HARDCODED_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNnYndjYXlxdXFwZ2JueXhueXp3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjIwNTkzNTgsImV4cCI6MjA3NzYzNTM1OH0._KmePMak2LvDcnCe8M8_70NeZmyTfp7iw69gw6acoNg';
const HARDCODED_SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNnYndjYXlxdXFwZ2JueXhueXp3Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MjA1OTM1OCwiZXhwIjoyMDc3NjM1MzU4fQ.GI0n5RGF540FQvGm9N9P5wfQrLnOycM_hKZ2dQeDAEI';

function sanitizeUrl(url?: string): string {
  if (!url || url.includes('gvhguudtztutbxwolsxd')) {
    return HARDCODED_SUPABASE_URL;
  }
  return url;
}

function sanitizeKey(key: string | undefined, fallback: string): string {
  if (!key || key.includes('gvhguudtztutbxwolsxd')) {
    return fallback;
  }
  return key;
}

export const SUPABASE_URL = sanitizeUrl(process.env.NEXT_PUBLIC_SUPABASE_URL);
export const SUPABASE_ANON_KEY = sanitizeKey(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY, HARDCODED_ANON_KEY);
export const SUPABASE_SERVICE_ROLE_KEY = sanitizeKey(process.env.SUPABASE_SERVICE_ROLE_KEY, HARDCODED_SERVICE_ROLE_KEY);
