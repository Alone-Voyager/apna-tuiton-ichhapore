"use client";

import { useEffect } from "react";
import { Capacitor } from "@capacitor/core";

function isIpAddress(hostname: string) {
  // IPv4 and bracketless IPv6 detection.
  return /^\d{1,3}(\.\d{1,3}){3}$/.test(hostname) || hostname.includes(":");
}

function resolveApiBaseUrl() {
  const nativeDefault = "https://apna-tuiton-ichhapore.vercel.app";
  const fromEnv = process.env.NEXT_PUBLIC_API_PROXY_TARGET?.trim();
  if (fromEnv) {
    const cleaned = fromEnv.replace(/\/$/, "");

    // Avoid localhost targets on native apps where requests originate from the app container.
    if (Capacitor.isNativePlatform()) {
      try {
        const parsed = new URL(cleaned);
        const host = parsed.hostname.toLowerCase();
        if (host === "localhost" || host === "127.0.0.1" || isIpAddress(host)) {
          return nativeDefault;
        }

        // Native builds should only use secure remote endpoints.
        if (parsed.protocol !== "https:") {
          return nativeDefault;
        }
      } catch {
        return nativeDefault;
      }
    }

    return cleaned;
  }

  if (!Capacitor.isNativePlatform()) {
    return null;
  }

  const platform = Capacitor.getPlatform();

  // Android emulator reaches the host machine via 10.0.2.2.
  if (platform === "android") {
    return nativeDefault;
  }

  // iOS simulator can use localhost to access host machine services.
  if (platform === "ios") {
    return nativeDefault;
  }

  return null;
}

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
    if (typeof window === "undefined") {
      return;
    }

    const API_BASE_URL = resolveApiBaseUrl();
    if (!API_BASE_URL) {
      return;
    }

    const proxiedWindow = window as Window & { __apiProxyInstalled?: boolean };
    if (proxiedWindow.__apiProxyInstalled) {
      return;
    }

    const originalFetch = window.fetch;

    window.fetch = async (...args) => {
      let [resource, config] = args;

      if (typeof resource === "string" && resource.startsWith("/api/")) {
        resource = `${API_BASE_URL}${resource}`;
      } else if (
        resource instanceof Request &&
        new URL(resource.url).pathname.startsWith("/api/")
      ) {
        const newUrl = new URL(resource.url);
        if (newUrl.origin === window.location.origin) {
          const proxiedUrl = `${API_BASE_URL}${newUrl.pathname}${newUrl.search}`;
          resource = new Request(proxiedUrl, resource);
        }
      } else if (resource instanceof URL && resource.pathname.startsWith("/api/")) {
        if (resource.origin === window.location.origin) {
          resource = new URL(`${API_BASE_URL}${resource.pathname}${resource.search}`);
        }
      }

      try {
        return await originalFetch(resource, config);
      } catch (err) {
        const attemptedUrl =
          typeof resource === "string"
            ? resource
            : resource instanceof Request
              ? resource.url
              : resource.toString();
        console.error(`[API Proxy] Fetch FAILED for: ${attemptedUrl}`, err);
        throw err;
      }
    };

    proxiedWindow.__apiProxyInstalled = true;
    console.log("[API Proxy] Interceptor active. Redirecting /api/* to " + API_BASE_URL);
  }, []);

  return null;
}
