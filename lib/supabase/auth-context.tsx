/**
 * lib/supabase/auth-context.tsx
 *
 * Provides Authentication state, Auth Modal controls, OAuth popup lifecycle,
 * and automatic cloud synchronization triggers.
 * Includes cross-device account deletion detection and automatic multi-tab sign out.
 */
"use client";

import React, { createContext, useContext, useEffect, useState, useCallback, useMemo, useRef } from "react";
import type { User, Session } from "@supabase/supabase-js";
import { getSupabaseClient, isSupabaseConfigured } from "./client";
import { SupabaseSyncService, SyncStatus } from "./sync-service";
import { getOAuthCallbackUrl } from "./site-url";
import {
  isUsernameAvailable,
  normalizeUsername,
  validateUsernameSyntax,
  checkUsernameChangeCooldown,
  recordUsernameInLocalRegistry,
  findEmailByUsername,
  getLocalUsernameRegistry,
} from "./username-service";

interface AuthContextType {
  user: User | null;
  session: Session | null;
  username: string | null;
  lastUsernameChangedAt: string | null;
  isLoading: boolean;
  isConfigured: boolean;
  syncStatus: SyncStatus;
  syncError: string | null;
  isAuthModalOpen: boolean;
  oauthLoadingProvider: "google" | "github" | null;
  openAuthModal: () => void;
  closeAuthModal: () => void;
  signInWithPassword: (emailOrUsername: string, password: string) => Promise<{ error: Error | null }>;
  signUpWithPassword: (email: string, password: string, displayName?: string, username?: string, avatarId?: string) => Promise<{ error: Error | null }>;
  updateUsername: (newUsername: string) => Promise<{ success: boolean; error?: string; remainingDays?: number; nextChangeDate?: string }>;
  signInWithOAuth: (provider: "google" | "github") => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
  triggerSync: () => Promise<boolean>;
  resetUserData: () => Promise<{ success: boolean; error?: string }>;
  deleteAccount: () => Promise<{ success: boolean; error?: string }>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  session: null,
  username: null,
  lastUsernameChangedAt: null,
  isLoading: true,
  isConfigured: false,
  syncStatus: "idle",
  syncError: null,
  isAuthModalOpen: false,
  oauthLoadingProvider: null,
  openAuthModal: () => {},
  closeAuthModal: () => {},
  signInWithPassword: async () => ({ error: new Error("Supabase is not configured") }),
  signUpWithPassword: async () => ({ error: new Error("Supabase is not configured") }),
  updateUsername: async () => ({ success: false, error: "Supabase is not configured" }),
  signInWithOAuth: async () => ({ error: new Error("Supabase is not configured") }),
  signOut: async () => {},
  triggerSync: async () => false,
  resetUserData: async () => ({ success: false, error: "Supabase is not configured" }),
  deleteAccount: async () => ({ success: false, error: "Supabase is not configured" }),
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [username, setUsername] = useState<string | null>(null);
  const [lastUsernameChangedAt, setLastUsernameChangedAt] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [oauthLoadingProvider, setOauthLoadingProvider] = useState<"google" | "github" | null>(null);
  const [syncStatus, setSyncStatus] = useState<SyncStatus>("idle");
  const [syncError, setSyncError] = useState<string | null>(null);

  const activePopupRef = useRef<Window | null>(null);
  const popupMonitorTimerRef = useRef<NodeJS.Timeout | null>(null);

  const configured = isSupabaseConfigured();

  // Sync username and last changed timestamp whenever user state changes
  useEffect(() => {
    if (!user) {
      setUsername(null);
      setLastUsernameChangedAt(null);
      return;
    }

    const metaUsername = user.user_metadata?.username;
    const metaChangedAt = user.user_metadata?.last_username_change_at;

    if (metaUsername) {
      setUsername(normalizeUsername(metaUsername));
      setLastUsernameChangedAt(metaChangedAt || null);
    } else {
      const registry = getLocalUsernameRegistry();
      const matched = Object.values(registry).find((r) => r.userId === user.id);
      if (matched) {
        setUsername(matched.username);
        setLastUsernameChangedAt(matched.lastChangedAt);
      } else {
        const fallback = normalizeUsername(user.email?.split("@")[0] || "engineer");
        setUsername(fallback);
      }
    }

    // Also check profiles table in Supabase
    const client = getSupabaseClient();
    if (client) {
      (client as any)
        .from("profiles")
        .select("username, last_username_change_at")
        .eq("id", user.id)
        .maybeSingle()
        .then(({ data }: { data: any }) => {
          if (data?.username) {
            setUsername(normalizeUsername(data.username));
            if (data.last_username_change_at) {
              setLastUsernameChangedAt(data.last_username_change_at);
            }
          }
        })
        .catch(() => {});
    }
  }, [user]);

  useEffect(() => {
    const unsub = SupabaseSyncService.subscribeStatus((status, err) => {
      setSyncStatus(status);
      setSyncError(err || null);
    });
    return unsub;
  }, []);

  // Multi-tab storage event listener for cross-device / multi-tab account deletion
  useEffect(() => {
    function handleStorage(e: StorageEvent) {
      if (e.key === "reec_account_deleted_event") {
        setUser(null);
        setSession(null);
        SupabaseSyncService.handleRemoteAccountDeletion().catch(() => {});
      }
    }
    window.addEventListener("storage", handleStorage);
    return () => window.removeEventListener("storage", handleStorage);
  }, []);

  useEffect(() => {
    const client = getSupabaseClient();
    if (!client) {
      setIsLoading(false);
      return;
    }

    // 1. Initial session load and validation
    client.auth
      .getSession()
      .then(async ({ data: { session: initialSession }, error }) => {
        if (!error && initialSession?.user) {
          // Validate user existence with auth backend
          const { data: userData, error: userError } = await client.auth.getUser();
          if (userError || !userData?.user) {
            // User was deleted on another device or backend
            await client.auth.signOut().catch(() => {});
            setSession(null);
            setUser(null);
            SupabaseSyncService.setCurrentUser(null);
          } else {
            setSession(initialSession);
            setUser(initialSession.user);
            SupabaseSyncService.setCurrentUser(initialSession.user.id, initialSession.user.email ?? null);
          }
        } else {
          setSession(null);
          setUser(null);
          SupabaseSyncService.setCurrentUser(null);
        }
        setIsLoading(false);
      })
      .catch(() => {
        setIsLoading(false);
      });

    // 2. Listen to Auth State Changes
    const {
      data: { subscription },
    } = client.auth.onAuthStateChange((_event, currentSession) => {
      setSession(currentSession);
      const currentUser = currentSession?.user ?? null;
      setUser(currentUser);
      SupabaseSyncService.setCurrentUser(currentUser ? currentUser.id : null, currentUser?.email ?? null);
      if (currentUser) {
        setOauthLoadingProvider(null);
      }
    });

    // 3. Periodic / visibility change check for deleted accounts on other devices
    const handleVisibilityCheck = async () => {
      if (document.visibilityState === "visible") {
        const {
          data: { session: activeSession },
        } = await client.auth.getSession();
        if (activeSession) {
          const { error } = await client.auth.getUser();
          if (error) {
            // User was deleted remotely
            await client.auth.signOut().catch(() => {});
            setUser(null);
            setSession(null);
            SupabaseSyncService.handleRemoteAccountDeletion().catch(() => {});
          }
        }
      }
    };
    document.addEventListener("visibilitychange", handleVisibilityCheck);

    return () => {
      subscription.unsubscribe();
      document.removeEventListener("visibilitychange", handleVisibilityCheck);
    };
  }, []);

  // Listen to postMessage from OAuth popups (preview environment constraint handling)
  useEffect(() => {
    const handleMessage = async (event: MessageEvent) => {
      if (event.data?.type === "OAUTH_AUTH_SUCCESS") {
        if (popupMonitorTimerRef.current) {
          clearInterval(popupMonitorTimerRef.current);
          popupMonitorTimerRef.current = null;
        }
        setOauthLoadingProvider(null);

        const client = getSupabaseClient();
        if (client) {
          try {
            if (event.data.session?.access_token && event.data.session?.refresh_token) {
              await client.auth.setSession({
                access_token: event.data.session.access_token,
                refresh_token: event.data.session.refresh_token,
              });
            }

            const {
              data: { session: updatedSession },
            } = await client.auth.getSession();
            if (updatedSession?.user) {
              setSession(updatedSession);
              setUser(updatedSession.user);
              SupabaseSyncService.setCurrentUser(updatedSession.user.id, updatedSession.user.email ?? null);
              setIsAuthModalOpen(false);
              await SupabaseSyncService.migrateAndHydrateUser(updatedSession.user.id);
            }
          } catch (err) {
            console.warn("[OAuth] Error hydrating session from popup:", err);
          }
        }
      } else if (event.data?.type === "OAUTH_AUTH_ERROR") {
        if (popupMonitorTimerRef.current) {
          clearInterval(popupMonitorTimerRef.current);
          popupMonitorTimerRef.current = null;
        }
        setOauthLoadingProvider(null);
      }
    };

    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
  }, []);

  const openAuthModal = useCallback(() => {
    setIsAuthModalOpen(true);
  }, []);

  const closeAuthModal = useCallback(() => {
    if (popupMonitorTimerRef.current) {
      clearInterval(popupMonitorTimerRef.current);
      popupMonitorTimerRef.current = null;
    }
    if (activePopupRef.current && !activePopupRef.current.closed) {
      try {
        activePopupRef.current.close();
      } catch {}
    }
    setOauthLoadingProvider(null);
    setIsAuthModalOpen(false);
  }, []);

  const signInWithPassword = useCallback(
    async (emailOrUsername: string, password: string): Promise<{ error: Error | null }> => {
      const client = getSupabaseClient();
      if (!client) {
        return {
          error: new Error("Supabase is not configured. Add NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY."),
        };
      }

      try {
        let targetEmail = emailOrUsername.trim();

        // If the user entered a username (e.g. "@engineer" or "engineer")
        if (!targetEmail.includes("@")) {
          const cleanUser = normalizeUsername(targetEmail);
          // Look up in local registry
          const localEmail = findEmailByUsername(cleanUser);
          if (localEmail) {
            targetEmail = localEmail;
          } else {
            // Lookup via API
            try {
              const res = await fetch(`/api/auth/username?action=lookup&username=${encodeURIComponent(cleanUser)}`);
              if (res.ok) {
                const data = await res.json();
                if (data.found && data.email) {
                  targetEmail = data.email;
                }
              }
            } catch {
              // fallback
            }
          }
        }

        const { error } = await client.auth.signInWithPassword({ email: targetEmail, password });
        if (error) return { error };
        setIsAuthModalOpen(false);
        return { error: null };
      } catch (err: unknown) {
        return { error: err instanceof Error ? err : new Error("Sign in failed") };
      }
    },
    []
  );

  const signUpWithPassword = useCallback(
    async (
      email: string,
      password: string,
      displayName?: string,
      requestedUsername?: string,
      avatarId?: string
    ): Promise<{ error: Error | null }> => {
      const client = getSupabaseClient();
      if (!client) {
        return {
          error: new Error("Supabase is not configured. Add NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY."),
        };
      }

      // 1. If username provided, validate format and uniqueness
      let finalUsername = requestedUsername ? normalizeUsername(requestedUsername) : "";
      if (finalUsername) {
        const syntax = validateUsernameSyntax(finalUsername);
        if (!syntax.valid) {
          return { error: new Error(syntax.error || "Invalid username") };
        }
        const avail = await isUsernameAvailable(finalUsername);
        if (!avail.available) {
          return { error: new Error(avail.error || `Username @${finalUsername} is already taken`) };
        }
      } else {
        finalUsername = normalizeUsername(email.split("@")[0] || "engineer");
      }

      try {
        const nowIso = new Date().toISOString();
        const { data, error } = await client.auth.signUp({
          email,
          password,
          options: {
            data: {
              display_name: displayName || finalUsername,
              username: finalUsername,
              avatar_id: avatarId || "avatar-rustacean",
              last_username_change_at: nowIso,
            },
          },
        });

        if (error) return { error };

        // Create profile row with username if user was created immediately
        if (data.user) {
          recordUsernameInLocalRegistry(finalUsername, data.user.id, email, nowIso);
          setUsername(finalUsername);
          setLastUsernameChangedAt(nowIso);

          await (client as any).from("profiles").upsert(
            {
              id: data.user.id,
              email: data.user.email,
              display_name: displayName || finalUsername,
              username: finalUsername,
              avatar_id: avatarId || "avatar-rustacean",
              last_username_change_at: nowIso,
              updated_at: nowIso,
            },
            { onConflict: "id" }
          );

          // Sync to username API
          try {
            await fetch("/api/auth/username", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                username: finalUsername,
                userId: data.user.id,
                email,
                force: true,
              }),
            });
          } catch {
            // ignore
          }
        }

        setIsAuthModalOpen(false);
        return { error: null };
      } catch (err: unknown) {
        return { error: err instanceof Error ? err : new Error("Sign up failed") };
      }
    },
    []
  );

  const updateUsername = useCallback(
    async (
      newUsername: string
    ): Promise<{ success: boolean; error?: string; remainingDays?: number; nextChangeDate?: string }> => {
      if (!user) {
        return { success: false, error: "You must be signed in to update your username" };
      }

      // 1. Validate syntax
      const syntax = validateUsernameSyntax(newUsername);
      if (!syntax.valid) {
        return { success: false, error: syntax.error };
      }

      const clean = syntax.cleanUsername!;

      // 2. Check 6-month cooldown
      const cooldown = checkUsernameChangeCooldown(lastUsernameChangedAt);
      if (!cooldown.canChange) {
        return {
          success: false,
          error: cooldown.reason,
          remainingDays: cooldown.remainingDays,
          nextChangeDate: cooldown.nextChangeDate,
        };
      }

      // 3. Check uniqueness across all users
      const avail = await isUsernameAvailable(clean, user.id);
      if (!avail.available) {
        return { success: false, error: avail.error || `Username @${clean} is already taken by another user.` };
      }

      try {
        const nowIso = new Date().toISOString();

        // Call backend API
        const apiRes = await fetch("/api/auth/username", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            username: clean,
            userId: user.id,
            email: user.email,
            lastChangedAt: lastUsernameChangedAt,
          }),
        });

        if (!apiRes.ok) {
          const apiData = await apiRes.json().catch(() => ({}));
          return {
            success: false,
            error: apiData.error || "Failed to update username",
            remainingDays: apiData.remainingDays,
            nextChangeDate: apiData.nextChangeDate,
          };
        }

        // Update local registry & state
        recordUsernameInLocalRegistry(clean, user.id, user.email || "", nowIso);
        setUsername(clean);
        setLastUsernameChangedAt(nowIso);

        // Update Supabase auth user metadata & profiles table
        const client = getSupabaseClient();
        if (client) {
          await client.auth.updateUser({
            data: {
              username: clean,
              last_username_change_at: nowIso,
            },
          }).catch(() => {});

          await (client as any)
            .from("profiles")
            .upsert(
              {
                id: user.id,
                username: clean,
                last_username_change_at: nowIso,
                updated_at: nowIso,
              },
              { onConflict: "id" }
            )
            .catch(() => {});
        }

        return { success: true };
      } catch (err: unknown) {
        return {
          success: false,
          error: err instanceof Error ? err.message : "Failed to update username",
        };
      }
    },
    [user, lastUsernameChangedAt]
  );

  const signInWithOAuth = useCallback(
    async (provider: "google" | "github"): Promise<{ error: Error | null }> => {
      const client = getSupabaseClient();
      if (!client) {
        return {
          error: new Error("Supabase is not configured. Add NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY."),
        };
      }

      setOauthLoadingProvider(provider);

      // Pre-open a popup window directly within the user's click gesture to avoid browser popup blockers
      let authWindow: Window | null = null;
      if (typeof window !== "undefined") {
        const width = 600;
        const height = 720;
        const left = window.screenX + Math.max(0, (window.outerWidth - width) / 2);
        const top = window.screenY + Math.max(0, (window.outerHeight - height) / 2);

        try {
          authWindow = window.open(
            "about:blank",
            "oauth_popup",
            `width=${width},height=${height},left=${left},top=${top},status=no,resizable=yes,scrollbars=yes`
          );
          if (authWindow) {
            activePopupRef.current = authWindow;
            authWindow.document.write(`
              <!DOCTYPE html>
              <html>
                <head>
                  <title>Connecting to ${provider === "google" ? "Google" : "GitHub"}...</title>
                  <style>
                    body { margin: 0; background: #090e1a; color: #f8fafc; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; display: flex; align-items: center; justify-content: center; height: 100vh; text-align: center; }
                    .box { background: #111a2e; border: 1px solid rgba(255,255,255,0.1); padding: 2rem; border-radius: 1rem; max-width: 320px; box-shadow: 0 20px 40px rgba(0,0,0,0.5); }
                    .spin { width: 28px; height: 28px; border: 3px solid rgba(255,255,255,0.1); border-top-color: #3b82f6; border-radius: 50%; animation: s 0.8s linear infinite; margin: 0 auto 1rem; }
                    @keyframes s { to { transform: rotate(360deg); } }
                    p { font-size: 13px; color: #94a3b8; margin: 0; }
                  </style>
                </head>
                <body>
                  <div class="box">
                    <div class="spin"></div>
                    <p>Connecting to ${provider === "google" ? "Google" : "GitHub"} authorization server...</p>
                  </div>
                </body>
              </html>
            `);
          }
        } catch (e) {
          console.warn("[OAuth] Pre-open popup error:", e);
        }
      }

      try {
        const currentPath = typeof window !== "undefined" ? window.location.pathname + window.location.search : "/";
        const redirectTo = getOAuthCallbackUrl(currentPath);

        const { data, error } = await client.auth.signInWithOAuth({
          provider,
          options: {
            redirectTo,
            skipBrowserRedirect: true,
          },
        });

        if (error) {
          if (authWindow && !authWindow.closed) {
            authWindow.close();
          }
          setOauthLoadingProvider(null);
          return { error };
        }

        if (data?.url) {
          if (authWindow && !authWindow.closed) {
            authWindow.location.href = data.url;

            // Monitor popup closure by user
            if (popupMonitorTimerRef.current) {
              clearInterval(popupMonitorTimerRef.current);
            }
            popupMonitorTimerRef.current = setInterval(() => {
              if (authWindow && authWindow.closed) {
                if (popupMonitorTimerRef.current) {
                  clearInterval(popupMonitorTimerRef.current);
                  popupMonitorTimerRef.current = null;
                }
                setOauthLoadingProvider(null);
              }
            }, 600);
          } else {
            // Popup was blocked by browser
            setOauthLoadingProvider(null);
            return {
              error: new Error(
                "Popup window was blocked by your browser. Please allow popups for this site, or sign in with email."
              ),
            };
          }
        } else {
          if (authWindow && !authWindow.closed) {
            authWindow.close();
          }
          setOauthLoadingProvider(null);
          return { error: new Error(`Failed to generate ${provider} authorization URL`) };
        }

        return { error: null };
      } catch (err: unknown) {
        if (authWindow && !authWindow.closed) {
          authWindow.close();
        }
        setOauthLoadingProvider(null);
        return { error: err instanceof Error ? err : new Error(`Failed to initialize ${provider} sign in`) };
      }
    },
    []
  );

  const signOut = useCallback(async () => {
    const client = getSupabaseClient();
    if (client) {
      try {
        await client.auth.signOut();
      } catch (err) {
        console.warn("[Auth] signOut error:", err);
      }
    }
    setUser(null);
    setSession(null);
    setUsername(null);
    SupabaseSyncService.setCurrentUser(null);
    SupabaseSyncService.resetAllLocalStores();
  }, []);

  const triggerSync = useCallback(async (): Promise<boolean> => {
    if (!user) return false;
    return await SupabaseSyncService.migrateAndHydrateUser(user.id);
  }, [user]);

  const resetUserData = useCallback(async (): Promise<{ success: boolean; error?: string }> => {
    return await SupabaseSyncService.resetCurrentUserData(user?.id);
  }, [user]);

  const deleteAccount = useCallback(async (): Promise<{ success: boolean; error?: string }> => {
    const res = await SupabaseSyncService.deleteCurrentAccount(user?.id);
    if (res.success) {
      setUser(null);
      setSession(null);
    }
    return res;
  }, [user]);

  const value = useMemo(
    () => ({
      user,
      session,
      username,
      lastUsernameChangedAt,
      isLoading,
      isConfigured: configured,
      syncStatus,
      syncError,
      isAuthModalOpen,
      oauthLoadingProvider,
      openAuthModal,
      closeAuthModal,
      signInWithPassword,
      signUpWithPassword,
      updateUsername,
      signInWithOAuth,
      signOut,
      triggerSync,
      resetUserData,
      deleteAccount,
    }),
    [
      user,
      session,
      username,
      lastUsernameChangedAt,
      isLoading,
      configured,
      syncStatus,
      syncError,
      isAuthModalOpen,
      oauthLoadingProvider,
      openAuthModal,
      closeAuthModal,
      signInWithPassword,
      signUpWithPassword,
      updateUsername,
      signInWithOAuth,
      signOut,
      triggerSync,
      resetUserData,
      deleteAccount,
    ]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  return useContext(AuthContext);
}
