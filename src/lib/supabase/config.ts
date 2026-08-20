// Central Supabase configuration with hardcoded fallbacks
// These ensure the app works even when env vars aren't set (e.g. on Vercel without explicit env config)

export const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://cgbwcayquqpgbnyxnyzw.supabase.co';
export const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNnYndjYXlxdXFwZ2JueXhueXp3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjIwNTkzNTgsImV4cCI6MjA3NzYzNTM1OH0._KmePMak2LvDcnCe8M8_70NeZmyTfp7iw69gw6acoNg';
export const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNnYndjYXlxdXFwZ2JueXhueXp3Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MjA1OTM1OCwiZXhwIjoyMDc3NjM1MzU4fQ.GI0n5RGF540FQvGm9N9P5wfQrLnOycM_hKZ2dQeDAEI';
