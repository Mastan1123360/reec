/**
 * app/auth/callback/route.ts
 *
 * REEC Flawless Canonical Auth Callback Route Handler.
 *
 * Exchanges Supabase OAuth authorization codes for authenticated sessions across all
 * environments (Iframe previews, popups, full-page mobile redirects, cross-tab BroadcastChannel).
 *
 * Resilient Architecture:
 *  1. Server-side exchange: Leverages cookies if available.
 *  2. Client-side fallback: In browser context, exchanges PKCE code via Supabase REST API using
 *     code_verifier stored in localStorage / cookies.
 *  3. Hash fragment fallback: Extracts implicit tokens (#access_token, #refresh_token).
 *  4. Cancellation handling: Gracefully notifies opener window of user cancellation (access_denied)
 *     without error alerts or hanging spinners.
 *  5. Instant session & profile persistence: Writes session to localStorage and cookies, pre-seeds
 *     profile cache, and notifies via postMessage and BroadcastChannel.
 *  6. Auto-closes popup window or redirects to internal safe path.
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
  const queryErrorCode = requestUrl.searchParams.get("error_code");
  const queryErrorDescription =
    requestUrl.searchParams.get("error_description") || queryErrorCode || queryError;

  const isUserCancellation =
    queryError === "access_denied" ||
    queryErrorCode === "access_denied" ||
    (queryErrorDescription && queryErrorDescription.toLowerCase().includes("user denied"));

  let sessionData: any | null = null;
  let serverAuthError: string | null = isUserCancellation ? null : queryErrorDescription || null;

  const supabaseUrl = (process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL || "").trim();
  const supabaseAnonKey = (process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY || "").trim();

  // Attempt server-side exchange if credentials and code/token exist
  if ((code || tokenHash) && supabaseUrl && supabaseAnonKey) {
    try {
      const cookieStore = new Map<string, string>();
      request.cookies.getAll().forEach((c) => {
        cookieStore.set(c.name, c.value);
        try {
          cookieStore.set(c.name, decodeURIComponent(c.value));
        } catch {}
      });

      const serverSupabase = createClient(supabaseUrl, supabaseAnonKey, {
        auth: {
          persistSession: false,
          autoRefreshToken: false,
          storage: {
            getItem: (key: string) => cookieStore.get(key) || null,
            setItem: () => {},
            removeItem: () => {},
          },
        },
      });

      if (code) {
        const { data, error } = await serverSupabase.auth.exchangeCodeForSession(code);
        if (error) {
          // Do not fail immediately on server; client-side browser will attempt PKCE exchange with local storage
          console.warn("[OAuth Callback] Server-side exchange note:", error.message);
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
        const { data, error } = await serverSupabase.auth.verifyOtp({
          token_hash: tokenHash,
          type: type as any,
        });
        if (!error && data?.session) {
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
      console.warn("[OAuth Callback] Server auth error:", (err as Error).message);
    }
  }

  const origin = getOriginFromRequest(request);
  const redirectDestination = new URL(safeNext, origin).toString();

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
      * { box-sizing: border-box; }
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
        padding: 2.5rem 2rem;
        border-radius: 1.25rem;
        text-align: center;
        max-width: 400px;
        width: 90%;
        box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.6);
      }
      .spinner {
        width: 36px;
        height: 36px;
        border: 3px solid rgba(255, 255, 255, 0.12);
        border-top-color: #38bdf8;
        border-radius: 50%;
        animation: spin 0.75s linear infinite;
        margin: 0 auto 1.25rem;
      }
      .icon-box {
        width: 44px;
        height: 44px;
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        margin: 0 auto 1.25rem;
        font-size: 20px;
        font-weight: bold;
      }
      .icon-error {
        background: rgba(239, 68, 68, 0.15);
        color: #ef4444;
        border: 1px solid rgba(239, 68, 68, 0.3);
      }
      .icon-success {
        background: rgba(34, 197, 94, 0.15);
        color: #22c55e;
        border: 1px solid rgba(34, 197, 94, 0.3);
      }
      .icon-info {
        background: rgba(56, 189, 248, 0.15);
        color: #38bdf8;
        border: 1px solid rgba(56, 189, 248, 0.3);
      }
      @keyframes spin {
        to { transform: rotate(360deg); }
      }
      h2 {
        font-size: 18px;
        font-weight: 700;
        margin: 0 0 8px;
        letter-spacing: -0.01em;
      }
      p {
        font-size: 13px;
        color: #94a3b8;
        margin: 0 0 1.25rem;
        line-height: 1.5;
      }
      .btn {
        display: inline-block;
        background: #2563eb;
        color: #ffffff;
        padding: 0.65rem 1.5rem;
        border-radius: 0.75rem;
        font-size: 13px;
        font-weight: 600;
        text-decoration: none;
        cursor: pointer;
        border: none;
        transition: background 0.15s ease;
      }
      .btn:hover {
        background: #1d4ed8;
      }
    </style>
  </head>
  <body>
    <div class="card" id="status-card">
      <div class="spinner" id="spinner"></div>
      <div class="icon-box icon-error" id="error-icon" style="display: none;">!</div>
      <div class="icon-box icon-success" id="success-icon" style="display: none;">✓</div>
      <div class="icon-box icon-info" id="info-icon" style="display: none;">i</div>
      <h2 id="title">Authenticating with REEC Cloud</h2>
      <p id="message">Synchronizing your credentials and returning to app...</p>
      <button class="btn" id="action-btn" style="display: none;" onclick="window.close()">Close Window</button>
    </div>

    <script>
      (async function() {
        var serverSession = ${JSON.stringify(sessionData)};
        var serverError = ${JSON.stringify(serverAuthError)};
        var isCancelled = ${JSON.stringify(isUserCancellation)};
        var code = ${JSON.stringify(code)};
        var safeNext = ${JSON.stringify(safeNext)};
        var redirectDestination = ${JSON.stringify(redirectDestination)};
        var supabaseUrl = ${JSON.stringify(supabaseUrl)};
        var supabaseAnonKey = ${JSON.stringify(supabaseAnonKey)};
        var storageKey = ${JSON.stringify(storageKey)};

        var spinner = document.getElementById("spinner");
        var errorIcon = document.getElementById("error-icon");
        var successIcon = document.getElementById("success-icon");
        var infoIcon = document.getElementById("info-icon");
        var title = document.getElementById("title");
        var message = document.getElementById("message");
        var actionBtn = document.getElementById("action-btn");

        // Helper to notify opener or parent frame
        function notifyOpener(msg) {
          try {
            if (window.opener && !window.opener.closed) {
              window.opener.postMessage(msg, "*");
            }
          } catch (e) {}
          try {
            if (window.parent && window.parent !== window) {
              window.parent.postMessage(msg, "*");
            }
          } catch (e) {}
        }

        // Handle user cancellation gracefully
        if (isCancelled) {
          spinner.style.display = "none";
          infoIcon.style.display = "flex";
          title.innerText = "Sign-In Cancelled";
          message.innerText = "You cancelled the authorization request. You can safely close this window.";
          actionBtn.style.display = "inline-block";
          notifyOpener({ type: "OAUTH_AUTH_CANCEL" });
          setTimeout(function() {
            try { window.close(); } catch (e) {}
          }, 1200);
          return;
        }

        var finalSession = serverSession;

        // Priority 1: Hash fragment implicit token parsing (Standard Supabase OAuth flow)
        if (!finalSession) {
          var hash = window.location.hash ? window.location.hash.substring(1) : "";
          if (hash) {
            var hashParams = new URLSearchParams(hash);
            var hashAccessToken = hashParams.get("access_token");
            var hashRefreshToken = hashParams.get("refresh_token");
            var hashError = hashParams.get("error_description") || hashParams.get("error");

            if (hashError) {
              serverError = hashError;
            } else if (hashAccessToken && hashRefreshToken) {
              var userObj = null;
              // Decode user details directly from access token JWT claims
              try {
                var payloadBase64 = hashAccessToken.split(".")[1];
                var decodedJson = atob(payloadBase64.replace(/-/g, "+").replace(/_/g, "/"));
                var payload = JSON.parse(decodedJson);
                userObj = {
                  id: payload.sub || "oauth-user",
                  email: payload.email || null,
                  app_metadata: payload.app_metadata || { provider: hashParams.get("provider") || "oauth" },
                  user_metadata: payload.user_metadata || {},
                };
              } catch (jwtErr) {}

              // Hydrate full authoritative user profile from Supabase API if possible
              if (supabaseUrl && supabaseAnonKey) {
                try {
                  var uRes = await fetch(supabaseUrl + "/auth/v1/user", {
                    headers: {
                      "apikey": supabaseAnonKey,
                      "Authorization": "Bearer " + hashAccessToken,
                    },
                  });
                  if (uRes.ok) {
                    var uData = await uRes.json();
                    if (uData && uData.id) {
                      userObj = uData;
                    }
                  }
                } catch (uErr) {}
              }

              finalSession = {
                access_token: hashAccessToken,
                refresh_token: hashRefreshToken,
                expires_in: Number(hashParams.get("expires_in") || 3600),
                expires_at: Math.floor(Date.now() / 1000) + Number(hashParams.get("expires_in") || 3600),
                token_type: hashParams.get("token_type") || "bearer",
                user: userObj || {
                  id: "oauth-user",
                  email: null,
                  app_metadata: { provider: hashParams.get("provider") || "oauth" },
                  user_metadata: {},
                },
              };
            }
          }
        }

        // Priority 2: Direct PKCE code exchange in browser context with localStorage code_verifier
        if (!finalSession && code && supabaseUrl && supabaseAnonKey) {
          try {
            var codeVerifier = null;
            // Search localStorage
            for (var i = 0; i < localStorage.length; i++) {
              var k = localStorage.key(i);
              if (k && k.includes("code-verifier")) {
                codeVerifier = localStorage.getItem(k);
                break;
              }
            }
            // Fallback: search cookies
            if (!codeVerifier && document.cookie) {
              var cookieParts = document.cookie.split("; ");
              for (var j = 0; j < cookieParts.length; j++) {
                var pair = cookieParts[j].split("=");
                if (pair[0] && pair[0].includes("code-verifier")) {
                  codeVerifier = decodeURIComponent(pair[1] || "");
                  break;
                }
              }
            }

            if (codeVerifier) {
              var res = await fetch(supabaseUrl + "/auth/v1/token?grant_type=pkce", {
                method: "POST",
                headers: {
                  "Content-Type": "application/json",
                  "apikey": supabaseAnonKey,
                },
                body: JSON.stringify({
                  auth_code: code,
                  code_verifier: codeVerifier,
                }),
              });
              if (res.ok) {
                var data = await res.json();
                if (data && data.access_token) {
                  finalSession = data;
                }
              }
            }
          } catch (exchangeErr) {
            console.warn("[OAuth Callback] Client PKCE exchange error:", exchangeErr);
          }
        }

        // Priority 3: Opener-assisted code exchange (for iframe / cross-origin popup environments)
        if (!finalSession && code) {
          try {
            var openerSession = await new Promise(function(resolve) {
              var done = false;
              function onMsg(ev) {
                if (done) return;
                if (ev.data && ev.data.type === "OAUTH_SESSION_EXCHANGED" && ev.data.session) {
                  done = true;
                  window.removeEventListener("message", onMsg);
                  resolve(ev.data.session);
                } else if (ev.data && ev.data.type === "OAUTH_EXCHANGE_FAILED") {
                  done = true;
                  window.removeEventListener("message", onMsg);
                  if (ev.data.error) serverError = ev.data.error;
                  resolve(null);
                }
              }
              window.addEventListener("message", onMsg);

              var bc = null;
              try {
                if (typeof BroadcastChannel !== "undefined") {
                  bc = new BroadcastChannel("reec_auth_sync");
                  bc.onmessage = function(ev) {
                    if (done) return;
                    if (ev.data && ev.data.type === "OAUTH_SESSION_EXCHANGED" && ev.data.session) {
                      done = true;
                      bc.close();
                      resolve(ev.data.session);
                    }
                  };
                  bc.postMessage({ type: "OAUTH_EXCHANGE_CODE", code: code });
                }
              } catch (e) {}

              notifyOpener({ type: "OAUTH_EXCHANGE_CODE", code: code });

              setTimeout(function() {
                if (!done) {
                  done = true;
                  window.removeEventListener("message", onMsg);
                  if (bc) { try { bc.close(); } catch (e) {} }
                  resolve(null);
                }
              }, 3000);
            });

            if (openerSession) {
              finalSession = openerSession;
            }
          } catch (opErr) {
            console.warn("[OAuth Callback] Opener exchange error:", opErr);
          }
        }

        // Handle error state
        if (!finalSession && serverError) {
          spinner.style.display = "none";
          errorIcon.style.display = "flex";
          title.innerText = "Authentication Notice";
          message.innerText = serverError;
          actionBtn.style.display = "inline-block";
          notifyOpener({ type: "OAUTH_AUTH_ERROR", error: serverError });
          return;
        }

        // Success state
        if (finalSession) {
          try {
            var serialized = JSON.stringify(finalSession);
            localStorage.setItem(storageKey, serialized);
            localStorage.setItem("sb-auth-token", serialized);
            localStorage.setItem("reec_oauth_session", serialized);

            // Pre-seed deterministic profile caches for 0ms initial render
            var u = finalSession.user;
            if (u && u.id) {
              var meta = u.user_metadata || {};
              var idData = (u.identities && u.identities[0] && u.identities[0].identity_data) || {};
              var dName =
                meta.full_name ||
                meta.name ||
                meta.display_name ||
                idData.full_name ||
                idData.name ||
                (u.email ? u.email.split("@")[0] : "Learner");
              var uName =
                meta.username ||
                meta.user_name ||
                meta.preferred_username ||
                idData.user_name ||
                idData.preferred_username ||
                idData.login ||
                (u.email ? u.email.split("@")[0].replace(/[^a-zA-Z0-9_]/g, "_") : "learner");
              var avId = meta.avatar_id || idData.avatar_id || "avatar-alex";
              var gen = meta.gender === "female" || idData.gender === "female" ? "female" : "male";

              localStorage.setItem("reec_display_name_" + u.id, dName);
              localStorage.setItem("reec_username_" + u.id, uName);
              localStorage.setItem("reec_avatar_id_" + u.id, avId);
              localStorage.setItem("reec_gender_" + u.id, gen);
              localStorage.setItem("reec_persisted_username", uName);
            }
          } catch (e) {
            console.warn("[OAuth Callback] Storage write warning:", e);
          }

          // Cookie persistence for seamless session across iframes
          try {
            var enc = encodeURIComponent(JSON.stringify(finalSession));
            document.cookie = storageKey + "=" + enc + "; path=/; max-age=31536000; SameSite=None; Secure";
            document.cookie = "sb-auth-token=" + enc + "; path=/; max-age=31536000; SameSite=None; Secure";
          } catch (e) {}

          // BroadcastChannel multi-tab synchronization
          try {
            if (typeof BroadcastChannel !== "undefined") {
              var authChannel = new BroadcastChannel("reec_auth_sync");
              authChannel.postMessage({
                type: "OAUTH_AUTH_SUCCESS",
                session: finalSession,
                next: safeNext,
              });
            }
          } catch (e) {}

          // postMessage to opener and parent
          notifyOpener({
            type: "OAUTH_AUTH_SUCCESS",
            session: finalSession,
            next: safeNext,
          });

          spinner.style.display = "none";
          successIcon.style.display = "flex";
          title.innerText = "Signed In Successfully";
          message.innerText = "Returning to REEC Academy...";

          var isPopup = false;
          try {
            isPopup = Boolean(window.opener && !window.opener.closed);
          } catch (e) {
            isPopup = false;
          }

          if (isPopup) {
            setTimeout(function() {
              try { window.close(); } catch (e) {}
            }, 300);
          } else {
            setTimeout(function() {
              window.location.replace(redirectDestination);
            }, 400);
          }
        } else {
          // No session received and no explicit error
          spinner.style.display = "none";
          errorIcon.style.display = "flex";
          title.innerText = "Authentication Notice";
          message.innerHTML = "Authorization could not be finalized. Please ensure that redirect URLs in your Supabase project settings include: <br/><code style='display:inline-block;margin-top:8px;padding:4px 8px;background:rgba(255,255,255,0.08);border-radius:6px;font-size:12px;word-break:break-all;'>" + window.location.origin + "/auth/callback</code>";
          actionBtn.style.display = "inline-block";
          actionBtn.innerText = "Close Window";
          notifyOpener({ type: "OAUTH_AUTH_ERROR", error: "No authorization session established." });
        }
      })();
    </script>
  </body>
</html>`;

  return new NextResponse(responseHtml, {
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Cache-Control": "no-store, max-age=0",
    },
  });
}
