import { createClient } from '@supabase/supabase-js';
import { createBrowserClient } from '@supabase/ssr';

const DEFAULT_SUPABASE_URL = 'https://cgbwcayquqpgbnyxnyzw.supabase.co';
const DEFAULT_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNnYndjYXlxdXFwZ2JueXhueXp3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjIwNTkzNTgsImV4cCI6MjA3NzYzNTM1OH0._KmePMak2LvDcnCe8M8_70NeZmyTfp7iw69gw6acoNg';
const DEFAULT_SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNnYndjYXlxdXFwZ2JueXhueXp3Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MjA1OTM1OCwiZXhwIjoyMDc3NjM1MzU4fQ._KmePMak2LvDcnCe8M8_70NeZmyTfp7iw69gw6acoNg';

function ensureBrowserEnv(): { url: string; key: string } {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || DEFAULT_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || DEFAULT_ANON_KEY;
  return { url, key };
}

let _browserClient: ReturnType<typeof createBrowserClient> | null = null;
export const supabase: any = new Proxy({}, {
  get(_, prop) {
    if (typeof window === 'undefined') {
      throw new Error('Attempted to access browser Supabase client on the server. Access the client only from client-side code.');
    }
    if (!_browserClient) {
      const { url, key } = ensureBrowserEnv();
      _browserClient = createBrowserClient(url, key);
    }
    // @ts-ignore
    return (_browserClient as any)[prop];
  },
  set(_, prop, value) {
    if (!_browserClient) {
      const { url, key } = ensureBrowserEnv();
      _browserClient = createBrowserClient(url, key);
    }
    // @ts-ignore
    (_browserClient as any)[prop] = value;
    return true;
  }
});

function ensureServerEnv(): { url: string; key: string } {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || DEFAULT_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || 
              process.env.NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY || 
              process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 
              DEFAULT_ANON_KEY;
  return { url, key };
}

let _adminClient: ReturnType<typeof createClient> | null = null;
export const supabaseAdmin: any = new Proxy({}, {
  get(_, prop) {
    if (!_adminClient) {
      const { url, key } = ensureServerEnv();
      _adminClient = createClient(url, key, {
        db: { schema: 'public' },
        auth: { autoRefreshToken: false, persistSession: false }
      } as any);
    }
    // @ts-ignore
    return (_adminClient as any)[prop];
  },
  set(_, prop, value) {
    if (!_adminClient) {
      const { url, key } = ensureServerEnv();
      _adminClient = createClient(url, key, {
        db: { schema: 'public' },
        auth: { autoRefreshToken: false, persistSession: false }
      } as any);
    }
    // @ts-ignore
    (_adminClient as any)[prop] = value;
    return true;
  }
});
