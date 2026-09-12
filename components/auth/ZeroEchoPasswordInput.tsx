"use client";

import React, { useState } from "react";
import { Eye, EyeOff } from "lucide-react";
import { cn } from "@/lib/utils";

export interface ZeroEchoPasswordInputProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, "value" | "onChange"> {
  value: string;
  onChange: (value: string) => void;
  showPassword?: boolean;
  onToggleShowPassword?: () => void;
  hideToggleIcon?: boolean;
}

/**
 * ZeroEchoPasswordInput
 *
 * Rock-solid, accessible, and high-performance password input.
 * Fully compatible with:
 * - Mobile virtual keyboards (iOS Safari, Android Chrome, Gboard, Samsung Keyboard)
 * - Password autofill (iCloud Keychain, 1Password, Bitwarden, Google Password Manager)
 * - Native composition events, fast touch typing, and backspace
 * - Prevents character echo vulnerabilities by utilizing standard secure DOM masking
 */
export const ZeroEchoPasswordInput = React.forwardRef<
  HTMLInputElement,
  ZeroEchoPasswordInputProps
>(function ZeroEchoPasswordInput(
  {
    value,
    onChange,
    showPassword = false,
    onToggleShowPassword,
    hideToggleIcon = false,
    className,
    placeholder = "••••••••••••",
    autoComplete = "current-password",
    ...props
  },
  forwardedRef
) {
  const [internalShow, setInternalShow] = useState(false);
  const isVisible = showPassword || internalShow;

  const handleToggle = () => {
    if (onToggleShowPassword) {
      onToggleShowPassword();
    } else {
      setInternalShow((prev) => !prev);
    }
  };

  return (
    <div className="relative w-full">
      <input
        ref={forwardedRef}
        type={isVisible ? "text" : "password"}
        value={value || ""}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        autoComplete={autoComplete}
        autoCapitalize="none"
        autoCorrect="off"
        spellCheck={false}
        className={cn(
          "w-full bg-slate-50/80 hover:bg-white focus:bg-white dark:bg-white/[0.04] dark:hover:bg-white/[0.06] dark:focus:bg-[#0f172a]",
          "border border-slate-200 dark:border-white/[0.12] focus:border-blue-600 dark:focus:border-blue-500",
          "rounded-xl pl-9 pr-10 py-2.5 sm:py-2.5 text-base sm:text-sm text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500",
          "focus:outline-none focus:ring-2 focus:ring-blue-500/20 dark:focus:ring-blue-500/25 transition-all shadow-2xs",
          className
        )}
        {...props}
      />

      {!hideToggleIcon && (
        <button
          type="button"
          onClick={handleToggle}
          tabIndex={-1}
          aria-label={isVisible ? "Hide password" : "Show password"}
          className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition-colors cursor-pointer min-w-[32px] min-h-[32px] flex items-center justify-center"
        >
          {isVisible ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
        </button>
      )}
    </div>
  );
});
