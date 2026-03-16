"use client";

import { useEffect } from "react";

/**
 * Android APKs built via static export run on `http://localhost` (Capacitor)
 * but don't have a backend node.js server. 
 * This script intercepts all `fetch('/api/...')` calls and proxies them to the
 * developer's actual backend IP (running via npm run dev) so the app works seamlessly.
 *
 * IMPORTANT:
 * - Android Emulator: Use `10.0.2.2` to reach host machine's localhost
 * - Physical Device on same WiFi: Use the host machine's LAN IP (e.g. 172.20.10.9)
 */
export function ApiProxyInit() {
  useEffect(() => {
    // Only run this in the browser environment
    if (typeof window !== "undefined") {
      // Detect if running inside Android emulator vs physical device
      // Android emulators use 10.0.2.2 to reach the host machine's localhost
      // Physical devices need the actual LAN IP
      const userAgent = navigator.userAgent || "";
      
      // For Android Emulator, 10.0.2.2 maps to host's localhost
      // For physical devices, use your machine's LAN IP
      const API_BASE_URL = "http://10.0.2.2:3000";

      const originalFetch = window.fetch;

      window.fetch = async (...args) => {
        let [resource, config] = args;
        
        // If the request is a string path starting with /api/
        if (typeof resource === 'string' && resource.startsWith('/api/')) {
          const proxiedUrl = `${API_BASE_URL}${resource}`;
          console.log(`[API Proxy] Redirecting: ${resource} -> ${proxiedUrl}`);
          resource = proxiedUrl;
        } 
        // If the request object is passed (URL or Request)
        else if (resource instanceof Request && new URL(resource.url).pathname.startsWith('/api/')) {
          const newUrl = new URL(resource.url);
          // Only overwrite if it was a relative-like path originally (origin matches current)
          if (newUrl.origin === window.location.origin) {
            const proxiedUrl = `${API_BASE_URL}${newUrl.pathname}${newUrl.search}`;
            console.log(`[API Proxy] Redirecting Request: ${resource.url} -> ${proxiedUrl}`);
            resource = new Request(proxiedUrl, resource);
          }
        } else if (resource instanceof URL && resource.pathname.startsWith('/api/')) {
             if (resource.origin === window.location.origin) {
                 resource = new URL(`${API_BASE_URL}${resource.pathname}${resource.search}`);
             }
        }

        try {
          return await originalFetch(resource, config);
        } catch (err) {
          console.error(`[API Proxy] Fetch FAILED for: ${typeof resource === 'string' ? resource : (resource instanceof Request ? resource.url : resource.toString())}`, err);
          throw err;
        }
      };
      
      console.log("[API Proxy] Interceptor active. Redirecting /api/* to " + API_BASE_URL);
    }
  }, []);

  return null;
}
