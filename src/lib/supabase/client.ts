import { createClient } from '@supabase/supabase-js';
import { createBrowserClient } from '@supabase/ssr';

// Lazily-initialized browser client. Do NOT create at module import time because
// during Next.js build this module is imported on the server and `createBrowserClient`
// will validate presence of NEXT_PUBLIC_* env vars and throw. We use a small proxy
// that constructs the client on first access in a browser runtime.
function ensureBrowserEnv(): { url: string; key: string } {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) {
    throw new Error('@supabase/ssr: Your project URL and anon key are required to create a Supabase browser client.');
  }
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

// Lazily-initialized server/admin client. We create a proxy that will instantiate
// the real client on first access. This avoids throwing at module import when
// environment variables are not present during build/analysis.
function ensureServerEnv(): { url: string; key: string } {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error('@supabase/ssr: Your project URL and API key are required to create a Supabase admin client!');
  }
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
