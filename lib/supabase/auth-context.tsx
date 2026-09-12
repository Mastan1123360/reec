/**
 * lib/supabase/auth-context.tsx
 *
 * Authoritative Application Context for REEC Identity & Authentication.
 *
 * Implements Master Engineering Specification Sections 4, 5, 6, 7, 8, 9, 10:
 * 1. Single Conceptual Authority: Supabase Auth is the sole authority for identity and session validity.
 * 2. Canonical Authentication State Machine:
 *    UNKNOWN -> AUTHENTICATING -> AUTHENTICATED (EMAIL_UNVERIFIED / EMAIL_VERIFIED) -> SIGNED_OUT
 * 3. Username is a profile concept, enforced by the database (no local storage registries).
 * 4. Verification Authority: Supabase Auth verifies users; REEC never manufactures confirmation.
 * 5. Deterministic signup & signin contracts with full error propagation.
 */
"use client";

import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  useMemo,
} from "react";
import type { User, Session } from "@supabase/supabase-js";
import { getSupabaseClient, isSupabaseConfigured } from "./client";
import { SupabaseSyncService, SyncStatus } from "./sync-service";
import {
  validateUsernameSyntax,
  checkUsernameChangeCooldown,
  isUsernameAvailable,
  findEmailByUsername,
  normalizeUsername,
} from "./username-service";
import {
  CanonicalAuthState,
  AuthStatus,
  UserIdentity,
  UserProfile,
  createInitialAuthState,
  transitionToAuthenticating,
  transitionToAuthenticated,
  transitionToSignedOut,
  transitionToError,
  mapSupabaseUserToIdentity,
  mapSupabaseAuthError,
  getDiscreteAuthStatus,
  isEmailVerified as checkEmailVerified,
  isEmailUnverified as checkEmailUnverified,
} from "@/lib/domain/auth";
import { resolveAvatarId } from "@/lib/avatars";
import {
  resolveInstantProfile,
  reconcileProfileWithDatabase,
  setPerUserProfileCache,
} from "./profile-resolver";

interface AuthContextType {
  // Canonical State Machine State
  authState: CanonicalAuthState;
  authStatus: AuthStatus;
  identity: UserIdentity | null;
  profile: UserProfile | null;
  isEmailVerified: boolean;
  isEmailUnverified: boolean;

  // External Layer Bindings (Preserving UI compatibility)
  user: User | null;
  session: Session | null;
  username: string | null;
  lastUsernameChangedAt: string | null;
  isLoading: boolean;
  isConfigured: boolean;
  syncStatus: SyncStatus;
  syncError: string | null;
  isAuthModalOpen: boolean;
  openAuthModal: () => void;
  closeAuthModal: () => void;
  signInWithPassword: (
    emailOrUsername: string,
    password: string
  ) => Promise<{ error: Error | null; unconfirmedEmail?: string }>;
  signUpWithPassword: (
    email: string,
    password: string,
    displayName?: string,
    username?: string,
    avatarId?: string
  ) => Promise<{
    error: Error | null;
    needsEmailConfirmation?: boolean;
    emailOtp?: string | null;
    actionLink?: string | null;
  }>;
  verifyOtpCode: (email: string, token: string) => Promise<{ error: Error | null }>;
  resendVerificationEmail: (email: string) => Promise<{
    error: Error | null;
    emailOtp?: string | null;
    actionLink?: string | null;
  }>;
  signInWithEmailOnly: (email: string) => Promise<{ error: Error | null }>;
  signInWithOAuth: (provider: "google" | "github") => Promise<{ error: Error | null }>;
  updateUsername: (
    newUsername: string
  ) => Promise<{ success: boolean; error?: string; remainingDays?: number; nextChangeDate?: string }>;
  updateProfile: (updates: {
    displayName?: string;
    gender?: "male" | "female";
    avatarId?: string;
    coins?: number;
  }) => Promise<{ success: boolean; error?: string }>;
  signOut: () => Promise<void>;
  triggerSync: () => Promise<boolean>;
  resetUserData: () => Promise<{ success: boolean; error?: string }>;
  deleteAccount: () => Promise<{ success: boolean; error?: string }>;
}

const defaultInitialState = createInitialAuthState();

/**
 * Synchronously reads any already-persisted Supabase session from localStorage
 * (written either by the supabase-js client itself under `sb-<ref>-auth-token`,
 * or by our own OAuth callback under `reec_oauth_session`) so the very first
 * render can already reflect an authenticated user — no waiting on the async
 * `getSession()` round trip. This is what makes Google/GitHub sign-in feel
 * instant: by the time the destination page paints for the first time, the
 * profile is already there instead of flashing a loading/signed-out state.
 */
function readStoredSessionSync(): Session | null {
  if (typeof window === "undefined") return null;
  try {
    const now = Math.floor(Date.now() / 1000);
    const candidates: string[] = [];

    // Prefer the exact supabase-js storage key for the configured project.
    const supabaseUrl = (process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL || "").trim();
    if (supabaseUrl) {
      try {
        const ref = new URL(supabaseUrl).hostname.split(".")[0];
        if (ref) candidates.push(`sb-${ref}-auth-token`);
      } catch {}
    }

    // Fallback: scan localStorage for any sb-*-auth-token key.
    for (let i = 0; i < window.localStorage.length; i++) {
      const key = window.localStorage.key(i);
      if (key && key.startsWith("sb-") && key.endsWith("-auth-token") && !candidates.includes(key)) {
        candidates.push(key);
      }
    }

    // Our own cross-flow handoff key, written immediately on OAuth success.
    candidates.push("reec_oauth_session");
    candidates.push("sb-auth-token");

    for (const key of candidates) {
      const raw = window.localStorage.getItem(key);
      if (!raw) continue;
      const parsed = JSON.parse(raw);
      const session = parsed?.access_token ? parsed : parsed?.currentSession || null;
      if (
        session?.access_token &&
        session?.user?.id &&
        (typeof session.expires_at !== "number" || session.expires_at > now)
      ) {
        return session as Session;
      }
    }
  } catch {}
  return null;
}

/**
 * Builds an optimistic "authenticated" state directly from a locally stored
 * session, mirroring the same metadata-first baseline profile resolution
 * used once the app is fully mounted. Never throws — falls back to null so
 * the normal loading flow takes over.
 */
function buildInstantAuthState(session: Session): CanonicalAuthState | null {
  try {
    const identity = mapSupabaseUserToIdentity(session.user);
    const initialProfile = resolveInstantProfile(session.user);
    return transitionToAuthenticated(identity, session, initialProfile);
  } catch {
    return null;
  }
}

const AuthContext = createContext<AuthContextType>({
  authState: defaultInitialState,
  authStatus: "unknown",
  identity: null,
  profile: null,
  isEmailVerified: false,
  isEmailUnverified: false,
  user: null,
  session: null,
  username: null,
  lastUsernameChangedAt: null,
  isLoading: true,
  isConfigured: false,
  syncStatus: "idle",
  syncError: null,
  isAuthModalOpen: false,
  openAuthModal: () => {},
  closeAuthModal: () => {},
  signInWithPassword: async () => ({ error: new Error("Supabase is not configured") }),
  signUpWithPassword: async () => ({
    error: new Error("Supabase is not configured"),
    needsEmailConfirmation: false,
  }),
  signInWithEmailOnly: async () => ({ error: new Error("Supabase is not configured") }),
  signInWithOAuth: async () => ({ error: new Error("Supabase is not configured") }),
  verifyOtpCode: async () => ({ error: new Error("Supabase is not configured") }),
  resendVerificationEmail: async () => ({ error: new Error("Supabase is not configured") }),
  updateUsername: async () => ({ success: false, error: "Supabase is not configured" }),
  updateProfile: async () => ({ success: false, error: "Supabase is not configured" }),
  signOut: async () => {},
  triggerSync: async () => false,
  resetUserData: async () => ({ success: false, error: "Supabase is not configured" }),
  deleteAccount: async () => ({ success: false, error: "Supabase is not configured" }),
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  // 1. Authoritative Canonical State Machine
  // Lazy initializer: if a valid session is already sitting in localStorage
  // (e.g. immediately after an OAuth redirect), paint as authenticated on
  // the very first render instead of a loading/signed-out flash. The
  // effect below still runs and reconciles against the authoritative
  // Supabase session shortly after.
  const [authState, setAuthState] = useState<CanonicalAuthState>(() => {
    const storedSession = readStoredSessionSync();
    if (storedSession) {
      const instantState = buildInstantAuthState(storedSession);
      if (instantState) return instantState;
    }
    return createInitialAuthState();
  });

  // 2. Auxiliary UI state (Modal visibility & sync status)
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [syncStatus, setSyncStatus] = useState<SyncStatus>("idle");
  const [syncError, setSyncError] = useState<string | null>(null);

  const configured = isSupabaseConfigured();

  // Helper to fetch authoritative profile from database
  const fetchAuthoritativeProfile = useCallback(
    async (userId: string): Promise<UserProfile | null> => {
      const client = getSupabaseClient();
      if (!client) return null;
      try {
        let profileData: any = null;
        const { data, error } = await (client as any)
          .from("profiles")
          .select("id, username, display_name, avatar_id, gender, coins, last_username_change_at, created_at, updated_at")
          .eq("id", userId)
          .maybeSingle();

        if (error) {
          // Retry selecting standard columns if gender/coins or last_username_change_at are not yet in PostgREST schema cache
          const retry = await (client as any)
            .from("profiles")
            .select("id, username, display_name, avatar_id, created_at, updated_at")
            .eq("id", userId)
            .maybeSingle();
          if (!retry.error && retry.data) {
            profileData = retry.data;
          } else if (retry.error) {
            // Fallback for minimal legacy profile schema
            const minRetry = await (client as any)
              .from("profiles")
              .select("id, display_name, created_at, updated_at")
              .eq("id", userId)
              .maybeSingle();
            if (!minRetry.error && minRetry.data) {
              profileData = minRetry.data;
            }
          }
        } else if (!error && data) {
          profileData = data;
        }

        // Check local persistence cache for username fallback
        let fallbackUsername: string | null = null;
        let fallbackDisplayName: string | null = null;
        let fallbackGender: "male" | "female" | null = null;
        let fallbackAvatar: string | null = null;

        if (typeof window !== "undefined") {
          try {
            fallbackUsername =
              localStorage.getItem(`reec_username_${userId}`) ||
              localStorage.getItem("reec_persisted_username") ||
              null;
            fallbackDisplayName =
              localStorage.getItem(`reec_display_name_${userId}`) || null;
            fallbackGender =
              (localStorage.getItem(`reec_selected_gender`) as "male" | "female") || null;
            fallbackAvatar =
              localStorage.getItem(`reec_selected_avatar`) || null;
          } catch {}
        }

        if (profileData) {
          const resolvedUsername = profileData.username
            ? normalizeUsername(profileData.username)
            : fallbackUsername
            ? normalizeUsername(fallbackUsername)
            : null;

          // IMPORTANT: do NOT force a hardcoded default here (e.g. "human-male-alex"
          // or "male") when the database column is genuinely null/undefined. Doing so
          // would fabricate a "non-empty" value that reconcileProfileWithDatabase would
          // then treat as authoritative and use to overwrite a correct value the instant
          // profile already resolved from Auth metadata/local cache. Only resolve a
          // concrete value when the DB or a fallback cache actually has one; otherwise
          // return null and let the merge step keep whatever the current profile holds.
          const rawAvatar = profileData.avatar_id || fallbackAvatar || null;
          const rawGender = profileData.gender || fallbackGender || null;

          return {
            id: profileData.id,
            username: resolvedUsername,
            displayName: profileData.display_name || fallbackDisplayName || null,
            avatarId: rawAvatar ? resolveAvatarId(rawAvatar) : null,
            gender: rawGender === "male" || rawGender === "female" ? rawGender : null,
            coins: typeof profileData.coins === "number" ? profileData.coins : null,
            lastUsernameChangedAt: profileData.last_username_change_at || null,
            createdAt: profileData.created_at,
            updatedAt: profileData.updated_at,
          };
        }
      } catch {
        // Fallback gracefully if profile table has not yet loaded
      }
      return null;
    },
    []
  );

  // Refresh Auth-layer metadata directly from Supabase's authoritative user
  // record. This exists because the very first session we render from right
  // after an OAuth redirect (Google/GitHub) is whatever was captured at the
  // moment of the code exchange — and on some mobile browsers that snapshot's
  // `user_metadata` can still be a step behind the fully-enriched record
  // (the provider's full_name/avatar_url fields land a beat after the
  // session is first issued). We already render instantly from that
  // snapshot for zero perceived latency, but it must never be treated as
  // final. A fresh call to supabase.auth.getUser() always returns the
  // CURRENT, complete user record from the server, so we use it to promote
  // any fields that only became available after the fact. This runs
  // automatically right after every sign-in/session-restore — it must NOT
  // depend on the user changing their avatar or any other manual action.
  const refreshAuthMetadataProfile = useCallback(async (userId: string) => {
    const client = getSupabaseClient();
    if (!client) return;
    try {
      const { data, error } = await client.auth.getUser();

      if (error) {
        if (
          error.status === 401 ||
          error.message?.toLowerCase().includes("invalid jwt") ||
          error.message?.toLowerCase().includes("expired")
        ) {
          await client.auth.signOut().catch(() => {});
          setAuthState(transitionToSignedOut());
          SupabaseSyncService.setCurrentUser(null);
        }
        return;
      }

      const freshUser = data?.user;
      if (!freshUser || freshUser.id !== userId) return;

      const freshResolved = resolveInstantProfile(freshUser);
      setAuthState((prev) => {
        if (prev.status !== "authenticated" || prev.user?.id !== userId || !prev.profile) return prev;
        const reconciled = reconcileProfileWithDatabase(prev.profile, freshResolved);
        return { ...prev, profile: reconciled };
      });
    } catch {
      // Network hiccup — the instant baseline profile remains in effect and
      // the DB reconciliation pass (fetchAuthoritativeProfile) still runs.
    }
  }, []);

  // Synchronize Supabase session -> Canonical Auth State Machine
  const syncSupabaseSessionToDomain = useCallback(
    async (supabaseSession: Session | null) => {
      if (!supabaseSession || !supabaseSession.user) {
        setAuthState(transitionToSignedOut());
        SupabaseSyncService.setCurrentUser(null);
        return;
      }

      try {
        const userId = supabaseSession.user.id;
        const identity = mapSupabaseUserToIdentity(supabaseSession.user);

        // Instant baseline profile via single authoritative resolver (0ms delay)
        const initialProfile = resolveInstantProfile(supabaseSession.user);

        // 1. INSTANTLY TRANSITION TO AUTHENTICATED (eliminates mobile/tablet delay)
        setAuthState(transitionToAuthenticated(identity, supabaseSession, initialProfile));
        SupabaseSyncService.setCurrentUser(
          supabaseSession.user.id,
          supabaseSession.user.email ?? null
        );

        // 2. Two independent, non-blocking authoritative reconciliation passes.
        //    Both run unconditionally on every session sync — sign-in, session
        //    restore, and token refresh alike — with zero dependency on any
        //    later user interaction (e.g. changing the avatar).

        // 2a. Auth-layer reconciliation: promotes any metadata fields
        //     (full_name, avatar_id, gender, etc.) that were still being
        //     enriched server-side at the moment this session was issued.
        refreshAuthMetadataProfile(userId).catch(() => {});

        // 2b. Database-layer reconciliation from public.profiles.
        fetchAuthoritativeProfile(userId)
          .then((dbProfile) => {
            if (!dbProfile) return;
            setAuthState((prev) => {
              if (prev.status !== "authenticated" || prev.user?.id !== userId || !prev.profile) return prev;
              const reconciled = reconcileProfileWithDatabase(prev.profile, dbProfile);

              // Auto-heal DB profile if username was in metadata/local cache but missing in table
              if (reconciled.username && !dbProfile.username) {
                fetch("/api/auth/username", {
                  method: "POST",
                  headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${supabaseSession.access_token}`,
                  },
                  body: JSON.stringify({ username: reconciled.username, force: true }),
                }).catch(() => {});
              }

              return {
                ...prev,
                profile: reconciled,
              };
            });
          })
          .catch(() => {});
      } catch (err) {
        console.warn("[Auth Domain] Error syncing session to domain model:", err);
        setAuthState(transitionToSignedOut());
      }
    },
    [fetchAuthoritativeProfile, refreshAuthMetadataProfile]
  );

  // Sync service status listener
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
        setAuthState(transitionToSignedOut());
        SupabaseSyncService.handleRemoteAccountDeletion().catch(() => {});
      }
    }
    window.addEventListener("storage", handleStorage);
    return () => window.removeEventListener("storage", handleStorage);
  }, []);

  // Primary lifecycle initialization from Supabase Auth
  useEffect(() => {
    const client = getSupabaseClient();
    if (!client) {
      setAuthState(transitionToSignedOut());
      return;
    }

    // Only drop into the loading state if we don't already have an instant,
    // optimistic session from the lazy initializer above — otherwise this
    // would flash the UI back to "loading" right after it painted as
    // authenticated, which is exactly the stutter we're trying to remove.
    setAuthState((prev) => (prev.status === "authenticated" ? prev : transitionToAuthenticating()));

    // 1. Authoritative initial session retrieval
    client.auth
      .getSession()
      .then(async ({ data: { session: initialSession }, error }) => {
        let activeSession = !error && initialSession?.user ? initialSession : null;

        // Fallback recovery across mobile redirects, tabs, and URL hash fragments
        if (!activeSession && typeof window !== "undefined") {
          try {
            const rawStored = localStorage.getItem("reec_oauth_session");
            if (rawStored) {
              const parsed = JSON.parse(rawStored);
              if (parsed?.access_token && parsed?.refresh_token) {
                const { data: recoveredData } = await client.auth.setSession({
                  access_token: parsed.access_token,
                  refresh_token: parsed.refresh_token,
                });
                if (recoveredData?.session?.user) {
                  activeSession = recoveredData.session;
                }
              }
            }
          } catch {}

          if (!activeSession && window.location?.hash) {
            try {
              const hashParams = new URLSearchParams(window.location.hash.substring(1));
              const at = hashParams.get("access_token");
              const rt = hashParams.get("refresh_token");
              if (at && rt) {
                const { data: hashData } = await client.auth.setSession({
                  access_token: at,
                  refresh_token: rt,
                });
                if (hashData?.session?.user) {
                  activeSession = hashData.session;
                  window.history.replaceState(null, "", window.location.pathname + window.location.search);
                }
              }
            } catch {}
          }
        }

        if (activeSession?.user) {
          // Instantly sync valid session into UI state (immediate responsiveness on mobile/tablet).
          // syncSupabaseSessionToDomain itself kicks off the fresh-Auth-metadata
          // reconciliation pass (refreshAuthMetadataProfile) and the DB reconciliation
          // pass, so a session with a stale/partial metadata snapshot self-heals here —
          // no separate discarded getUser() call is needed, and no further user action
          // (like changing the avatar) is required for this to happen.
          syncSupabaseSessionToDomain(activeSession);
        } else {
          setAuthState(transitionToSignedOut());
          SupabaseSyncService.setCurrentUser(null);
        }
      })
      .catch((err) => {
        console.warn("[Auth Domain] Session bootstrap error:", err);
        setAuthState(transitionToSignedOut());
      });

    // 2. Authoritative Auth State Change Subscriber
    const {
      data: { subscription },
    } = client.auth.onAuthStateChange(async (event, currentSession) => {
      if (event === "SIGNED_OUT") {
        setAuthState(transitionToSignedOut());
        SupabaseSyncService.setCurrentUser(null);
      } else if (currentSession?.user) {
        await syncSupabaseSessionToDomain(currentSession);
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
            await client.auth.signOut().catch(() => {});
            setAuthState(transitionToSignedOut());
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
  }, [syncSupabaseSessionToDomain]);

  // BroadcastChannel & postMessage sync across tabs/popups
  useEffect(() => {
    const handleAuthSession = async (sessionData: any) => {
      if (!sessionData) return;

      // 1. INSTANT 0ms OPTIMISTIC UI FLIP:
      // Close the auth modal instantly and update domain state so the user sees their authenticated profile immediately
      setIsAuthModalOpen(false);

      if (sessionData?.user) {
        syncSupabaseSessionToDomain(sessionData as Session);
      }

      const client = getSupabaseClient();
      if (!client) return;

      try {
        let activeSession: Session | null = null;
        if (sessionData?.access_token && sessionData?.refresh_token) {
          const { data: setData } = await client.auth.setSession({
            access_token: sessionData.access_token,
            refresh_token: sessionData.refresh_token,
          });
          if (setData?.session) {
            activeSession = setData.session;
          }
        }

        if (!activeSession) {
          const {
            data: { session: updatedSession },
          } = await client.auth.getSession();
          activeSession = updatedSession;
        }

        if (!activeSession && sessionData?.user) {
          activeSession = sessionData as Session;
        }

        if (activeSession?.user) {
          await syncSupabaseSessionToDomain(activeSession);
        }
      } catch (err) {
        console.warn("[Auth] Error hydrating session:", err);
      }
    };

    const handleMessage = async (event: MessageEvent) => {
      if (event.data?.type === "AUTH_SUCCESS" || event.data?.type === "OAUTH_AUTH_SUCCESS") {
        await handleAuthSession(event.data.session);
      }
    };

    window.addEventListener("message", handleMessage);

    let authChannel: BroadcastChannel | null = null;
    try {
      if (typeof window !== "undefined" && "BroadcastChannel" in window) {
        authChannel = new BroadcastChannel("reec_auth_sync");
        authChannel.onmessage = async (event) => {
          if (event.data?.type === "OAUTH_AUTH_SUCCESS" && event.data.session) {
            await handleAuthSession(event.data.session);
          }
        };
      }
    } catch (e) {
      console.warn("[OAuth] BroadcastChannel init warning:", e);
    }

    const handleStorage = async (e: StorageEvent) => {
      if (
        (e.key && e.key.startsWith("sb-") && e.key.endsWith("-auth-token") && e.newValue) ||
        (e.key === "reec_oauth_session" && e.newValue) ||
        (e.key === "sb-auth-token" && e.newValue)
      ) {
        try {
          const parsed = JSON.parse(e.newValue);
          await handleAuthSession(parsed);
        } catch {}
      }
    };
    window.addEventListener("storage", handleStorage);

    const handleImmediateCheck = async () => {
      const client = getSupabaseClient();
      if (!client) return;
      try {
        const {
          data: { session },
        } = await client.auth.getSession();
        if (session?.user) {
          await syncSupabaseSessionToDomain(session);
          setIsAuthModalOpen(false);
          return;
        }
        const raw = localStorage.getItem("reec_oauth_session");
        if (raw) {
          const parsed = JSON.parse(raw);
          await handleAuthSession(parsed);
        }
      } catch {}
    };

    window.addEventListener("focus", handleImmediateCheck);
    document.addEventListener("visibilitychange", handleImmediateCheck);

    const handleCustomAuth = (e: any) => {
      if (e.detail) handleAuthSession(e.detail);
    };
    window.addEventListener("reec_auth_success", handleCustomAuth);

    return () => {
      window.removeEventListener("message", handleMessage);
      window.removeEventListener("storage", handleStorage);
      window.removeEventListener("focus", handleImmediateCheck);
      document.removeEventListener("visibilitychange", handleImmediateCheck);
      window.removeEventListener("reec_auth_success", handleCustomAuth);
      if (authChannel) {
        try {
          authChannel.close();
        } catch {}
      }
    };
  }, [syncSupabaseSessionToDomain]);

  const openAuthModal = useCallback(() => {
    setIsAuthModalOpen(true);
  }, []);

  const closeAuthModal = useCallback(() => {
    setIsAuthModalOpen(false);
  }, []);

  /**
   * SIGN-IN CONTRACT:
   * Credentials -> Supabase Auth -> Authentication result -> REEC authenticated state
   * If email_not_confirmed, conceptual state remains EMAIL_UNVERIFIED.
   */
  const signInWithPassword = useCallback(
    async (
      emailOrUsername: string,
      password: string
    ): Promise<{ error: Error | null; unconfirmedEmail?: string }> => {
      const client = getSupabaseClient();
      if (!client) {
        return {
          error: new Error(
            "Supabase is not configured. Add NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY."
          ),
        };
      }

      try {
        const rawInput = emailOrUsername.trim();
        let targetEmail = rawInput;

        // If username was provided, resolve username -> email via database authority
        if (!targetEmail.includes("@")) {
          const cleanUser = normalizeUsername(targetEmail);
          const resolvedEmail = await findEmailByUsername(cleanUser);
          if (resolvedEmail) {
            targetEmail = resolvedEmail;
          } else {
            return {
              error: new Error(
                `No account found with username "@${cleanUser}". Please verify the username or sign in with your email address.`
              ),
            };
          }
        } else {
          targetEmail = targetEmail.toLowerCase().trim();
        }

        const { data, error } = await client.auth.signInWithPassword({
          email: targetEmail,
          password,
        });

        if (error) {
          const domainError = mapSupabaseAuthError(error, { email: targetEmail });
          if (domainError.code === "EMAIL_NOT_CONFIRMED") {
            return {
              error: new Error(domainError.message),
              unconfirmedEmail: targetEmail,
            };
          }
          return { error: new Error(domainError.message) };
        }

        if (data?.session) {
          await syncSupabaseSessionToDomain(data.session);
          setIsAuthModalOpen(false);
        }

        return { error: null };
      } catch (err: unknown) {
        const domainErr = mapSupabaseAuthError(err);
        return { error: new Error(domainErr.message) };
      }
    },
    [syncSupabaseSessionToDomain]
  );

  /**
   * SIGNUP CONTRACT:
   * RegisterAccount -> Supabase creates identity -> Supabase controls confirmation
   * -> REEC creates profile data -> EMAIL_VERIFICATION_REQUIRED.
   */
  const signUpWithPassword = useCallback(
    async (
      email: string,
      password: string,
      displayName?: string,
      username?: string,
      avatarId?: string
    ): Promise<{
      error: Error | null;
      needsEmailConfirmation?: boolean;
      emailOtp?: string | null;
      actionLink?: string | null;
    }> => {
      const cleanEmail = email.trim().toLowerCase();

      try {
        const res = await fetch("/api/auth/register", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            email: cleanEmail,
            password,
            displayName,
            username,
            avatarId,
          }),
        });

        const json = await res.json().catch(() => ({}));

        if (!res.ok || !json.success) {
          return {
            error: new Error(json.error || "Failed to create account. Please try again."),
            needsEmailConfirmation: false,
          };
        }

        // Automatic immediate sign-in without requiring email confirmation
        const client = getSupabaseClient();
        if (client) {
          const { data: signInData } = await client.auth.signInWithPassword({
            email: cleanEmail,
            password,
          });
          if (signInData?.session) {
            await syncSupabaseSessionToDomain(signInData.session);
            setIsAuthModalOpen(false);
            return {
              error: null,
              needsEmailConfirmation: false,
            };
          }
        }

        return {
          error: null,
          needsEmailConfirmation: false,
          actionLink: json.actionLink || null,
        };
      } catch (err: unknown) {
        return {
          error: err instanceof Error ? err : new Error("Failed to create account. Please try again."),
          needsEmailConfirmation: false,
        };
      }
    },
    [syncSupabaseSessionToDomain]
  );

  /**
   * VERIFICATION AUTHORITY:
   * Supabase Auth is the sole authority. Never convert failure into success.
   */
  const verifyOtpCode = useCallback(
    async (email: string, token: string): Promise<{ error: Error | null }> => {
      const client = getSupabaseClient();
      if (!client) {
        return { error: new Error("Authentication service is unavailable.") };
      }

      const cleanEmail = email.trim().toLowerCase();
      const cleanToken = token.trim();

      try {
        const { data, error } = await client.auth.verifyOtp({
          email: cleanEmail,
          token: cleanToken,
          type: "signup",
        });

        if (error) {
          const { data: retryData, error: retryError } = await client.auth.verifyOtp({
            email: cleanEmail,
            token: cleanToken,
            type: "email",
          });

          if (retryError) {
            return {
              error: new Error(
                retryError.message ||
                  error.message ||
                  "Invalid or expired verification code. Please check your code or request a new one."
              ),
            };
          }

          if (retryData?.session) {
            await syncSupabaseSessionToDomain(retryData.session);
            setIsAuthModalOpen(false);
          }
          return { error: null };
        }

        if (data?.session) {
          await syncSupabaseSessionToDomain(data.session);
          setIsAuthModalOpen(false);
        }

        return { error: null };
      } catch (err: unknown) {
        return { error: err instanceof Error ? err : new Error("Verification failed") };
      }
    },
    [syncSupabaseSessionToDomain]
  );

  const resendVerificationEmail = useCallback(
    async (
      email: string
    ): Promise<{ error: Error | null; emailOtp?: string | null; actionLink?: string | null }> => {
      const cleanEmail = email.trim().toLowerCase();

      try {
        const res = await fetch("/api/auth/resend-verification", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email: cleanEmail }),
        });

        const data = await res.json().catch(() => ({}));
        if (!res.ok || !data.success) {
          return {
            error: new Error(data.error || "Failed to send verification email. Please try again in 60s."),
          };
        }

        return { error: null };
      } catch (err: unknown) {
        return {
          error:
            err instanceof Error
              ? err
              : new Error("Failed to send verification email. Please try again."),
        };
      }
    },
    []
  );

  /**
   * Passwordless Email-Only Authentication:
   * Users can log in or create an account using only their email without verification.
   */
  const signInWithEmailOnly = useCallback(
    async (email: string): Promise<{ error: Error | null }> => {
      const cleanEmail = email.trim().toLowerCase();
      if (!cleanEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
        return { error: new Error("Please enter a valid email address.") };
      }

      try {
        const res = await fetch("/api/auth/email-login", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email: cleanEmail }),
        });

        const json = await res.json().catch(() => ({}));
        if (!res.ok || !json.success) {
          return { error: new Error(json.error || "Failed to authenticate with email.") };
        }

        const client = getSupabaseClient();
        if (!client) {
          return { error: new Error("Authentication service is unavailable.") };
        }

        if (json.tokenHash) {
          const { data, error } = await client.auth.verifyOtp({
            token_hash: json.tokenHash,
            type: "email",
          });

          if (error) {
            return { error: new Error(error.message) };
          }

          if (data?.session) {
            await syncSupabaseSessionToDomain(data.session);
            setIsAuthModalOpen(false);
            return { error: null };
          }
        }

        setIsAuthModalOpen(false);
        return { error: null };
      } catch (err: unknown) {
        return {
          error: err instanceof Error ? err : new Error("Failed to sign in with email."),
        };
      }
    },
    [syncSupabaseSessionToDomain]
  );

  /**
   * Social OAuth Sign In (Google, GitHub)
   * Formatted adaptively for all device types:
   *  - Iframe environments (e.g. AI Studio preview): uses popup flow with skipBrowserRedirect to avoid X-Frame-Options blocking
   *  - Mobile & Tablet devices (touch/compact screens): uses native full-window redirect for seamless mobile OS UX
   *  - Desktop standalone browsers: uses centered popup with instant fallback to redirect
   */
  const signInWithOAuth = useCallback(
    async (provider: "google" | "github"): Promise<{ error: Error | null }> => {
      const client = getSupabaseClient();
      if (!client) {
        return { error: new Error("Authentication service is unavailable.") };
      }

      try {
        const origin = typeof window !== "undefined" ? window.location.origin : "";
        const redirectTo = `${origin}/auth/callback`;
        const isInIframe = typeof window !== "undefined" && window.self !== window.top;
        const isMobileOrTablet =
          typeof window !== "undefined" &&
          (/Mobi|Android|iPhone|iPad|iPod|Tablet/i.test(navigator.userAgent) ||
            window.innerWidth <= 1024);

        // Explicitly prompt account chooser for Google and GitHub so users can choose or switch accounts
        const oauthQueryParams: Record<string, string> =
          provider === "google"
            ? {
                access_type: "offline",
                prompt: "select_account",
              }
            : {
                prompt: "select_account",
              };

        if (isInIframe) {
          const { data, error } = await client.auth.signInWithOAuth({
            provider,
            options: {
              redirectTo,
              skipBrowserRedirect: true,
              queryParams: oauthQueryParams,
            },
          });

          if (error) {
            return { error: new Error(error.message) };
          }

          if (data?.url) {
            const width = 600;
            const height = 750;
            const left = window.screenX + (window.outerWidth - width) / 2;
            const top = window.screenY + (window.outerHeight - height) / 2;
            const popup = window.open(
              data.url,
              "reec_oauth_popup",
              `width=${width},height=${height},left=${left},top=${top},menubar=no,toolbar=no,status=no,resizable=yes`
            );

            if (!popup || popup.closed || typeof popup.closed === "undefined") {
              window.open(data.url, "_blank");
            }
          }
          return { error: null };
        }

        if (isMobileOrTablet) {
          const { error } = await client.auth.signInWithOAuth({
            provider,
            options: {
              redirectTo,
              queryParams: oauthQueryParams,
            },
          });

          if (error) {
            return { error: new Error(error.message) };
          }
          return { error: null };
        }

        // Desktop standalone browser: centered popup with fallback
        const { data, error } = await client.auth.signInWithOAuth({
          provider,
          options: {
            redirectTo,
            skipBrowserRedirect: true,
            queryParams: oauthQueryParams,
          },
        });

        if (error) {
          return { error: new Error(error.message) };
        }

        if (data?.url) {
          const width = 600;
          const height = 750;
          const left = window.screenX + (window.outerWidth - width) / 2;
          const top = window.screenY + (window.outerHeight - height) / 2;
          const popup = window.open(
            data.url,
            "reec_oauth_popup",
            `width=${width},height=${height},left=${left},top=${top},menubar=no,toolbar=no,status=no,resizable=yes`
          );

          if (!popup || popup.closed || typeof popup.closed === "undefined") {
            window.location.href = data.url;
          }
        }

        return { error: null };
      } catch (err: unknown) {
        return {
          error: err instanceof Error ? err : new Error("Failed to initialize OAuth sign-in."),
        };
      }
    },
    []
  );

  /**
   * USERNAME MODEL:
   * Enforced in database. Cooldown and uniqueness verified authoritatively.
   */
  const updateUsername = useCallback(
    async (
      newUsername: string
    ): Promise<{ success: boolean; error?: string; remainingDays?: number; nextChangeDate?: string }> => {
      if (authState.status !== "authenticated" || !authState.user) {
        return { success: false, error: "You must be signed in to update your username" };
      }

      const syntax = validateUsernameSyntax(newUsername);
      if (!syntax.valid) {
        return { success: false, error: syntax.error };
      }

      const clean = syntax.cleanUsername!;
      const currentChangedAt = authState.profile?.lastUsernameChangedAt;
      const currentUsername = authState.profile?.username;

      // Cooldown only applies if user ALREADY has a username and is attempting to change it to a DIFFERENT one
      const isChangingToDifferent =
        currentUsername && currentUsername.trim().toLowerCase() !== clean.trim().toLowerCase();

      if (isChangingToDifferent) {
        const cooldown = checkUsernameChangeCooldown(currentChangedAt);
        if (!cooldown.canChange) {
          return {
            success: false,
            error: cooldown.reason,
            remainingDays: cooldown.remainingDays,
            nextChangeDate: cooldown.nextChangeDate,
          };
        }
      }

      // Authoritative database uniqueness check
      const avail = await isUsernameAvailable(clean, authState.user.id);
      if (!avail.available) {
        return {
          success: false,
          error: avail.error || `Username @${clean} is already taken by another user.`,
        };
      }

      try {
        const token = authState.session?.access_token;
        const apiRes = await fetch("/api/auth/username", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
          body: JSON.stringify({
            username: clean,
          }),
        });

        const apiData = await apiRes.json().catch(() => ({}));

        if (!apiRes.ok) {
          return {
            success: false,
            error: apiData.error || "Failed to update username",
            remainingDays: apiData.remainingDays,
            nextChangeDate: apiData.nextChangeDate,
          };
        }

        // Cache persistent username in localStorage
        if (typeof window !== "undefined") {
          try {
            localStorage.setItem(`reec_username_${authState.user.id}`, clean);
            localStorage.setItem("reec_persisted_username", clean);
          } catch {}
        }

        // Mirror to client auth session
        const client = getSupabaseClient();
        if (client) {
          await client.auth
            .updateUser({
              data: {
                username: clean,
                last_username_change_at: apiData.lastChangedAt || new Date().toISOString(),
              },
            })
            .catch(() => {});
        }

        // Re-sync profile from database
        const updatedProfile = await fetchAuthoritativeProfile(authState.user.id);
        const effectiveProfile: UserProfile = updatedProfile || {
          id: authState.user.id,
          username: clean,
          displayName: authState.profile?.displayName || authState.user.email?.split("@")[0] || null,
          avatarId: authState.profile?.avatarId || "human-male-alex",
          gender: authState.profile?.gender || "male",
          coins: authState.profile?.coins ?? null,
          lastUsernameChangedAt: apiData.lastChangedAt || new Date().toISOString(),
          createdAt: authState.profile?.createdAt,
          updatedAt: new Date().toISOString(),
        };

        effectiveProfile.username = clean;
        effectiveProfile.lastUsernameChangedAt =
          apiData.lastChangedAt || effectiveProfile.lastUsernameChangedAt || new Date().toISOString();

        setAuthState(
          transitionToAuthenticated(
            authState.user,
            authState.session,
            effectiveProfile
          )
        );

        return { success: true };
      } catch (err: unknown) {
        return {
          success: false,
          error: err instanceof Error ? err.message : "Failed to update username",
        };
      }
    },
    [authState, fetchAuthoritativeProfile]
  );

  /**
   * USER PROFILE CUSTOMIZATION:
   * Update display name, gender, human face avatar, coins.
   */
  const updateProfile = useCallback(
    async (updates: {
      displayName?: string;
      gender?: "male" | "female";
      avatarId?: string;
      coins?: number;
    }): Promise<{ success: boolean; error?: string }> => {
      if (authState.status !== "authenticated" || !authState.user) {
        return { success: false, error: "You must be signed in to update your profile" };
      }

      try {
        const token = authState.session?.access_token;
        const res = await fetch("/api/auth/profile", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
          body: JSON.stringify(updates),
        });

        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
          return { success: false, error: data.error || "Failed to update profile" };
        }

        // Mirror to client-side auth user session
        const client = getSupabaseClient();
        if (client) {
          await client.auth
            .updateUser({
              data: {
                ...(updates.displayName ? { display_name: updates.displayName } : {}),
                ...(updates.gender ? { gender: updates.gender } : {}),
                ...(updates.avatarId ? { avatar_id: updates.avatarId } : {}),
                ...(typeof updates.coins === "number" ? { coins: updates.coins } : {}),
              },
            })
            .catch(() => {});
        }

        // Local storage synchronization (both per-user and global keys)
        if (typeof window !== "undefined") {
          try {
            setPerUserProfileCache(authState.user.id, {
              displayName: updates.displayName,
              gender: updates.gender,
              avatarId: updates.avatarId,
            });

            if (updates.gender) {
              localStorage.setItem("reec_selected_gender", updates.gender);
              window.dispatchEvent(new CustomEvent("reec_gender_changed", { detail: updates.gender }));
            }
            if (updates.avatarId) {
              localStorage.setItem("reec_selected_avatar", updates.avatarId);
              window.dispatchEvent(new CustomEvent("reec_avatar_changed", { detail: updates.avatarId }));
            }
            if (typeof updates.coins === "number") {
              localStorage.setItem(`reec_user_coins_${authState.user.id}`, String(updates.coins));
              window.dispatchEvent(
                new CustomEvent("reec_coins_updated", {
                  detail: { userId: authState.user.id, coins: updates.coins },
                })
              );
            }
          } catch {}
        }

        // Immediate reactive update to canonical profile state
        const newProfile: UserProfile = {
          ...(authState.profile || {
            id: authState.user.id,
            username: null,
            lastUsernameChangedAt: null,
          }),
          displayName: updates.displayName !== undefined ? updates.displayName : authState.profile?.displayName || null,
          gender: updates.gender !== undefined ? updates.gender : authState.profile?.gender || "male",
          avatarId: updates.avatarId !== undefined ? updates.avatarId : authState.profile?.avatarId || "human-male-alex",
          coins: typeof updates.coins === "number" ? updates.coins : authState.profile?.coins ?? null,
          updatedAt: new Date().toISOString(),
        };

        setAuthState(transitionToAuthenticated(authState.user, authState.session, newProfile));
        return { success: true };
      } catch (err: unknown) {
        return {
          success: false,
          error: err instanceof Error ? err.message : "Failed to update profile",
        };
      }
    },
    [authState]
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
    setAuthState(transitionToSignedOut());
    SupabaseSyncService.setCurrentUser(null);
    SupabaseSyncService.resetAllLocalStores();
  }, []);

  const triggerSync = useCallback(async (): Promise<boolean> => {
    if (authState.status !== "authenticated" || !authState.user) return false;
    return await SupabaseSyncService.migrateAndHydrateUser(authState.user.id);
  }, [authState]);

  const resetUserData = useCallback(async (): Promise<{ success: boolean; error?: string }> => {
    const userId = authState.status === "authenticated" ? authState.user.id : undefined;
    return await SupabaseSyncService.resetCurrentUserData(userId);
  }, [authState]);

  const deleteAccount = useCallback(async (): Promise<{ success: boolean; error?: string }> => {
    const userId = authState.status === "authenticated" ? authState.user.id : undefined;
    const res = await SupabaseSyncService.deleteCurrentAccount(userId);
    if (res.success) {
      setAuthState(transitionToSignedOut());
    }
    return res;
  }, [authState]);

  // Derived state machine projections for UI consumption
  const authStatus = useMemo(() => getDiscreteAuthStatus(authState), [authState]);
  const isEmailVerified = useMemo(() => checkEmailVerified(authState), [authState]);
  const isEmailUnverified = useMemo(() => checkEmailUnverified(authState), [authState]);
  const identity = useMemo(() => (authState.status === "authenticated" ? authState.user : null), [authState]);
  const profile = useMemo(() => (authState.status === "authenticated" ? authState.profile : null), [authState]);
  const user = useMemo(() => (authState.status === "authenticated" ? (authState.session?.user ?? null) : null), [authState]);
  const session = useMemo(() => (authState.status === "authenticated" ? authState.session : null), [authState]);
  const username = useMemo(() => (authState.status === "authenticated" ? authState.profile?.username ?? null : null), [authState]);
  const lastUsernameChangedAt = useMemo(
    () => (authState.status === "authenticated" ? authState.profile?.lastUsernameChangedAt ?? null : null),
    [authState]
  );
  const isLoading = useMemo(() => authState.status === "loading" || authState.status === "unknown", [authState]);

  const value = useMemo(
    () => ({
      authState,
      authStatus,
      identity,
      profile,
      isEmailVerified,
      isEmailUnverified,
      user,
      session,
      username,
      lastUsernameChangedAt,
      isLoading,
      isConfigured: configured,
      syncStatus,
      syncError,
      isAuthModalOpen,
      openAuthModal,
      closeAuthModal,
      signInWithPassword,
      signUpWithPassword,
      signInWithEmailOnly,
      signInWithOAuth,
      verifyOtpCode,
      resendVerificationEmail,
      updateUsername,
      updateProfile,
      signOut,
      triggerSync,
      resetUserData,
      deleteAccount,
    }),
    [
      authState,
      authStatus,
      identity,
      profile,
      isEmailVerified,
      isEmailUnverified,
      user,
      session,
      username,
      lastUsernameChangedAt,
      isLoading,
      configured,
      syncStatus,
      syncError,
      isAuthModalOpen,
      openAuthModal,
      closeAuthModal,
      signInWithPassword,
      signUpWithPassword,
      signInWithEmailOnly,
      signInWithOAuth,
      verifyOtpCode,
      resendVerificationEmail,
      updateUsername,
      updateProfile,
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
