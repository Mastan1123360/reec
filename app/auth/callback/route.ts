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
  const rawNext = requestUrl.searchParams.get("next");
  const safeNext = sanitizeInternalRedirect(rawNext);
  const queryError = requestUrl.searchParams.get("error");
  const queryErrorDescription =
    requestUrl.searchParams.get("error_description") ||
    requestUrl.searchParams.get("error_code") ||
    queryError;

  let sessionData: {
    access_token: string;
    refresh_token: string;
    user_id: string;
    email: string | null;
  } | null = null;
  let authError: string | null = queryErrorDescription || null;

  if (code) {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://uofwhyawpvlpdqjgtzav.supabase.co";
    const supabaseAnonKey =
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
      "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVvZndoeWF3cHZscGRxamd0emF2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODcxMzEyODksImV4cCI6MjEwMjcwNzI4OX0.7avueNZw611ln__9lbHrCwR0MxaDUgin3JpSVSQaSps";

    try {
      const supabase = createClient(supabaseUrl, supabaseAnonKey, {
        auth: {
          persistSession: true,
          autoRefreshToken: true,
        },
      });

      const { data, error } = await supabase.auth.exchangeCodeForSession(code);
      if (error) {
        console.warn("[OAuth Callback] Error exchanging code for session:", error.message);
        authError = error.message;
      } else if (data?.session) {
        sessionData = {
          access_token: data.session.access_token,
          refresh_token: data.session.refresh_token,
          user_id: data.session.user.id,
          email: data.session.user.email ?? null,
        };
      }
    } catch (err) {
      console.warn("[OAuth Callback] Unexpected error during code exchange:", (err as Error).message);
      authError = (err as Error).message;
    }
  }

  // Determine canonical origin for the redirect
  const origin = getOriginFromRequest(request);
  const redirectDestination = new URL(safeNext, origin).toString();

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
            user_id: hashParams.get("user_id") || "",
            email: null
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
          if (window.opener && !window.opener.closed) {
            try {
              window.opener.postMessage({
                type: "OAUTH_AUTH_SUCCESS",
                session: finalSession,
                next: safeNext
              }, "*");
              setTimeout(function() {
                window.close();
              }, 300);
            } catch (e) {
              window.location.href = redirectDestination;
            }
          } else {
            window.location.href = redirectDestination;
          }
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
              window.location.href = redirectDestination;
            }
          } else {
            window.location.href = redirectDestination;
          }
        }
      })();
    </script>
  </body>
</html>`;

  return new NextResponse(responseHtml, {
    status: 200,
    headers: {
      "Content-Type": "text/html; charset=utf-8",
    },
  });
}
