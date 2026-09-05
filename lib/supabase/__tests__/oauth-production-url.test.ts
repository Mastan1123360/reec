/**
 * lib/supabase/__tests__/oauth-production-url.test.ts
 *
 * Comprehensive Test Suite for REEC Production OAuth & Canonical URL Engine.
 *
 * Tests:
 *  1. Production OAuth URL never resolves to localhost:3000.
 *  2. Local development OAuth URL correctly uses localhost:3000 in node server context.
 *  3. Google OAuth callback URL generation is correct.
 *  4. GitHub OAuth callback URL generation is correct.
 *  5. NextRequest origin extraction handles reverse-proxy container headers properly.
 *  6. Open redirect attempts (external URLs, javascript:, etc.) are blocked and sanitized.
 *  7. VERCEL_URL and NEXT_PUBLIC_SITE_URL are respected.
 *  8. APP_URL and NEXT_PUBLIC_APP_URL container variables are respected without localhost override.
 */

import { describe, it, expect, beforeEach, afterEach } from "vitest";
import {
  getSiteUrl,
  getOriginFromRequest,
  sanitizeInternalRedirect,
  getOAuthCallbackUrl,
  isLocalhost,
} from "../site-url";
import { NextRequest } from "next/server";

describe("OAuth & Canonical Origin Resolution", () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    process.env = { ...originalEnv };
    delete process.env.NEXT_PUBLIC_SITE_URL;
    delete process.env.SITE_URL;
    delete process.env.VERCEL_URL;
    delete process.env.VERCEL_PROJECT_PRODUCTION_URL;
    delete process.env.NEXT_PUBLIC_VERCEL_URL;
    delete process.env.APP_URL;
    delete process.env.NEXT_PUBLIC_APP_URL;
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it("1. Resolves canonical origin from NEXT_PUBLIC_SITE_URL in production", () => {
    (process.env as Record<string, string | undefined>).NODE_ENV = "production";
    process.env.NEXT_PUBLIC_SITE_URL = "https://reec.academy";

    const origin = getSiteUrl();
    expect(origin).toBe("https://reec.academy");
    expect(origin).not.toContain("localhost:3000");
  });

  it("2. Resolves canonical origin from VERCEL_PROJECT_PRODUCTION_URL when configured", () => {
    (process.env as Record<string, string | undefined>).NODE_ENV = "production";
    process.env.VERCEL_PROJECT_PRODUCTION_URL = "reec-production.vercel.app";

    const origin = getSiteUrl();
    expect(origin).toBe("https://reec-production.vercel.app");
    expect(origin).not.toContain("localhost:3000");
  });

  it("3. Correctly uses localhost:3000 in development environment when no cloud host or window exists", () => {
    (process.env as Record<string, string | undefined>).NODE_ENV = "development";

    const origin = getSiteUrl();
    expect(origin).toBe("http://localhost:3000");
  });

  it("4. Prevents accidental localhost:3000 override in production environment", () => {
    (process.env as Record<string, string | undefined>).NODE_ENV = "production";
    process.env.NEXT_PUBLIC_SITE_URL = "http://localhost:3000";
    process.env.VERCEL_URL = "reec-staging.vercel.app";

    const origin = getSiteUrl();
    expect(origin).not.toBe("http://localhost:3000");
    expect(origin).toBe("https://reec-staging.vercel.app");
  });

  it("5. Respects APP_URL and NEXT_PUBLIC_APP_URL from container environment", () => {
    (process.env as Record<string, string | undefined>).NODE_ENV = "development";
    process.env.NEXT_PUBLIC_APP_URL = "https://ais-dev-p7aae4xm2uxgoawfx346r2-621681935111.asia-east1.run.app";

    const origin = getSiteUrl();
    expect(origin).toBe("https://ais-dev-p7aae4xm2uxgoawfx346r2-621681935111.asia-east1.run.app");
    expect(origin).not.toContain("localhost");
  });

  it("6. Generates canonical OAuth callback URL for Google and GitHub sign-in", () => {
    (process.env as Record<string, string | undefined>).NODE_ENV = "production";
    process.env.NEXT_PUBLIC_SITE_URL = "https://reec.academy";

    const callbackDefault = getOAuthCallbackUrl("/");
    expect(callbackDefault).toBe("https://reec.academy/auth/callback");

    const callbackWithNext = getOAuthCallbackUrl("/lesson/phase-01/week-03/day-02");
    expect(callbackWithNext).toBe(
      "https://reec.academy/auth/callback?next=%2Flesson%2Fphase-01%2Fweek-03%2Fday-02"
    );
    expect(callbackWithNext).not.toContain("localhost:3000");
  });

  it("7. getOriginFromRequest handles reverse-proxy container headers in production", () => {
    (process.env as Record<string, string | undefined>).NODE_ENV = "production";

    // Simulate Cloud Run / Vercel proxy forwarding from user's domain
    const req = new NextRequest("http://127.0.0.1:3000/auth/callback?code=abc", {
      headers: {
        "x-forwarded-host": "reec.academy",
        "x-forwarded-proto": "https",
      },
    });

    const origin = getOriginFromRequest(req);
    expect(origin).toBe("https://reec.academy");
    expect(origin).not.toContain("127.0.0.1");
    expect(origin).not.toContain("localhost");
  });

  it("8. getOriginFromRequest preserves local development host when NODE_ENV is development", () => {
    (process.env as Record<string, string | undefined>).NODE_ENV = "development";

    const req = new NextRequest("http://localhost:3000/auth/callback?code=abc", {
      headers: {
        host: "localhost:3000",
      },
    });

    const origin = getOriginFromRequest(req);
    expect(origin).toBe("http://localhost:3000");
  });

  it("9. Sanitizes redirect URLs to block open redirects and malicious targets", () => {
    // Relative safe paths
    expect(sanitizeInternalRedirect("/roadmap")).toBe("/roadmap");
    expect(sanitizeInternalRedirect("/lesson/phase-00/week-01/day-01")).toBe(
      "/lesson/phase-00/week-01/day-01"
    );
    expect(sanitizeInternalRedirect("/settings")).toBe("/settings");

    // Malicious open redirect attempts
    expect(sanitizeInternalRedirect("https://evil.com")).toBe("/");
    expect(sanitizeInternalRedirect("//evil.com/phish")).toBe("/");
    expect(sanitizeInternalRedirect("/\\evil.com")).toBe("/");
    expect(sanitizeInternalRedirect("javascript:alert(1)")).toBe("/");
    expect(sanitizeInternalRedirect(null)).toBe("/");
    expect(sanitizeInternalRedirect("")).toBe("/");
  });

  it("10. isLocalhost helper accurately detects local addresses", () => {
    expect(isLocalhost("http://localhost:3000")).toBe(true);
    expect(isLocalhost("localhost:3000")).toBe(true);
    expect(isLocalhost("127.0.0.1")).toBe(true);
    expect(isLocalhost("https://reec.academy")).toBe(false);
    expect(isLocalhost("https://reec-prod.vercel.app")).toBe(false);
  });
});
