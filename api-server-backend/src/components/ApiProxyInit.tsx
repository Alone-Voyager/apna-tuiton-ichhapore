"use client";

import { useEffect } from "react";

/**
 * Android APKs built via static export run on `http://localhost` (Capacitor)
 * but don't have a backend node.js server. 
 * This script intercepts all `fetch('/api/...')` calls and proxies them to the
 * developer's actual backend IP (running via npm run dev) so the app works seamlessly.
 */
export function ApiProxyInit() {
  useEffect(() => {
    // Only run this in the browser environment
    if (typeof window !== "undefined") {
      const isCapacitor = window.location.origin.includes("localhost") || window.location.protocol === "capacitor:";
      // We only strictly *need* this proxy inside the Android Capacitor App,
      // but applying it universally (if it detects the user is on the frontend) works too.
      // For now, let's proxy all /api/ requests to the local dev server.
      
      const API_BASE_URL = "http://172.20.10.9:3000";

      const originalFetch = window.fetch;

      window.fetch = async (...args) => {
        let [resource, config] = args;
        
        // If the request is a string path starting with /api/
        if (typeof resource === 'string' && resource.startsWith('/api/')) {
          resource = `${API_BASE_URL}${resource}`;
        } 
        // If the request object is passed (URL or Request)
        else if (resource instanceof Request && new URL(resource.url).pathname.startsWith('/api/')) {
          const newUrl = new URL(resource.url);
          // Only overwrite if it was a relative-like path originally (origin matches current)
          if (newUrl.origin === window.location.origin) {
            resource = new Request(`${API_BASE_URL}${newUrl.pathname}${newUrl.search}`, resource);
          }
        } else if (resource instanceof URL && resource.pathname.startsWith('/api/')) {
             if (resource.origin === window.location.origin) {
                 resource = new URL(`${API_BASE_URL}${resource.pathname}${resource.search}`);
             }
        }

        return originalFetch(resource, config);
      };
      
      console.log("[API Proxy] Interceptor active. Redirecting /api/* to " + API_BASE_URL);
    }
  }, []);

  return null;
}
