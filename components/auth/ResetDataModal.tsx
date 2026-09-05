/**
 * components/auth/ResetDataModal.tsx
 *
 * Secure Two-Step Destructive Confirmation Modal for "Reset All Progress".
 * Requires explicit typed confirmation ("RESET") before purging cloud database
 * tables and local storage client state.
 */
"use client";

import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { AlertTriangle, X, Loader2, CheckCircle2, ShieldAlert } from "lucide-react";
import { useAuth } from "@/lib/supabase/auth-context";

interface ResetDataModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function ResetDataModal({ isOpen, onClose }: ResetDataModalProps) {
  const { resetUserData, user } = useAuth();
  const [confirmationInput, setConfirmationInput] = useState("");
  const [isResetting, setIsResetting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  if (!isOpen) return null;

  const isConfirmed = confirmationInput.trim() === "RESET";

  const handleClose = () => {
    if (isResetting) return;
    setConfirmationInput("");
    setErrorMessage(null);
    setSuccessMessage(null);
    onClose();
  };

  const handleReset = async () => {
    if (!isConfirmed || isResetting) return;

    setErrorMessage(null);
    setIsResetting(true);

    try {
      const res = await resetUserData();
      if (res.success) {
        setSuccessMessage("Your REEC progress has been reset.");
        setTimeout(() => {
          handleClose();
        }, 1200);
      } else {
        setErrorMessage(
          res.error || "Reset could not be completed. Your data has not been removed. Please try again."
        );
      }
    } catch (err: unknown) {
      setErrorMessage(
        err instanceof Error
          ? err.message
          : "Reset could not be completed. Your data has not been removed. Please try again."
      );
    } finally {
      setIsResetting(false);
    }
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 overflow-y-auto">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={handleClose}
          className="fixed inset-0 bg-black/80 backdrop-blur-md"
        />

        {/* Modal Window */}
        <motion.div
          initial={{ scale: 0.95, opacity: 0, y: 12 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.95, opacity: 0, y: 12 }}
          transition={{ duration: 0.2 }}
          className="relative w-full max-w-lg bg-white dark:bg-[#11141c] border border-red-500/30 rounded-2xl shadow-2xl p-6 sm:p-7 text-slate-900 dark:text-slate-100 overflow-hidden z-10 my-8 backdrop-blur-xl"
        >
          {/* Top warning highlight */}
          <div className="pointer-events-none absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-red-600 via-rose-500 to-amber-500" />

          {/* Close button */}
          <button
            onClick={handleClose}
            disabled={isResetting}
            className="absolute top-4 right-4 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition-colors p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800/60 disabled:opacity-40"
            aria-label="Close reset modal"
          >
            <X className="w-5 h-5" />
          </button>

          {/* Header */}
          <div className="flex items-start gap-3.5 mb-5">
            <div className="w-10 h-10 rounded-xl bg-red-500/10 border border-red-500/20 flex items-center justify-center text-red-600 dark:text-red-400 shrink-0 mt-0.5">
              <ShieldAlert className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900 dark:text-white tracking-tight">
                Reset all REEC progress?
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                This action is destructive and cannot be undone.
              </p>
            </div>
          </div>

          {/* Description Body */}
          <div className="mb-5 space-y-3 text-xs text-slate-700 dark:text-slate-300 bg-slate-50 dark:bg-slate-900/60 border border-slate-200/80 dark:border-slate-800/80 rounded-xl p-4">
            <p className="font-medium text-slate-800 dark:text-slate-200">
              This permanently deletes your personal learning data, including:
            </p>
            <ul className="list-disc pl-5 space-y-1 text-slate-600 dark:text-slate-400">
              <li>Completed lesson marks, interactive checkmarks, and streak records</li>
              <li>Saved bookmarks, phase notes, and study session logs</li>
              <li>User-authored engineering projects and milestone progress</li>
              <li>Unlocked hidden lessons and discovery state</li>
              <li>Personal Rust workspace files in <code className="text-red-600 dark:text-amber-300 font-mono text-[11px]">hello_reec</code></li>
            </ul>
            <div className="pt-2 border-t border-slate-200 dark:border-slate-800 text-[11px] text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" />
              <span>
                Your REEC account ({user?.email || "current session"}) and official curriculum content remain intact.
              </span>
            </div>
          </div>

          {/* Error Banner */}
          {errorMessage && (
            <motion.div
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              className="mb-4 p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-700 dark:text-red-300 text-xs flex items-start gap-2"
            >
              <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{errorMessage}</span>
            </motion.div>
          )}

          {/* Success Banner */}
          {successMessage && (
            <motion.div
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              className="mb-4 p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-700 dark:text-emerald-300 text-xs flex items-start gap-2"
            >
              <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{successMessage}</span>
            </motion.div>
          )}

          {/* Confirmation Input Field */}
          <div className="mb-6">
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
              To confirm, type <span className="text-red-600 dark:text-red-400 font-mono font-bold">RESET</span> below:
            </label>
            <input
              type="text"
              value={confirmationInput}
              onChange={(e) => setConfirmationInput(e.target.value)}
              disabled={isResetting || Boolean(successMessage)}
              placeholder="Type RESET to confirm"
              className="w-full bg-slate-50 dark:bg-[#1a1d26] border border-slate-300 dark:border-[#2d3342] focus:border-red-500 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none transition-colors font-mono"
            />
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={handleClose}
              disabled={isResetting}
              className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800/80 dark:hover:bg-slate-700/80 border border-slate-200 dark:border-slate-700 text-xs font-medium text-slate-700 dark:text-slate-300 transition-colors disabled:opacity-50 cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleReset}
              disabled={!isConfirmed || isResetting || Boolean(successMessage)}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-red-600 hover:bg-red-500 text-xs font-semibold text-white transition-all shadow-sm disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
            >
              {isResetting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
              <span>{isResetting ? "Resetting Progress..." : "Reset All Progress"}</span>
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
