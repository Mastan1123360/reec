/**
 * lib/domain/sync/types.ts
 *
 * Implements Master Engineering Specification Section 27:
 * SYNCHRONIZATION MODEL
 *
 * Unidirectional synchronization flow:
 *
 * source of truth (Database / Supabase)
 *         ↓
 *       read
 *         ↓
 *  application state
 *         ↓
 *     mutation
 *         ↓
 *    persistence (authoritative database write)
 *         ↓
 *  cache invalidation
 *         ↓
 *     UI update
 *
 * Invariant: Do not allow arbitrary components to independently synchronize the same data.
 */

export type SyncPhase =
  | "IDLE"
  | "READING"
  | "MUTATING"
  | "PERSISTING"
  | "INVALIDATING_CACHE"
  | "UPDATING_UI"
  | "ERROR";

export interface SyncOperation<TPayload, TResult> {
  readonly id: string;
  readonly entity: "progress" | "bookmark" | "project" | "study_session" | "profile" | "workspace";
  readonly phase: SyncPhase;
  readonly payload: TPayload;
  readonly timestamp: number;
  readonly error?: string | null;
}

export interface SyncExecutor<TPayload, TResult> {
  execute(
    entity: SyncOperation<TPayload, TResult>["entity"],
    payload: TPayload,
    persist: (data: TPayload) => Promise<TResult>,
    invalidateCache: () => void,
    onUiUpdate: (result: TResult) => void
  ): Promise<TResult>;
}

export async function executeNormalizedSync<TPayload, TResult>(params: {
  entity: SyncOperation<TPayload, TResult>["entity"];
  payload: TPayload;
  persist: (data: TPayload) => Promise<TResult>;
  invalidateCache: () => void;
  onUiUpdate: (result: TResult) => void;
}): Promise<TResult> {
  const { payload, persist, invalidateCache, onUiUpdate } = params;

  // 1. Persistence to Authoritative Source
  const persistedResult = await persist(payload);

  // 2. Authoritative Cache Invalidation
  invalidateCache();

  // 3. UI Update notification
  onUiUpdate(persistedResult);

  return persistedResult;
}
