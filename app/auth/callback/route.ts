/**
 * app/auth/callback/route.ts
 *
 * REEC Canonical Auth Callback Route Handler.
 *
 * Exchanges Supabase OAuth authorization codes for authenticated sessions.
 * Guarantees:
 *  1. Exchanges authorization code with Supabase via createClient / exchangeCodeForSession.
 *  2. Inspects both searchParams (query) and hash fragments (#access_token, #error) on the client side.
 *  3. In iframe/popup flows, notifies opener window via postMessage (OAUTH_AUTH_SUCCESS or OAUTH_AUTH_ERROR) and closes cleanly.
 *  4. In direct navigation flows, seamlessly redirects to the safe internal path.
 *  5. Gracefully handles OAuth cancellation, provider denial, or network hiccups with clear visual feedback.
 */

import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { getOriginFromRequest, sanitizeInternalRedirect } from "@/lib/supabase/site-url";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get("code");
  const tokenHash = requestUrl.searchParams.get("token_hash") || requestUrl.searchParams.get("token");
  const type = requestUrl.searchParams.get("type");
  const rawNext = requestUrl.searchParams.get("next");
  const safeNext = sanitizeInternalRedirect(rawNext);
  const queryError = requestUrl.searchParams.get("error");
  const queryErrorDescription =
    requestUrl.searchParams.get("error_description") ||
    requestUrl.searchParams.get("error_code") ||
    queryError;

  let sessionData: any | null = null;
  let authError: string | null = queryErrorDescription || null;

  if (code || tokenHash) {
    const supabaseUrl = (process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL || "").trim();
    const supabaseAnonKey = (process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY || "").trim();

    if (!supabaseUrl || !supabaseAnonKey) {
      console.error("[Auth Callback] Missing Supabase URL or Anon Key in environment");
      authError = "Authentication service configuration missing.";
    } else {
      try {
      const supabase = createClient(supabaseUrl, supabaseAnonKey, {
        auth: {
          persistSession: true,
          autoRefreshToken: true,
        },
      });

      if (code) {
        const { data, error } = await supabase.auth.exchangeCodeForSession(code);
        if (error) {
          console.warn("[Auth Callback] Error exchanging code for session:", error.message);
          authError = error.message;
        } else if (data?.session) {
          sessionData = {
            access_token: data.session.access_token,
            refresh_token: data.session.refresh_token,
            expires_in: data.session.expires_in,
            expires_at: data.session.expires_at,
            token_type: data.session.token_type,
            user: data.session.user,
          };
        }
      } else if (tokenHash && type) {
        const { data, error } = await supabase.auth.verifyOtp({
          token_hash: tokenHash,
          type: type as any,
        });
        if (error) {
          console.warn("[Auth Callback] Error verifying token_hash OTP:", error.message);
          authError = error.message;
        } else if (data?.session) {
          sessionData = {
            access_token: data.session.access_token,
            refresh_token: data.session.refresh_token,
            expires_in: data.session.expires_in,
            expires_at: data.session.expires_at,
            token_type: data.session.token_type,
            user: data.session.user,
          };
        }
      }
    } catch (err) {
      console.warn("[Auth Callback] Unexpected error during authentication exchange:", (err as Error).message);
      authError = (err as Error).message;
    }
    }
  }

  const origin = getOriginFromRequest(request);
  const redirectDestination = new URL(safeNext, origin).toString();

  const supabaseUrl = (process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL || "").trim();
  let storageKey = "sb-auth-token";
  try {
    if (supabaseUrl) {
      const host = new URL(supabaseUrl).hostname;
      const ref = host.split(".")[0];
      if (ref) storageKey = `sb-${ref}-auth-token`;
    }
  } catch {}

  const responseHtml = `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>REEC Cloud Authentication</title>
    <style>
      body {
        margin: 0;
        padding: 0;
        display: flex;
        align-items: center;
        justify-content: center;
        min-height: 100vh;
        background: #090e1a;
        font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
        color: #f8fafc;
      }
      .card {
        background: #111a2e;
        border: 1px solid rgba(255, 255, 255, 0.1);
        padding: 2.25rem;
        border-radius: 1.25rem;
        text-align: center;
        max-width: 420px;
        width: 90%;
        box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5);
      }
      .spinner {
        width: 34px;
        height: 34px;
        border: 3px solid rgba(255, 255, 255, 0.1);
        border-top-color: #3b82f6;
        border-radius: 50%;
        animation: spin 0.8s linear infinite;
        margin: 0 auto 1.25rem;
      }
      .error-icon {
        width: 40px;
        height: 40px;
        border-radius: 50%;
        background: rgba(239, 68, 68, 0.15);
        color: #ef4444;
        display: flex;
        align-items: center;
        justify-content: center;
        margin: 0 auto 1.25rem;
        font-size: 20px;
        font-weight: bold;
      }
      @keyframes spin {
        to { transform: rotate(360deg); }
      }
      h2 {
        font-size: 17px;
        font-weight: 700;
        margin: 0 0 8px;
      }
      p {
        font-size: 13px;
        color: #94a3b8;
        margin: 0 0 1rem;
        line-height: 1.5;
      }
      .btn {
        display: inline-block;
        background: #2563eb;
        color: #ffffff;
        padding: 0.6rem 1.25rem;
        border-radius: 0.75rem;
        font-size: 12px;
        font-weight: 600;
        text-decoration: none;
        cursor: pointer;
        border: none;
      }
      .btn:hover {
        background: #1d4ed8;
      }
    </style>
  </head>
  <body>
    <div class="card" id="status-card">
      <div class="spinner" id="spinner"></div>
      <div class="error-icon" id="error-icon" style="display: none;">!</div>
      <h2 id="title">Authenticating with REEC Cloud</h2>
      <p id="message">Synchronizing your credentials and returning to app...</p>
      <button class="btn" id="action-btn" style="display: none;" onclick="window.close()">Close Window</button>
    </div>
    <script>
      (function() {
        var serverSession = ${JSON.stringify(sessionData)};
        var serverError = ${JSON.stringify(authError)};
        var safeNext = ${JSON.stringify(safeNext)};
        var redirectDestination = ${JSON.stringify(redirectDestination)};

        // Parse hash fragment in case tokens were passed implicitly (#access_token=...)
        var hash = window.location.hash ? window.location.hash.substring(1) : "";
        var hashParams = new URLSearchParams(hash);
        var hashAccessToken = hashParams.get("access_token");
        var hashRefreshToken = hashParams.get("refresh_token");
        var hashError = hashParams.get("error_description") || hashParams.get("error");

        var finalSession = serverSession;
        if (!finalSession && hashAccessToken && hashRefreshToken) {
          finalSession = {
            access_token: hashAccessToken,
            refresh_token: hashRefreshToken,
            expires_in: 3600,
            expires_at: Math.floor(Date.now() / 1000) + 3600,
            token_type: "bearer",
            user: {
              id: hashParams.get("user_id") || "oauth-user",
              email: hashParams.get("email") || null,
              app_metadata: { provider: "oauth" },
              user_metadata: {}
            }
          };
        }

        var finalError = serverError || hashError;

        if (finalError) {
          document.getElementById("spinner").style.display = "none";
          document.getElementById("error-icon").style.display = "flex";
          document.getElementById("title").innerText = "Authentication Incomplete";
          document.getElementById("message").innerText = finalError || "The authentication request was not completed.";
          document.getElementById("action-btn").style.display = "inline-block";

          if (window.opener && !window.opener.closed) {
            try {
              window.opener.postMessage({
                type: "OAUTH_AUTH_ERROR",
                error: finalError
              }, "*");
            } catch (e) {}
          }
          return;
        }

        if (finalSession) {
          // 1. Authoritative storage persistence across device formats (Laptop/Mobile/Tablet)
          try {
            var serialized = JSON.stringify(finalSession);
            var storageKey = ${JSON.stringify(storageKey)};
            localStorage.setItem(storageKey, serialized);
            localStorage.setItem("sb-auth-token", serialized);
            localStorage.setItem("reec_oauth_session", serialized);
          } catch (e) {
            console.warn("[Auth Callback] LocalStorage write warning:", e);
          }

          // 2. Browser cookies for session continuity across iframes & full redirects
          try {
            var enc = encodeURIComponent(JSON.stringify(finalSession));
            document.cookie = storageKey + "=" + enc + "; path=/; max-age=31536000; SameSite=None; Secure";
            document.cookie = "sb-auth-token=" + enc + "; path=/; max-age=31536000; SameSite=None; Secure";
          } catch (e) {}

          // 3. Multi-tab/multi-window synchronization via BroadcastChannel
          try {
            if (typeof BroadcastChannel !== "undefined") {
              var authChannel = new BroadcastChannel("reec_auth_sync");
              authChannel.postMessage({
                type: "OAUTH_AUTH_SUCCESS",
                session: finalSession,
                next: safeNext
              });
            }
          } catch (e) {}

          // 4. PostMessage to opener window (Laptop / Desktop popup flow)
          var hasOpener = false;
          try {
            hasOpener = Boolean(window.opener && !window.opener.closed);
          } catch (e) {
            hasOpener = false;
          }

          if (hasOpener) {
            try {
              window.opener.postMessage({
                type: "OAUTH_AUTH_SUCCESS",
                session: finalSession,
                next: safeNext
              }, "*");
              document.getElementById("title").innerText = "Authentication Successful";
              document.getElementById("message").innerText = "Signed in! Returning to REEC Academy...";
              setTimeout(function() {
                try {
                  window.close();
                } catch (e) {}
              }, 50);
              return;
            } catch (e) {
              console.warn("[Auth Callback] postMessage failed:", e);
            }
          }

          // 5. PostMessage to parent frame (if running in iframe)
          try {
            if (window.parent && window.parent !== window) {
              window.parent.postMessage({
                type: "OAUTH_AUTH_SUCCESS",
                session: finalSession,
                next: safeNext
              }, "*");
            }
          } catch (e) {}

          // 6. Direct navigation / Mobile / Tablet redirect flow
          document.getElementById("title").innerText = "Authentication Successful";
          document.getElementById("message").innerText = "Signed in! Returning to REEC Academy...";
          try {
            sessionStorage.setItem("reec_instant_auth", "true");
            window.dispatchEvent(new CustomEvent("reec_auth_success", { detail: finalSession }));
          } catch (e) {}
          window.location.replace(redirectDestination);
        } else {
          // No session and no explicit error
          if (window.opener && !window.opener.closed) {
            try {
              window.opener.postMessage({
                type: "OAUTH_AUTH_ERROR",
                error: "No authorization session received. Please try again."
              }, "*");
              setTimeout(function() {
                window.close();
              }, 600);
            } catch (e) {
              window.location.replace(redirectDestination);
            }
          } else {
            window.location.replace(redirectDestination);
          }
        }
      })();
    </script>
  </body>
</html>`;

  const response = new NextResponse(responseHtml, {
    status: 200,
    headers: {
      "Content-Type": "text/html; charset=utf-8",
    },
  });

  if (sessionData) {
    try {
      const serialized = JSON.stringify(sessionData);
      response.cookies.set(storageKey, serialized, {
        path: "/",
        maxAge: 31536000,
        sameSite: "none",
        secure: true,
        httpOnly: false,
      });
      response.cookies.set("sb-auth-token", serialized, {
        path: "/",
        maxAge: 31536000,
        sameSite: "none",
        secure: true,
        httpOnly: false,
      });
    } catch {}
  }

  return response;
}

