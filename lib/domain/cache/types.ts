/**
 * lib/domain/cache/types.ts
 *
 * Implements Master Engineering Specification Section 26:
 * CACHE MODEL
 *
 * Caching is an implementation optimization.
 * A cache is NEVER a second authority.
 *
 * Authoritative source
 *        ↓
 *      cache
 *        ↓
 *   application
 *
 * Invariant: The cache must have explicit invalidation semantics.
 */

export interface CacheEntry<T> {
  readonly key: string;
  readonly value: T;
  readonly cachedAt: number;
  readonly ttlMs: number;
  readonly version?: number;
}

export interface CacheInvalidationEvent {
  readonly scope: "exact" | "prefix" | "all";
  readonly target: string;
  readonly timestamp: number;
}

export interface CachePolicy {
  readonly ttlMs: number;
  readonly maxEntries?: number;
  readonly staleWhileRevalidate?: boolean;
}

export interface CacheStore<T> {
  get(key: string): T | null;
  set(key: string, value: T, policy?: Partial<CachePolicy>): void;
  invalidate(key: string): void;
  invalidatePrefix(prefix: string): void;
  invalidateAll(): void;
}

export function createMemoryCache<T>(defaultPolicy: CachePolicy = { ttlMs: 60_000 }): CacheStore<T> {
  const store = new Map<string, CacheEntry<T>>();

  return {
    get(key: string): T | null {
      const entry = store.get(key);
      if (!entry) return null;
      const now = Date.now();
      if (now - entry.cachedAt > entry.ttlMs) {
        store.delete(key);
        return null;
      }
      return entry.value;
    },

    set(key: string, value: T, policy?: Partial<CachePolicy>): void {
      const ttlMs = policy?.ttlMs ?? defaultPolicy.ttlMs;
      store.set(key, {
        key,
        value,
        cachedAt: Date.now(),
        ttlMs,
      });
    },

    invalidate(key: string): void {
      store.delete(key);
    },

    invalidatePrefix(prefix: string): void {
      for (const key of store.keys()) {
        if (key.startsWith(prefix)) {
          store.delete(key);
        }
      }
    },

    invalidateAll(): void {
      store.clear();
    },
  };
}
