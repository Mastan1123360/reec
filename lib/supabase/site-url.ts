/**
 * lib/supabase/site-url.ts
 *
 * Canonical Application Origin & Site URL Resolver for REEC Academy.
 *
 * Guarantees:
 * 1. Single source of truth for public application URL across client and server.
 * 2. In browser environments (including AI Studio preview and deployed web apps),
 *    window.location.origin is authoritative and never overridden with localhost placeholders.
 * 3. In server environments, extracts public host from headers, APP_URL, NEXT_PUBLIC_SITE_URL, or Vercel URLs.
 * 4. In pure local terminal development without headers or browser context, resolves to http://localhost:3000.
 */

import type { NextRequest } from "next/server";

const LOCALHOST_ORIGIN = "http://localhost:3000";

/**
 * Normalizes a URL string by trimming whitespace and trailing slashes.
 */
export function normalizeUrl(url: string): string {
  let cleaned = url.trim();
  if (!cleaned.startsWith("http://") && !cleaned.startsWith("https://")) {
    cleaned = `https://${cleaned}`;
  }
  return cleaned.replace(/\/+$/, "");
}

/**
 * Returns true if the host string represents a local loopback environment.
 */
export function isLocalhost(hostOrUrl: string): boolean {
  if (!hostOrUrl) return false;
  const lower = hostOrUrl.toLowerCase().trim();
  return (
    lower.includes("localhost") ||
    lower.includes("127.0.0.1") ||
    lower.includes("0.0.0.0") ||
    lower.startsWith("http://localhost") ||
    lower.startsWith("http://127.0.0.1") ||
    lower.startsWith("https://localhost")
  );
}

/**
 * Resolves the canonical public site origin.
 *
 * Priority:
 * 1. Browser runtime: window.location.origin is the exact current user origin.
 *    If on a live preview (e.g. *.run.app or production domain), it is always respected.
 * 2. Explicit NEXT_PUBLIC_APP_URL / APP_URL (AI Studio container environment variable).
 * 3. Explicit NEXT_PUBLIC_SITE_URL / SITE_URL (unless localhost in production).
 * 4. Vercel deployment variables (VERCEL_PROJECT_PRODUCTION_URL, VERCEL_URL).
 * 5. Node development/test fallback: http://localhost:3000.
 * 6. Production fallback: https://reec.academy.
 */
export function getSiteUrl(): string {
  // 1. Client-side runtime: window.location.origin is always the actual user environment
  if (typeof window !== "undefined" && window.location?.origin) {
    const browserOrigin = window.location.origin;
    if (browserOrigin && browserOrigin !== "null") {
      // If we're on a remote host (like *.run.app or custom domain), use it directly
      if (!isLocalhost(browserOrigin)) {
        return normalizeUrl(browserOrigin);
      }
      // If browser is on localhost, check if an explicit production site URL was forced
      const explicitSiteUrl = process.env.NEXT_PUBLIC_SITE_URL;
      if (explicitSiteUrl && !isLocalhost(explicitSiteUrl)) {
        return normalizeUrl(explicitSiteUrl);
      }
      return normalizeUrl(browserOrigin);
    }
  }

  // 2. AI Studio container URL environment variables
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.APP_URL;
  if (appUrl && appUrl.trim().length > 0 && !isLocalhost(appUrl)) {
    return normalizeUrl(appUrl);
  }

  // 3. Explicit configured site URL (e.g. from Vercel / environment config)
  const envSiteUrl = process.env.NEXT_PUBLIC_SITE_URL || process.env.SITE_URL;
  if (envSiteUrl && envSiteUrl.trim().length > 0) {
    const normalized = normalizeUrl(envSiteUrl);
    if (process.env.NODE_ENV === "production" && isLocalhost(normalized)) {
      // Ignore localhost in production env unless no other option exists
    } else {
      return normalized;
    }
  }

  // 4. Vercel System Variables
  const vercelProd =
    process.env.NEXT_PUBLIC_VERCEL_PROJECT_PRODUCTION_URL ||
    process.env.VERCEL_PROJECT_PRODUCTION_URL;
  if (vercelProd && vercelProd.trim().length > 0) {
    return normalizeUrl(`https://${vercelProd.trim()}`);
  }

  const vercelUrl =
    process.env.NEXT_PUBLIC_VERCEL_URL ||
    process.env.VERCEL_URL;
  if (vercelUrl && vercelUrl.trim().length > 0) {
    return normalizeUrl(`https://${vercelUrl.trim()}`);
  }

  // 5. Local Development & Test Fallback
  if (process.env.NODE_ENV === "development" || process.env.NODE_ENV === "test") {
    return LOCALHOST_ORIGIN;
  }

  // 6. Safe Production Default
  return "https://reec.academy";
}

/**
 * Server-side helper to determine the authoritative public origin from an incoming NextRequest.
 * Inspects reverse-proxy headers (x-forwarded-host, x-forwarded-proto, host) to prevent internal
 * container hosts (like localhost:3000 in Docker / Cloud Run / Vercel lambda) from leaking into redirects.
 */
export function getOriginFromRequest(request: NextRequest): string {
  // 1. Inspect headers from reverse proxy
  const forwardedHost = request.headers.get("x-forwarded-host");
  const forwardedProto = request.headers.get("x-forwarded-proto");
  const host = forwardedHost || request.headers.get("host");

  if (host) {
    const isLocal = isLocalhost(host);
    if (!isLocal) {
      const proto = forwardedProto || "https";
      return normalizeUrl(`${proto}://${host}`);
    }

    // If host is localhost, check if an explicit APP_URL or non-local SITE_URL is defined
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.APP_URL;
    if (appUrl && !isLocalhost(appUrl)) {
      return normalizeUrl(appUrl);
    }

    const envSiteUrl = process.env.NEXT_PUBLIC_SITE_URL || process.env.SITE_URL;
    if (envSiteUrl && !isLocalhost(envSiteUrl)) {
      return normalizeUrl(envSiteUrl);
    }

    if (process.env.NODE_ENV === "production") {
      const vercelUrl =
        process.env.VERCEL_PROJECT_PRODUCTION_URL ||
        process.env.VERCEL_URL;
      if (vercelUrl) {
        return normalizeUrl(`https://${vercelUrl}`);
      }
      return "https://reec.academy";
    }

    // Development: preserve local host
    const proto = forwardedProto || "http";
    return `${proto}://${host}`.replace(/\/+$/, "");
  }

  return getSiteUrl();
}

/**
 * Sanitizes a redirect destination path to prevent open redirect attacks.
 * Only allows safe relative paths within the REEC application (e.g. "/", "/roadmap", "/lesson/...").
 */
export function sanitizeInternalRedirect(nextPath: string | null | undefined): string {
  if (!nextPath || typeof nextPath !== "string") {
    return "/";
  }

  const trimmed = nextPath.trim();

  // Must start with a single slash and not double slash (protocol-relative) or backslash
  if (!trimmed.startsWith("/") || trimmed.startsWith("//") || trimmed.startsWith("/\\")) {
    return "/";
  }

  // Disallow dangerous schemes or javascript: URI
  if (
    trimmed.toLowerCase().includes("javascript:") ||
    trimmed.toLowerCase().includes("data:") ||
    trimmed.toLowerCase().includes("vbscript:")
  ) {
    return "/";
  }

  return trimmed;
}

/**
 * Constructs the canonical OAuth callback URL for Supabase authentication.
 */
export function getOAuthCallbackUrl(currentPath?: string): string {
  const origin = getSiteUrl();
  const safeNext = sanitizeInternalRedirect(currentPath || "/");
  if (safeNext === "/") {
    return `${origin}/auth/callback`;
  }
  return `${origin}/auth/callback?next=${encodeURIComponent(safeNext)}`;
}
