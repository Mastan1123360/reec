/**
 * components/auth/AuthModal.tsx
 *
 * Clean, minimal Authentication Modal for Sign In and Account Registration.
 * Built with Apple-inspired translucent glass materials and clean typography.
 */
"use client";

import React, { useState, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  X,
  Lock,
  Mail,
  User,
  AlertCircle,
  ArrowRight,
  Loader2,
  AtSign,
  Check,
  Eye,
  EyeOff,
  ShieldCheck,
  KeyRound,
} from "lucide-react";
import { useAuth } from "@/lib/supabase/auth-context";
import { getSupabaseClient } from "@/lib/supabase/client";
import { isUsernameAvailable, validateUsernameSyntax, normalizeUsername } from "@/lib/supabase/username-service";
import { AVATAR_OPTIONS, useUserAvatar } from "@/lib/avatars";
import { cn } from "@/lib/utils";
import { ZeroEchoPasswordInput } from "./ZeroEchoPasswordInput";

export function AuthModal() {
  const {
    isAuthModalOpen,
    closeAuthModal,
    signInWithPassword,
    signUpWithPassword,
    signInWithEmailOnly,
    signInWithOAuth,
  } = useAuth();

  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [emailOrUsername, setEmailOrUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [selectedAvatarId, setSelectedAvatarId] = useState(AVATAR_OPTIONS[0].id);
  const [displayName, setDisplayName] = useState("");
  const [username, setUsername] = useState("");
  const [usernameStatus, setUsernameStatus] = useState<{
    checking: boolean;
    available?: boolean;
    error?: string;
  }>({ checking: false });
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Password Reset states
  const [isForgotMode, setIsForgotMode] = useState(false);
  const [resetPassword, setResetPassword] = useState("");
  const [resetConfirmPassword, setResetConfirmPassword] = useState("");
  const [resetLoading, setResetLoading] = useState(false);
  const [resetMessage, setResetMessage] = useState<string | null>(null);

  // Strong password requirements
  const passwordCriteria = useMemo(() => {
    const hasMinLength = password.length >= 8;
    const hasNumber = /\d/.test(password);
    const hasSpecialOrUpper = /[A-Z]/.test(password) || /[^A-Za-z0-9]/.test(password);
    let score = 0;
    if (hasMinLength) score++;
    if (hasNumber) score++;
    if (hasSpecialOrUpper) score++;
    const isStrong = hasMinLength && hasNumber && hasSpecialOrUpper;
    return {
      hasMinLength,
      hasNumber,
      hasSpecialOrUpper,
      score,
      isStrong,
    };
  }, [password]);

  const passwordsMatch = useMemo(() => {
    if (!confirmPassword) return null;
    return password === confirmPassword;
  }, [password, confirmPassword]);

  // Reset errors and loading when modal opens/closes
  useEffect(() => {
    if (!isAuthModalOpen) {
      setError(null);
      setIsSubmitting(false);
      setUsernameStatus({ checking: false });
      setPassword("");
      setConfirmPassword("");
      setIsForgotMode(false);
      setResetPassword("");
      setResetConfirmPassword("");
      setResetLoading(false);
      setResetMessage(null);
    }
  }, [isAuthModalOpen]);

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    const target = (emailOrUsername || email).trim().toLowerCase();
    if (!target) {
      setError("Please enter your email address or username.");
      return;
    }
    setResetLoading(true);
    setError(null);
    setResetMessage(null);
    try {
      const res = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ emailOrUsername: target }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        setError(data.error || "Failed to dispatch recovery email.");
      } else {
        setResetMessage(
          data.message ||
            "Password recovery link sent! Please check your inbox and click the link to set your new password."
        );
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to dispatch recovery email.");
    } finally {
      setResetLoading(false);
    }
  };

  // Real-time username availability check (debounced)
  useEffect(() => {
    if (mode !== "signup" || !username.trim()) {
      setUsernameStatus({ checking: false });
      return;
    }

    const clean = normalizeUsername(username);
    const syntax = validateUsernameSyntax(clean);
    if (!syntax.valid) {
      setUsernameStatus({ checking: false, available: false, error: syntax.error });
      return;
    }

    setUsernameStatus({ checking: true });
    const timer = setTimeout(async () => {
      const res = await isUsernameAvailable(clean, email.trim().toLowerCase());
      setUsernameStatus({
        checking: false,
        available: res.available,
        error: res.error,
      });
    }, 350);

    return () => clearTimeout(timer);
  }, [username, email, mode]);

  const handleEmailOnly = async () => {
    const targetEmail = emailOrUsername.trim().toLowerCase();
    if (!targetEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(targetEmail)) {
      setError("Please enter a valid email address in the field above to sign in.");
      return;
    }
    setError(null);
    setIsSubmitting(true);
    try {
      const res = await signInWithEmailOnly(targetEmail);
      if (res?.error) {
        setError(res.error.message || "Failed to sign in with email.");
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to sign in with email.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleOAuth = async (provider: "google" | "github") => {
    setError(null);
    setIsSubmitting(true);
    try {
      const res = await signInWithOAuth(provider);
      if (res?.error) {
        setError(res.error.message || `Failed to sign in with ${provider}.`);
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : `Failed to sign in with ${provider}.`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);

    try {
      if (mode === "signin") {
        const identifier = emailOrUsername.trim();
        if (!identifier) {
          setError("Please enter your username or email address");
          setIsSubmitting(false);
          return;
        }

        // If password is not entered, automatically treat as passwordless email login!
        if (!password) {
          if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(identifier)) {
            const res = await signInWithEmailOnly(identifier);
            if (res?.error) {
              setError(res.error.message || "Failed to sign in with email.");
            }
            setIsSubmitting(false);
            return;
          }
          setError("Please enter your password, or enter a valid email to sign in without a password.");
          setIsSubmitting(false);
          return;
        }

        const res = await signInWithPassword(identifier, password);
        if (res?.error) {
          setError(res.error.message || "Failed to sign in. Please verify your credentials.");
        }
      } else {
        const cleanUser = normalizeUsername(username);
        if (!cleanUser) {
          setError("Please choose a unique username");
          setIsSubmitting(false);
          return;
        }
        const syntax = validateUsernameSyntax(cleanUser);
        if (!syntax.valid) {
          setError(syntax.error || "Username must be 3-20 characters using letters, numbers, or _");
          setIsSubmitting(false);
          return;
        }

        const cleanEmail = email.trim().toLowerCase();
        if (!cleanEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
          setError("Please enter a valid email address");
          setIsSubmitting(false);
          return;
        }

        // Check availability (allowing user to keep their own username if already linked to this email)
        const avail = await isUsernameAvailable(cleanUser, cleanEmail);
        if (!avail.available) {
          setError(avail.error || `Username @${cleanUser} is already taken. Please choose another.`);
          setIsSubmitting(false);
          return;
        }

        // Strong password validation
        if (password.length < 8) {
          setError("Password must be at least 8 characters long");
          setIsSubmitting(false);
          return;
        }
        if (!/\d/.test(password)) {
          setError("Password must contain at least one number (0-9)");
          setIsSubmitting(false);
          return;
        }
        if (!(/[A-Z]/.test(password) || /[^A-Za-z0-9]/.test(password))) {
          setError("Password must contain at least one uppercase letter or special character");
          setIsSubmitting(false);
          return;
        }

        // Confirm password validation
        if (password !== confirmPassword) {
          setError("Passwords do not match. Please verify your confirm password.");
          setIsSubmitting(false);
          return;
        }

        const res = await signUpWithPassword(
          cleanEmail,
          password,
          displayName || cleanUser,
          cleanUser,
          selectedAvatarId
        );
        if (res?.error) {
          setError(res.error.message || "Failed to create account. Please try again.");
        }
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "An unexpected error occurred. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const isAnyLoading = isSubmitting;

  return (
    <AnimatePresence>
      {isAuthModalOpen && (
        <div
          className="fixed inset-0 z-50 overflow-y-auto overscroll-contain flex flex-col justify-end sm:justify-center items-center p-0 sm:p-4 md:p-6"
        >
          {/* Performant Dark Backdrop - click closes modal */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.18, ease: "easeOut" }}
            onClick={closeAuthModal}
            className="fixed inset-0 bg-slate-950/60 dark:bg-black/80 backdrop-blur-xs sm:backdrop-blur-sm"
            style={{ willChange: "opacity" }}
          />

          {/* Modal Card Panel - smooth GPU accelerated entrance */}
          <motion.div
            initial={{ y: 16, opacity: 0, scale: 0.985 }}
            animate={{ y: 0, opacity: 1, scale: 1 }}
            exit={{ y: 16, opacity: 0, scale: 0.985 }}
            transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
            onClick={(e) => e.stopPropagation()}
            className={cn(
              "relative w-full rounded-t-[28px] sm:rounded-3xl border-t sm:border border-slate-200/90 dark:border-white/[0.12] bg-white/95 dark:bg-[#0c1222]/95 backdrop-blur-2xl text-slate-900 dark:text-slate-100 shadow-2xl z-10 flex flex-col max-h-[92dvh] sm:max-h-[88vh] overflow-hidden transform-gpu sm:max-w-[480px]"
            )}
            style={{
              willChange: "transform, opacity",
              backfaceVisibility: "hidden",
              boxShadow: "0 24px 50px -12px rgba(0, 0, 0, 0.45)",
            }}
          >
            {/* Modal Header */}
            <div className="shrink-0 px-5 pt-4 pb-3 sm:px-6 sm:pt-4 border-b border-slate-100 dark:border-white/[0.08] relative">
              {/* Subtle top specular line */}
              <div className="pointer-events-none absolute inset-x-0 top-0 h-[1px] bg-gradient-to-r from-transparent via-slate-200/80 dark:via-white/20 to-transparent" />

              {/* Mobile drag handle indicator */}
              <div className="sm:hidden w-10 h-1 bg-slate-300 dark:bg-white/20 rounded-full mx-auto mb-3" />

              {/* Dedicated Top Row: Brand Info + Closing 'X' button */}
              <div className="flex items-center justify-between gap-3 mb-3">
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-blue-600 to-indigo-600 text-white flex items-center justify-center font-mono font-black text-xs shrink-0 shadow-xs">
                    R
                  </div>
                  <div className="min-w-0">
                    <div className="text-xs font-bold text-slate-900 dark:text-white truncate">
                      REEC Systems Lab
                    </div>
                    <div className="text-[10px] text-slate-600 dark:text-slate-400 font-medium truncate">
                      {mode === "signin" ? "Engineer Authentication" : "Cohort Registration"}
                    </div>
                  </div>
                </div>

                {/* Close Button - positioned in header flow, never overlapping tabs on laptop/desktop */}
                <button
                  type="button"
                  onClick={closeAuthModal}
                  className="text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-white transition-colors p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-white/10 cursor-pointer h-8 w-8 flex items-center justify-center shrink-0 border border-transparent hover:border-slate-200/60 dark:hover:border-white/10"
                  aria-label="Close dialog"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Segmented Tab Switcher (Full Width, clear of any icons) */}
              <div className="flex items-center p-1 rounded-xl bg-slate-100/90 dark:bg-white/[0.04] border border-slate-200/80 dark:border-white/[0.08]">
                <button
                  type="button"
                  onClick={() => {
                    setError(null);
                    setMode("signin");
                  }}
                  className={cn(
                    "flex-1 py-1.5 sm:py-2 text-xs font-semibold rounded-lg transition-all duration-150 cursor-pointer text-center min-h-[36px] flex items-center justify-center",
                    mode === "signin"
                      ? "bg-white text-slate-900 border border-slate-200/90 dark:bg-white/[0.12] dark:text-white dark:border-white/[0.16] shadow-xs"
                      : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200"
                  )}
                >
                  Sign In
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setError(null);
                    setMode("signup");
                  }}
                  className={cn(
                    "flex-1 py-1.5 sm:py-2 text-xs font-semibold rounded-lg transition-all duration-150 cursor-pointer text-center min-h-[36px] flex items-center justify-center",
                    mode === "signup"
                      ? "bg-white text-slate-900 border border-slate-200/90 dark:bg-white/[0.12] dark:text-white dark:border-white/[0.16] shadow-xs"
                      : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200"
                  )}
                >
                  Create Account
                </button>
              </div>
            </div>

            {/* Scrollable Modal Body */}
            <div className="overflow-y-auto overscroll-contain flex-1 px-5 py-4 sm:px-6 sm:py-5">

            {isForgotMode ? (
              <div className="py-2 space-y-4">
                <div className="text-center space-y-1">
                  <div className="w-12 h-12 rounded-2xl bg-blue-500/10 text-blue-500 flex items-center justify-center mx-auto mb-2">
                    <KeyRound className="w-6 h-6" />
                  </div>
                  <h3 className="text-lg font-bold text-slate-900 dark:text-white">Reset Your Password</h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Enter your account email and choose a new password.
                  </p>
                </div>

                {resetMessage && (
                  <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-xs flex items-center gap-2">
                    <Check className="w-4 h-4 shrink-0" />
                    <span>{resetMessage}</span>
                  </div>
                )}

                {error && (
                  <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-600 dark:text-rose-400 text-xs flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    <span>{error}</span>
                  </div>
                )}

                <form onSubmit={handleResetPassword} className="space-y-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      Account Email or Username
                    </label>
                    <div className="relative">
                      <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                      <input
                        type="text"
                        required
                        value={emailOrUsername}
                        onChange={(e) => {
                          setEmailOrUsername(e.target.value);
                          if (e.target.value.includes("@")) {
                            setEmail(e.target.value);
                          }
                        }}
                        placeholder="you@domain.com or @username"
                        className="w-full bg-slate-100/60 dark:bg-white/[0.05] border border-slate-900/[0.08] dark:border-white/[0.10] rounded-xl pl-9 pr-3 py-2.5 text-xs text-slate-900 dark:text-white focus:outline-none"
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={resetLoading}
                    className="w-full py-3 px-4 min-h-[44px] bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs rounded-xl flex items-center justify-center gap-2 shadow-lg shadow-blue-500/20 disabled:opacity-50 cursor-pointer"
                  >
                    {resetLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <span>Send Recovery Link</span>}
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setError(null);
                      setIsForgotMode(false);
                    }}
                    className="w-full py-2 text-xs text-slate-500 hover:text-slate-800 dark:hover:text-white text-center cursor-pointer"
                  >
                    Back to Sign In
                  </button>
                </form>
              </div>
            ) : (
              <>
                {/* Error Notice if any */}
                {error && (
                  <motion.div
                    initial={{ opacity: 0, y: -4 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="mb-4 p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-700 dark:text-rose-300 text-xs flex items-start gap-2.5 backdrop-blur-md"
                  >
                    <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-500" />
                    <p className="font-medium leading-relaxed">{error}</p>
                  </motion.div>
                )}

            {/* Clean Form */}
            {mode === "signin" && (
              <div className="space-y-2.5 mb-3">
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => handleOAuth("google")}
                    disabled={isAnyLoading}
                    className="flex items-center justify-center gap-2 py-2 px-3 rounded-xl border border-slate-200 dark:border-white/[0.10] bg-white hover:bg-slate-50 dark:bg-white/[0.04] dark:hover:bg-white/[0.08] text-xs font-semibold text-slate-800 dark:text-slate-200 transition-colors disabled:opacity-50 cursor-pointer min-h-[38px] shadow-2xs"
                  >
                    <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24">
                      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"/>
                      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"/>
                    </svg>
                    <span>Google</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleOAuth("github")}
                    disabled={isAnyLoading}
                    className="flex items-center justify-center gap-2 py-2 px-3 rounded-xl border border-slate-200 dark:border-white/[0.10] bg-white hover:bg-slate-50 dark:bg-white/[0.04] dark:hover:bg-white/[0.08] text-xs font-semibold text-slate-800 dark:text-slate-200 transition-colors disabled:opacity-50 cursor-pointer min-h-[38px] shadow-2xs"
                  >
                    <svg className="w-4 h-4 shrink-0 fill-current" viewBox="0 0 24 24">
                      <path fillRule="evenodd" clipRule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.53 1.032 1.53 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" />
                    </svg>
                    <span>GitHub</span>
                  </button>
                </div>
                <div className="relative flex items-center justify-center pt-1 pb-0.5">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-slate-200/80 dark:border-white/[0.08]" />
                  </div>
                  <span className="relative bg-white dark:bg-[#0c1222] px-2.5 text-[10px] uppercase font-bold text-slate-500 dark:text-slate-400 tracking-wider">
                    or continue with email
                  </span>
                </div>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-3">
              {mode === "signin" ? (
                <div>
                  <label className="block text-xs font-semibold text-slate-800 dark:text-slate-200 mb-1">
                    Username or Email
                  </label>
                  <div className="relative">
                    <User className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      required
                      value={emailOrUsername}
                      onChange={(e) => setEmailOrUsername(e.target.value)}
                      placeholder="@username or you@domain.com"
                      autoCapitalize="none"
                      autoCorrect="off"
                      spellCheck={false}
                      className="w-full bg-slate-50/80 hover:bg-white focus:bg-white dark:bg-white/[0.04] dark:hover:bg-white/[0.06] dark:focus:bg-[#0f172a] border border-slate-200 dark:border-white/[0.12] focus:border-blue-600 dark:focus:border-blue-500 rounded-xl pl-9 pr-3 py-2.5 sm:py-2.5 text-base sm:text-sm text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 dark:focus:ring-blue-500/25 transition-all shadow-2xs"
                    />
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {/* Username Field */}
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="block text-xs font-semibold text-slate-800 dark:text-slate-200">
                        Username
                      </label>
                      <span className="text-[10px] text-slate-500 dark:text-slate-400 font-mono">
                        @handle
                      </span>
                    </div>
                    <div className="relative">
                      <AtSign className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                      <input
                        type="text"
                        required
                        value={username}
                        onChange={(e) => setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ""))}
                        placeholder="rust_dev"
                        maxLength={20}
                        autoCapitalize="none"
                        autoCorrect="off"
                        spellCheck={false}
                        className="w-full bg-slate-50/80 hover:bg-white focus:bg-white dark:bg-white/[0.04] dark:hover:bg-white/[0.06] dark:focus:bg-[#0f172a] border border-slate-200 dark:border-white/[0.12] focus:border-blue-600 dark:focus:border-blue-500 rounded-xl pl-9 pr-8 py-2.5 sm:py-2.5 text-base sm:text-sm font-mono text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 dark:focus:ring-blue-500/25 transition-all shadow-2xs"
                      />
                      <div className="absolute right-2.5 top-1/2 -translate-y-1/2 flex items-center">
                        {usernameStatus.checking ? (
                          <Loader2 className="w-3.5 h-3.5 animate-spin text-blue-500" />
                        ) : usernameStatus.available === true ? (
                          <Check className="w-4 h-4 text-emerald-500" />
                        ) : usernameStatus.available === false && username.length >= 3 ? (
                          <AlertCircle className="w-4 h-4 text-rose-500" />
                        ) : null}
                      </div>
                    </div>
                  </div>

                  {/* Email Field */}
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="block text-xs font-semibold text-slate-800 dark:text-slate-200">
                        Email Address
                      </label>
                    </div>
                    <div className="relative">
                      <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                      <input
                        type="email"
                        required
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="engineer@domain.com"
                        autoCapitalize="none"
                        autoCorrect="off"
                        spellCheck={false}
                        className="w-full bg-slate-50/80 hover:bg-white focus:bg-white dark:bg-white/[0.04] dark:hover:bg-white/[0.06] dark:focus:bg-[#0f172a] border border-slate-200 dark:border-white/[0.12] focus:border-blue-600 dark:focus:border-blue-500 rounded-xl pl-9 pr-3 py-2.5 sm:py-2.5 text-base sm:text-sm text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 dark:focus:ring-blue-500/25 transition-all shadow-2xs"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Password & Confirm Password Section */}
              {mode === "signin" ? (
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-xs font-semibold text-slate-800 dark:text-slate-200">
                      Password
                    </label>
                    <button
                      type="button"
                      onClick={() => {
                        setError(null);
                        setIsForgotMode(true);
                      }}
                      className="text-[11px] text-blue-600 dark:text-blue-400 hover:underline cursor-pointer font-medium"
                    >
                      Forgot password?
                    </button>
                  </div>
                  <div className="relative">
                    <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 z-10" />
                    <ZeroEchoPasswordInput
                      id="auth-signin-password"
                      name="password"
                      required
                      value={password}
                      onChange={setPassword}
                      showPassword={showPassword}
                      placeholder="••••••••••••"
                      autoComplete="current-password"
                      className="w-full bg-slate-50/80 hover:bg-white focus:bg-white dark:bg-white/[0.04] dark:hover:bg-white/[0.06] dark:focus:bg-[#0f172a] border border-slate-200 dark:border-white/[0.12] focus:border-blue-600 dark:focus:border-blue-500 rounded-xl pl-9 pr-10 py-2.5 sm:py-2.5 text-base sm:text-sm text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 dark:focus:ring-blue-500/25 transition-all tracking-wider font-mono shadow-2xs"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer p-1 z-10"
                      tabIndex={-1}
                    >
                      {showPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                </div>
              ) : (
                <div className="space-y-2.5">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {/* Password input */}
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <label className="block text-xs font-semibold text-slate-800 dark:text-slate-200">
                          Password
                        </label>
                        {password.length > 0 && (
                          <span
                            className={cn(
                              "text-[10px] font-bold uppercase tracking-wider",
                              passwordCriteria.score <= 1
                                ? "text-rose-500"
                                : passwordCriteria.score === 2
                                ? "text-amber-500"
                                : "text-emerald-500"
                            )}
                          >
                            {passwordCriteria.score <= 1
                              ? "Weak"
                              : passwordCriteria.score === 2
                              ? "Medium"
                              : "Strong"}
                          </span>
                        )}
                      </div>
                      <div className="relative">
                        <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 z-10" />
                        <ZeroEchoPasswordInput
                          id="auth-signup-password"
                          name="new-password"
                          required
                          value={password}
                          onChange={setPassword}
                          showPassword={showPassword}
                          placeholder="••••••••••••"
                          autoComplete="new-password"
                          className="w-full bg-slate-50/80 hover:bg-white focus:bg-white dark:bg-white/[0.04] dark:hover:bg-white/[0.06] dark:focus:bg-[#0f172a] border border-slate-200 dark:border-white/[0.12] focus:border-blue-600 dark:focus:border-blue-500 rounded-xl pl-9 pr-10 py-2.5 sm:py-2.5 text-base sm:text-sm text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 dark:focus:ring-blue-500/25 transition-all tracking-wider font-mono shadow-2xs"
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer p-1 z-10"
                          tabIndex={-1}
                        >
                          {showPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                        </button>
                      </div>
                    </div>

                    {/* Confirm Password input */}
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <label className="block text-xs font-semibold text-slate-800 dark:text-slate-200">
                          Confirm Password
                        </label>
                        {confirmPassword.length > 0 && (
                          <span
                            className={cn(
                              "text-[10px] font-semibold flex items-center gap-1",
                              passwordsMatch
                                ? "text-emerald-600 dark:text-emerald-400"
                                : "text-rose-500"
                            )}
                          >
                            {passwordsMatch ? (
                              <>
                                <Check className="w-3 h-3" /> Match
                              </>
                            ) : (
                              "No match"
                            )}
                          </span>
                        )}
                      </div>
                      <div className="relative">
                        <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 z-10" />
                        <ZeroEchoPasswordInput
                          id="auth-signup-confirm-password"
                          name="confirm-password"
                          required
                          value={confirmPassword}
                          onChange={setConfirmPassword}
                          showPassword={showConfirmPassword}
                          placeholder="••••••••••••"
                          autoComplete="new-password"
                          className={cn(
                            "w-full bg-slate-50/80 hover:bg-white focus:bg-white dark:bg-white/[0.04] dark:hover:bg-white/[0.06] dark:focus:bg-[#0f172a] border rounded-xl pl-9 pr-10 py-2.5 sm:py-2.5 text-base sm:text-sm text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 transition-all tracking-wider font-mono shadow-2xs",
                            confirmPassword.length > 0
                              ? passwordsMatch
                                ? "border-emerald-500/70 focus:border-emerald-500 focus:ring-emerald-500/20"
                                : "border-rose-500/70 focus:border-rose-500 focus:ring-rose-500/20"
                              : "border-slate-200 dark:border-white/[0.12] focus:border-blue-600 dark:focus:border-blue-500 focus:ring-blue-500/20 dark:focus:ring-blue-500/25"
                          )}
                        />
                        <button
                          type="button"
                          onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer p-1 z-10"
                          tabIndex={-1}
                        >
                          {showConfirmPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Password strength checklist - full width */}
                  <div className="space-y-1.5 p-2.5 rounded-xl bg-slate-500/5 border border-slate-500/10">
                    <div className="h-1 w-full bg-slate-200 dark:bg-white/10 rounded-full overflow-hidden flex gap-1">
                      <div
                        className={cn(
                          "h-full flex-1 rounded-full transition-all",
                          passwordCriteria.score >= 1
                            ? passwordCriteria.score === 1
                              ? "bg-rose-500"
                              : passwordCriteria.score === 2
                              ? "bg-amber-500"
                              : "bg-emerald-500"
                            : "bg-transparent"
                        )}
                      />
                      <div
                        className={cn(
                          "h-full flex-1 rounded-full transition-all",
                          passwordCriteria.score >= 2
                            ? passwordCriteria.score === 2
                              ? "bg-amber-500"
                              : "bg-emerald-500"
                            : "bg-transparent"
                        )}
                      />
                      <div
                        className={cn(
                          "h-full flex-1 rounded-full transition-all",
                          passwordCriteria.score >= 3 ? "bg-emerald-500" : "bg-transparent"
                        )}
                      />
                    </div>

                    <div className="grid grid-cols-3 gap-1 pt-0.5 text-[10px]">
                      <div
                        className={cn(
                          "flex items-center gap-1 truncate",
                          passwordCriteria.hasMinLength
                            ? "text-emerald-600 dark:text-emerald-400 font-medium"
                            : "text-slate-400 dark:text-slate-500"
                        )}
                      >
                        <Check className="w-3 h-3 shrink-0" />
                        <span>8+ chars</span>
                      </div>
                      <div
                        className={cn(
                          "flex items-center gap-1 truncate",
                          passwordCriteria.hasNumber
                            ? "text-emerald-600 dark:text-emerald-400 font-medium"
                            : "text-slate-400 dark:text-slate-500"
                        )}
                      >
                        <Check className="w-3 h-3 shrink-0" />
                        <span>0-9 digit</span>
                      </div>
                      <div
                        className={cn(
                          "flex items-center gap-1 truncate",
                          passwordCriteria.hasSpecialOrUpper
                            ? "text-emerald-600 dark:text-emerald-400 font-medium"
                            : "text-slate-400 dark:text-slate-500"
                        )}
                      >
                        <Check className="w-3 h-3 shrink-0" />
                        <span>Upper/sym</span>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Profile Avatar Selection in Registration */}
              {mode === "signup" && (
                <div className="pt-1">
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                    Select Starting Avatar
                  </label>
                  <div className="grid grid-cols-4 gap-2 sm:gap-2.5">
                    {AVATAR_OPTIONS.map((av) => {
                      const isSelected = av.id === selectedAvatarId;
                      return (
                        <button
                          key={av.id}
                          type="button"
                          onClick={() => setSelectedAvatarId(av.id)}
                          className={cn(
                            "flex flex-col items-center p-2 rounded-xl border transition-all cursor-pointer",
                            isSelected
                              ? "border-blue-600 dark:border-blue-400 bg-blue-500/10 dark:bg-blue-500/20 ring-1 ring-blue-500/40"
                              : "border-slate-200 dark:border-white/[0.08] hover:border-slate-300 dark:hover:border-white/20 bg-slate-50/50 dark:bg-white/[0.02]"
                          )}
                          title={av.name}
                        >
                          <div
                            className={cn(
                              "w-8 h-8 rounded-full flex items-center justify-center text-white mb-1 shadow-xs",
                              `bg-gradient-to-br ${av.gradient}`
                            )}
                          >
                            {av.svgIcon("w-full h-full")}
                          </div>
                          <span className="text-[9px] font-bold text-slate-700 dark:text-slate-300 truncate max-w-[60px]">
                            {av.name.split(" ")[0]}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {mode === "signin" ? (
                <div className="mt-3 space-y-2">
                  <button
                    type="submit"
                    disabled={isAnyLoading}
                    className="w-full py-3 sm:py-2.5 px-4 min-h-[44px] bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 active:scale-[0.99] text-white font-bold text-xs rounded-xl flex items-center justify-center gap-2 shadow-lg shadow-blue-500/25 disabled:opacity-50 transition-all cursor-pointer"
                  >
                    {isSubmitting ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <>
                        <span>Sign In</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </>
                    )}
                  </button>

                  <button
                    type="button"
                    onClick={handleEmailOnly}
                    disabled={isAnyLoading}
                    className="w-full py-2.5 px-4 min-h-[40px] rounded-xl border border-blue-500/30 dark:border-blue-400/20 bg-blue-500/5 hover:bg-blue-500/10 text-blue-600 dark:text-blue-400 font-semibold text-xs transition-colors flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                  >
                    <Mail className="w-3.5 h-3.5" />
                    <span>Sign In with Email Only (No Password)</span>
                  </button>
                </div>
              ) : (
                <button
                  type="submit"
                  disabled={isAnyLoading}
                  className="w-full mt-3 py-3 sm:py-2.5 px-4 min-h-[44px] bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 active:scale-[0.99] text-white font-bold text-xs rounded-xl flex items-center justify-center gap-2 shadow-lg shadow-blue-500/25 disabled:opacity-50 transition-all cursor-pointer"
                >
                  {isSubmitting ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <>
                      <span>Create Account</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </>
                  )}
                </button>
              )}
            </form>

            {/* Mode Switcher footer */}
            <div className="mt-4 pt-3 border-t border-slate-900/[0.06] dark:border-white/[0.08] flex items-center justify-center text-xs text-slate-500 dark:text-slate-400 gap-1.5 pb-1">
              <span>{mode === "signin" ? "Don't have an account?" : "Already have an account?"}</span>
              <button
                type="button"
                onClick={() => {
                  setError(null);
                  setMode(mode === "signin" ? "signup" : "signin");
                }}
                className="text-blue-600 dark:text-blue-400 hover:underline font-semibold cursor-pointer p-1"
              >
                {mode === "signin" ? "Create one" : "Sign in"}
              </button>
            </div>
          </>
        )}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
