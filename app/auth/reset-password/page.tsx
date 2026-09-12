"use client";

/**
 * app/auth/reset-password/page.tsx
 *
 * REEC Password Reset Recovery Screen.
 *
 * Implements Specification 15:
 * Forgot password -> Supabase sends recovery email -> user follows recovery link ->
 * Supabase recovery session -> user sets new password.
 */

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { getSupabaseClient } from "@/lib/supabase/client";
import { Lock, CheckCircle2, AlertCircle, Loader2, ArrowRight } from "lucide-react";
import { ZeroEchoPasswordInput } from "@/components/auth/ZeroEchoPasswordInput";

export default function ResetPasswordPage() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [sessionChecking, setSessionChecking] = useState(true);
  const [hasValidSession, setHasValidSession] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    async function checkRecoverySession() {
      const client = getSupabaseClient();
      if (!client) {
        setError("Supabase client is not initialized.");
        setSessionChecking(false);
        return;
      }

      // Check current session or listen for recovery auth state
      const { data } = await client.auth.getSession();
      if (data?.session) {
        setHasValidSession(true);
      } else {
        // Recovery hash might be currently processed by client
        const { data: authListener } = client.auth.onAuthStateChange(
          (event, session) => {
            if (session && (event === "PASSWORD_RECOVERY" || event === "SIGNED_IN")) {
              setHasValidSession(true);
            }
          }
        );
        return () => {
          authListener.subscription.unsubscribe();
        };
      }
      setSessionChecking(false);
    }

    checkRecoverySession();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!password || password.length < 8) {
      setError("New password must be at least 8 characters long.");
      return;
    }
    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const client = getSupabaseClient();
      if (!client) {
        throw new Error("Authentication service is unavailable.");
      }

      // Authoritative Supabase recovery update
      const { error: updateError } = await client.auth.updateUser({
        password,
      });

      if (updateError) {
        throw updateError;
      }

      setSuccess(true);
      setTimeout(() => {
        router.push("/");
      }, 2500);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to update password.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-slate-50 dark:bg-[#070b14] text-slate-900 dark:text-slate-100">
      <div className="w-full max-w-md bg-white dark:bg-[#0d1527] border border-slate-200 dark:border-white/[0.08] rounded-2xl p-8 shadow-xl">
        <div className="text-center mb-6">
          <div className="w-12 h-12 rounded-xl bg-blue-500/10 text-blue-500 flex items-center justify-center mx-auto mb-3">
            <Lock className="w-6 h-6" />
          </div>
          <h1 className="text-xl font-bold tracking-tight">Set New Password</h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Choose a strong new password for your REEC Academy account.
          </p>
        </div>

        {error && (
          <div className="mb-5 p-3.5 bg-red-500/10 border border-red-500/20 rounded-xl text-xs text-red-500 dark:text-red-400 flex items-start gap-2.5">
            <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
            <div className="flex-1 leading-relaxed">{error}</div>
          </div>
        )}

        {success ? (
          <div className="p-5 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-center space-y-3">
            <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto" />
            <h2 className="text-sm font-semibold text-emerald-500 dark:text-emerald-400">
              Password Updated Successfully
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Your new password is now active. Redirecting you to REEC Academy...
            </p>
            <div className="pt-2">
              <Link
                href="/"
                className="inline-flex items-center gap-1.5 text-xs font-semibold text-blue-500 hover:text-blue-400"
              >
                Go to Dashboard <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                New Password (min 8 characters)
              </label>
              <div className="relative">
                <ZeroEchoPasswordInput
                  id="reset-password-input"
                  name="new-password"
                  required
                  value={password}
                  onChange={setPassword}
                  placeholder="••••••••••••"
                  autoComplete="new-password"
                  className="w-full bg-slate-100/60 dark:bg-white/[0.05] border border-slate-900/[0.08] dark:border-white/[0.10] rounded-xl px-3 py-2.5 text-xs text-slate-900 dark:text-white focus:outline-none tracking-wider font-mono"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                Confirm New Password
              </label>
              <div className="relative">
                <ZeroEchoPasswordInput
                  id="reset-password-confirm"
                  name="confirm-password"
                  required
                  value={confirmPassword}
                  onChange={setConfirmPassword}
                  placeholder="••••••••••••"
                  autoComplete="new-password"
                  className="w-full bg-slate-100/60 dark:bg-white/[0.05] border border-slate-900/[0.08] dark:border-white/[0.10] rounded-xl px-3 py-2.5 text-xs text-slate-900 dark:text-white focus:outline-none tracking-wider font-mono"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 px-4 min-h-[44px] bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs rounded-xl flex items-center justify-center gap-2 shadow-lg shadow-blue-500/20 disabled:opacity-50 cursor-pointer"
            >
              {loading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <span>Save New Password</span>
              )}
            </button>

            <div className="text-center pt-2">
              <Link
                href="/"
                className="text-xs text-slate-500 hover:text-slate-800 dark:hover:text-white"
              >
                Return to Sign In
              </Link>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
