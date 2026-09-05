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
} from "lucide-react";
import { useAuth } from "@/lib/supabase/auth-context";
import { isUsernameAvailable, validateUsernameSyntax, normalizeUsername } from "@/lib/supabase/username-service";
import { AVATAR_OPTIONS, useUserAvatar } from "@/lib/avatars";
import { cn } from "@/lib/utils";

export function AuthModal() {
  const {
    isAuthModalOpen,
    closeAuthModal,
    signInWithPassword,
    signUpWithPassword,
    signInWithOAuth,
    oauthLoadingProvider,
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
    }
  }, [isAuthModalOpen]);

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
      const res = await isUsernameAvailable(clean);
      setUsernameStatus({
        checking: false,
        available: res.available,
        error: res.error,
      });
    }, 350);

    return () => clearTimeout(timer);
  }, [username, mode]);

  if (!isAuthModalOpen) return null;

  const handleOAuth = async (provider: "google" | "github") => {
    setError(null);
    const res = await signInWithOAuth(provider);
    if (res.error) {
      setError(res.error.message);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);

    if (mode === "signin") {
      const identifier = emailOrUsername.trim();
      if (!identifier) {
        setError("Please enter your username or email address");
        setIsSubmitting(false);
        return;
      }
      const res = await signInWithPassword(identifier, password);
      if (res.error) {
        setError(res.error.message);
      }
    } else {
      if (!username.trim()) {
        setError("Please choose a unique username");
        setIsSubmitting(false);
        return;
      }
      const cleanUser = normalizeUsername(username);
      const syntax = validateUsernameSyntax(cleanUser);
      if (!syntax.valid) {
        setError(syntax.error || "Invalid username format");
        setIsSubmitting(false);
        return;
      }
      const avail = await isUsernameAvailable(cleanUser);
      if (!avail.available) {
        setError(avail.error || `Username @${cleanUser} is already taken`);
        setIsSubmitting(false);
        return;
      }

      // Strong password validation
      if (!passwordCriteria.isStrong) {
        setError("Please choose a strong password (minimum 8 characters with at least one number and uppercase letter or symbol)");
        setIsSubmitting(false);
        return;
      }

      // Confirm password validation
      if (password !== confirmPassword) {
        setError("Passwords do not match. Please re-enter your password in the confirm password field.");
        setIsSubmitting(false);
        return;
      }

      const res = await signUpWithPassword(
        email,
        password,
        displayName || cleanUser,
        cleanUser,
        selectedAvatarId
      );
      if (res.error) {
        setError(res.error.message);
      }
    }
    setIsSubmitting(false);
  };

  const isAnyLoading = Boolean(oauthLoadingProvider) || isSubmitting;
  const isSignupDisabled =
    mode === "signup" &&
    (!passwordCriteria.isStrong || !passwordsMatch || !usernameStatus.available || isAnyLoading);

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 overflow-y-auto">
        {/* Apple Blur Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={closeAuthModal}
          className="fixed inset-0 bg-slate-950/60 dark:bg-black/75 backdrop-blur-xl transition-all"
        />

        {/* Translucent Glass Modal Panel */}
        <motion.div
          initial={{ scale: 0.96, opacity: 0, y: 8 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.96, opacity: 0, y: 8 }}
          transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
          className="relative w-full max-w-[420px] rounded-3xl border border-slate-900/[0.08] dark:border-white/[0.12] bg-white/85 dark:bg-[#070b16]/80 p-6 sm:p-7 text-slate-900 dark:text-slate-100 shadow-2xl backdrop-blur-[50px] backdrop-saturate-[160%] overflow-hidden z-10 my-8"
          style={{
            boxShadow: "var(--glass-specular), 0 32px 64px -16px rgba(0, 0, 0, 0.45)",
          }}
        >
          {/* Subtle top specular line */}
          <div className="pointer-events-none absolute inset-x-0 top-0 h-[1px] bg-gradient-to-r from-transparent via-white/40 dark:via-white/20 to-transparent" />

          {/* Close button */}
          <button
            onClick={closeAuthModal}
            className="absolute top-5 right-5 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition-colors p-1.5 rounded-full hover:bg-slate-100/80 dark:hover:bg-white/10 cursor-pointer"
            aria-label="Close auth dialog"
          >
            <X className="w-4 h-4" />
          </button>

          {/* Clean Segmented Tab Switcher */}
          <div className="flex items-center p-1 rounded-xl bg-slate-100/80 dark:bg-white/[0.06] border border-slate-900/[0.05] dark:border-white/[0.08] mb-6">
            <button
              type="button"
              onClick={() => {
                setError(null);
                setMode("signin");
              }}
              className={cn(
                "flex-1 py-1.5 text-xs font-semibold rounded-lg transition-all cursor-pointer text-center",
                mode === "signin"
                  ? "bg-white dark:bg-white/15 text-slate-900 dark:text-white shadow-xs"
                  : "text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200"
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
                "flex-1 py-1.5 text-xs font-semibold rounded-lg transition-all cursor-pointer text-center",
                mode === "signup"
                  ? "bg-white dark:bg-white/15 text-slate-900 dark:text-white shadow-xs"
                  : "text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200"
              )}
            >
              Create Account
            </button>
          </div>

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

          {/* OAuth Buttons */}
          <div className="space-y-2 mb-4">
            <button
              type="button"
              onClick={() => handleOAuth("google")}
              disabled={isAnyLoading}
              className="w-full flex items-center justify-center gap-2.5 px-4 py-2.5 rounded-xl bg-white/70 hover:bg-white/95 dark:bg-white/[0.06] dark:hover:bg-white/[0.10] border border-slate-900/[0.08] dark:border-white/[0.10] text-xs font-semibold text-slate-800 dark:text-slate-100 transition-all shadow-xs disabled:opacity-60 cursor-pointer backdrop-blur-md hover:-translate-y-0.5"
            >
              {oauthLoadingProvider === "google" ? (
                <Loader2 className="w-4 h-4 animate-spin text-slate-500 dark:text-slate-300" />
              ) : (
                <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24">
                  <path
                    fill="#EA4335"
                    d="M12 5c1.6 0 3 .6 4.1 1.7l3.1-3.1C17.3 1.8 14.8 1 12 1 7.5 1 3.7 3.6 1.9 7.3l3.7 2.9C6.5 7.4 9 5 12 5z"
                  />
                  <path
                    fill="#4285F4"
                    d="M23.5 12.3c0-.8-.1-1.6-.2-2.3H12v4.5h6.5c-.3 1.5-1.1 2.8-2.4 3.7l3.7 2.9c2.2-2 3.7-5 3.7-8.8z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M5.6 14.8c-.2-.7-.4-1.5-.4-2.8s.2-2.1.4-2.8L1.9 6.3C.7 8.7 0 10.3 0 12s.7 3.3 1.9 5.7l3.7-2.9z"
                  />
                  <path
                    fill="#34A853"
                    d="M12 23c3.2 0 6-1.1 8-3l-3.7-2.9c-1.1.7-2.5 1.2-4.3 1.2-3 0-5.5-2.4-6.4-5.2L1.9 16C3.7 19.7 7.5 23 12 23z"
                  />
                </svg>
              )}
              <span>Continue with Google</span>
            </button>

            <button
              type="button"
              onClick={() => handleOAuth("github")}
              disabled={isAnyLoading}
              className="w-full flex items-center justify-center gap-2.5 px-4 py-2.5 rounded-xl bg-white/70 hover:bg-white/95 dark:bg-white/[0.06] dark:hover:bg-white/[0.10] border border-slate-900/[0.08] dark:border-white/[0.10] text-xs font-semibold text-slate-800 dark:text-slate-100 transition-all shadow-xs disabled:opacity-60 cursor-pointer backdrop-blur-md hover:-translate-y-0.5"
            >
              {oauthLoadingProvider === "github" ? (
                <Loader2 className="w-4 h-4 animate-spin text-slate-500 dark:text-slate-300" />
              ) : (
                <svg className="w-4 h-4 shrink-0 fill-slate-800 dark:fill-white" viewBox="0 0 24 24">
                  <path
                    fillRule="evenodd"
                    clipRule="evenodd"
                    d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.53 1.032 1.53 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z"
                  />
                </svg>
              )}
              <span>Continue with GitHub</span>
            </button>
          </div>

          {/* Clean Divider */}
          <div className="relative my-4">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-slate-900/[0.06] dark:border-white/[0.08]" />
            </div>
            <div className="relative flex justify-center text-[10px] uppercase tracking-wider">
              <span className="bg-white/90 dark:bg-[#080d1a] px-3 text-slate-400 dark:text-slate-500 font-medium">
                or with email
              </span>
            </div>
          </div>

          {/* Clean Form */}
          <form onSubmit={handleSubmit} className="space-y-3">
            {mode === "signin" ? (
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
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
                    className="w-full bg-slate-100/60 dark:bg-white/[0.05] border border-slate-900/[0.08] dark:border-white/[0.10] focus:border-blue-500/60 focus:bg-white dark:focus:bg-white/[0.08] rounded-xl pl-9 pr-3 py-2 text-xs text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none transition-all"
                  />
                </div>
              </div>
            ) : (
              <>
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                      Username
                    </label>
                    <span className="text-[10px] text-slate-400 dark:text-slate-500 font-mono">
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
                      className="w-full bg-slate-100/60 dark:bg-white/[0.05] border border-slate-900/[0.08] dark:border-white/[0.10] focus:border-blue-500/60 focus:bg-white dark:focus:bg-white/[0.08] rounded-xl pl-9 pr-8 py-2 text-xs font-mono text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none transition-all"
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

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Email Address
                  </label>
                  <div className="relative">
                    <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="engineer@domain.com"
                      className="w-full bg-slate-100/60 dark:bg-white/[0.05] border border-slate-900/[0.08] dark:border-white/[0.10] focus:border-blue-500/60 focus:bg-white dark:focus:bg-white/[0.08] rounded-xl pl-9 pr-3 py-2 text-xs text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none transition-all"
                    />
                  </div>
                </div>
              </>
            )}

            {/* Password input */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Password
                </label>
                {mode === "signup" && password.length > 0 && (
                  <span
                    className={cn(
                      "text-[10.5px] font-bold uppercase tracking-wider",
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
                <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type={showPassword ? "text" : "password"}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••••••"
                  className="w-full bg-slate-100/60 dark:bg-white/[0.05] border border-slate-900/[0.08] dark:border-white/[0.10] focus:border-blue-500/60 focus:bg-white dark:focus:bg-white/[0.08] rounded-xl pl-9 pr-10 py-2 text-xs text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none transition-all"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                </button>
              </div>

              {/* Password strength checklist for Registration */}
              {mode === "signup" && (
                <div className="mt-2 space-y-1.5 p-2.5 rounded-xl bg-slate-500/5 border border-slate-500/10">
                  {/* Strength Bar */}
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

                  {/* Requirements checklist */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-1 pt-1 text-[10px]">
                    <div
                      className={cn(
                        "flex items-center gap-1",
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
                        "flex items-center gap-1",
                        passwordCriteria.hasNumber
                          ? "text-emerald-600 dark:text-emerald-400 font-medium"
                          : "text-slate-400 dark:text-slate-500"
                      )}
                    >
                      <Check className="w-3 h-3 shrink-0" />
                      <span>Number (0-9)</span>
                    </div>
                    <div
                      className={cn(
                        "flex items-center gap-1",
                        passwordCriteria.hasSpecialOrUpper
                          ? "text-emerald-600 dark:text-emerald-400 font-medium"
                          : "text-slate-400 dark:text-slate-500"
                      )}
                    >
                      <Check className="w-3 h-3 shrink-0" />
                      <span>Upper / Symbol</span>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Confirm Password Section (Required for Registration) */}
            {mode === "signup" && (
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                    Confirm Password
                  </label>
                  {confirmPassword.length > 0 && (
                    <span
                      className={cn(
                        "text-[10.5px] font-semibold flex items-center gap-1",
                        passwordsMatch
                          ? "text-emerald-600 dark:text-emerald-400"
                          : "text-rose-500"
                      )}
                    >
                      {passwordsMatch ? (
                        <>
                          <Check className="w-3 h-3" /> Passwords match
                        </>
                      ) : (
                        "Passwords do not match"
                      )}
                    </span>
                  )}
                </div>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type={showConfirmPassword ? "text" : "password"}
                    required
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="••••••••••••"
                    className={cn(
                      "w-full bg-slate-100/60 dark:bg-white/[0.05] border rounded-xl pl-9 pr-10 py-2 text-xs text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none transition-all",
                      confirmPassword.length > 0
                        ? passwordsMatch
                          ? "border-emerald-500/60 focus:border-emerald-500"
                          : "border-rose-500/60 focus:border-rose-500"
                        : "border-slate-900/[0.08] dark:border-white/[0.10] focus:border-blue-500/60"
                    )}
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                    tabIndex={-1}
                  >
                    {showConfirmPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </div>
            )}

            {/* Profile Avatar Selection in Registration */}
            {mode === "signup" && (
              <div className="pt-1">
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                  Select Starting Avatar
                </label>
                <div className="grid grid-cols-4 gap-2">
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
                            ? "border-blue-500 bg-blue-500/10 ring-1 ring-blue-500/40"
                            : "border-slate-900/[0.08] dark:border-white/[0.08] hover:border-slate-300 dark:hover:border-white/20"
                        )}
                        title={av.name}
                      >
                        <div
                          className={cn(
                            "w-8 h-8 rounded-lg flex items-center justify-center text-white mb-1 shadow-xs",
                            `bg-gradient-to-br ${av.gradient}`
                          )}
                        >
                          {av.svgIcon("w-4 h-4 text-white")}
                        </div>
                        <span className="text-[9px] font-bold text-slate-700 dark:text-slate-300 truncate max-w-[55px]">
                          {av.name.split(" ")[0]}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            <button
              type="submit"
              disabled={isSignupDisabled}
              className="w-full mt-3 py-2.5 px-4 bg-blue-600 hover:bg-blue-500 active:scale-[0.99] text-white font-semibold text-xs rounded-xl flex items-center justify-center gap-2 shadow-lg shadow-blue-500/20 disabled:opacity-50 disabled:cursor-not-allowed transition-all cursor-pointer"
            >
              {isSubmitting ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <>
                  <span>{mode === "signin" ? "Sign In" : "Create Account"}</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </>
              )}
            </button>
          </form>

          {/* Mode Switcher footer */}
          <div className="mt-4 pt-3 border-t border-slate-900/[0.06] dark:border-white/[0.08] flex items-center justify-center text-xs text-slate-500 dark:text-slate-400 gap-1.5">
            <span>{mode === "signin" ? "Don't have an account?" : "Already have an account?"}</span>
            <button
              type="button"
              onClick={() => {
                setError(null);
                setMode(mode === "signin" ? "signup" : "signin");
              }}
              className="text-blue-600 dark:text-blue-400 hover:underline font-semibold cursor-pointer"
            >
              {mode === "signin" ? "Create one" : "Sign in"}
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
