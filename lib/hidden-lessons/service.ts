import { useHiddenLessonsStore } from "./store";
import type {
  ExecutionEvent,
  HiddenLessonManifestItem,
} from "./types";

export function normalizeIdentifier(id?: string | null): string {
  if (!id) return "";
  return id
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]/g, "")
    .replace(/0([0-9])/g, "$1"); // Normalize leading zeroes: "03" -> "3", "01" -> "1"
}

export function matchIdentifiers(a?: string | null, b?: string | null): boolean {
  if (!a || !b) return false;
  const normA = normalizeIdentifier(a);
  const normB = normalizeIdentifier(b);
  if (!normA || !normB) return false;
  return normA === normB;
}

class HiddenLessonTriggerServiceClass {
  private registry: Map<string, HiddenLessonManifestItem> = new Map();
  private initialized = false;
  private syncPromise: Promise<void> | null = null;
  private pendingTimers: NodeJS.Timeout[] = [];

  public register(item: HiddenLessonManifestItem) {
    this.registry.set(item.hiddenLessonId, item);
  }

  public clearRegistry() {
    this.registry.clear();
    this.initialized = false;
    this.syncPromise = null;
  }

  public cancelPendingTimers() {
    for (const timer of this.pendingTimers) {
      clearTimeout(timer);
    }
    this.pendingTimers = [];
  }

  public isInitialized(): boolean {
    return this.initialized;
  }

  public async ensureInitialized(): Promise<void> {
    if (this.initialized) {
      return;
    }
    if (this.syncPromise) {
      return this.syncPromise;
    }
    return this.syncWithServer();
  }

  public async syncWithServer(): Promise<void> {
    if (this.syncPromise) {
      return this.syncPromise;
    }

    this.syncPromise = (async () => {
      try {
        if (typeof fetch === "function") {
          const res = await fetch("/api/hidden-lessons/triggers");
          if (res && res.ok) {
            const data = await res.json();
            if (Array.isArray(data.triggers)) {
              for (const item of data.triggers) {
                this.register(item);
              }
            }
          }
        }
      } catch (e) {
        console.warn("[HiddenLessonService] Failed to sync triggers from server", e);
      } finally {
        this.initialized = true;
        this.syncPromise = null;
      }
    })();

    return this.syncPromise;
  }

  public getAllTriggers(): HiddenLessonManifestItem[] {
    return Array.from(this.registry.values());
  }

  /**
   * Evaluates whether a given manifest trigger matches an execution event.
   * ALL declared trigger identity fields must match if specified.
   */
  public isTriggerMatch(
    manifest: HiddenLessonManifestItem,
    event: ExecutionEvent,
    logDiagnostics = process.env.NODE_ENV !== "production"
  ): boolean {
    const { trigger } = manifest;

    if (trigger.type !== "code_execution") {
      if (logDiagnostics) {
        console.log(
          `[HiddenLessonTrigger] REJECT\nreason=trigger.type is not code_execution\nevent=${event.operation}\nexpected=code_execution`
        );
      }
      return false;
    }

    // At least one target identity must be configured
    if (!trigger.lessonId && !trigger.challengeId && !trigger.blockId) {
      if (logDiagnostics) {
        console.log(
          `[HiddenLessonTrigger] REJECT\nreason=no target identity configured on trigger manifest (${manifest.hiddenLessonId})`
        );
      }
      return false;
    }

    // 1. Strict Lesson ID check (if specified on trigger)
    if (trigger.lessonId) {
      if (!event.lessonId || !matchIdentifiers(event.lessonId, trigger.lessonId)) {
        if (logDiagnostics) {
          console.log(
            `[HiddenLessonTrigger] REJECT\nreason=lessonId mismatch\nevent=${event.lessonId ?? "<undefined>"}\nexpected=${trigger.lessonId}`
          );
        }
        return false;
      }
    }

    // 2. Strict Challenge ID check (if specified on trigger)
    if (trigger.challengeId) {
      if (!event.challengeId || !matchIdentifiers(event.challengeId, trigger.challengeId)) {
        if (logDiagnostics) {
          console.log(
            `[HiddenLessonTrigger] REJECT\nreason=challengeId mismatch\nevent=${event.challengeId ?? "<undefined>"}\nexpected=${trigger.challengeId}`
          );
        }
        return false;
      }
    }

    // 3. Strict Block ID check (if specified on trigger)
    if (trigger.blockId) {
      if (!event.blockId || !matchIdentifiers(event.blockId, trigger.blockId)) {
        if (logDiagnostics) {
          console.log(
            `[HiddenLessonTrigger] REJECT\nreason=blockId mismatch\nevent=${event.blockId ?? "<undefined>"}\nexpected=${trigger.blockId}`
          );
        }
        return false;
      }
    }

    // 4. Validate execution requirement
    const requirement = trigger.executionRequirement ?? "execution_attempt";
    if (requirement === "successful_run") {
      if (event.status !== "success" || event.hasCompilerError) {
        if (logDiagnostics) {
          console.log(
            `[HiddenLessonTrigger] REJECT\nreason=successful_run requirement failed\neventStatus=${event.status}\nhasCompilerError=${event.hasCompilerError}`
          );
        }
        return false;
      }
    } else {
      // "execution_attempt": genuine execution submission (success or error)
      if (event.status !== "success" && event.status !== "error") {
        if (logDiagnostics) {
          console.log(
            `[HiddenLessonTrigger] REJECT\nreason=execution_attempt requirement failed (status must be success or error)\neventStatus=${event.status}`
          );
        }
        return false;
      }
    }

    if (logDiagnostics) {
      console.log(
        `[HiddenLessonTrigger] MATCH SUCCESS\nhiddenLessonId=${manifest.hiddenLessonId}\nlessonId=${event.lessonId}\nchallengeId=${event.challengeId}\nblockId=${event.blockId}`
      );
    }
    return true;
  }

  /**
   * Returns all manifests in registry that match the execution event.
   */
  public findMatchingTriggers(event: ExecutionEvent): HiddenLessonManifestItem[] {
    if (event.operation !== "run") {
      if (process.env.NODE_ENV !== "production") {
        console.log(
          `[HiddenLessonTrigger] REJECT\nreason=operation is not run\nevent=${event.operation}\nexpected=run`
        );
      }
      return [];
    }
    const triggers = this.getAllTriggers();
    return triggers.filter((m) => this.isTriggerMatch(m, event));
  }

  /**
   * Schedule trigger unlock with a specified delay (default 3 seconds / 3000ms).
   * Awaits registry initialization before evaluating triggers.
   * After the delay, unlocks the lesson and displays the Grand Unlock Modal.
   */
  public async scheduleExecutionEvent(
    event: ExecutionEvent,
    delayMs = 3000
  ): Promise<NodeJS.Timeout | null> {
    if (event.operation !== "run") {
      return null;
    }

    await this.ensureInitialized();

    const matches = this.findMatchingTriggers(event);
    if (matches.length === 0) {
      return null;
    }

    const timer = setTimeout(() => {
      for (const manifest of matches) {
        const store = useHiddenLessonsStore.getState();
        store.unlockLesson({
          lessonId: manifest.hiddenLessonId,
          slug: manifest.slug,
          title: manifest.title,
          subtitle: manifest.subtitle,
          description: manifest.description,
          badge: manifest.badge,
          tags: manifest.tags,
          sourceLessonId: manifest.sourceLessonId || event.lessonId || null,
          triggerSource: event.challengeId || event.lessonId || event.blockId,
          triggerExecutionId: event.attemptId,
          triggerType: manifest.trigger.type || "code_execution",
          triggerDescription: event.challengeId
            ? `Challenge: ${event.challengeId}`
            : event.blockId
            ? `Code block: ${event.blockId}`
            : `Lesson: ${event.lessonId}`,
        });
      }
    }, delayMs);

    this.pendingTimers.push(timer);
    return timer;
  }

  /**
   * Processes a structured execution event emitted by the real Code Workspace execution pipeline.
   *
   * Gate Rules:
   * 1. Operation MUST be "run" (NOT "check", "build", "test", "format").
   * 2. Trigger type must be "code_execution".
   * 3. ALL declared trigger identity fields must match.
   * 4. Execution requirement (attempt vs successful_run) must be satisfied.
   *
   * If options.delayMs > 0, execution evaluation is delayed by that amount (e.g. 3000ms).
   */
  public handleExecutionEvent(
    event: ExecutionEvent,
    options?: { delayMs?: number }
  ): boolean {
    if (event.operation !== "run") {
      return false;
    }

    if (!this.initialized && typeof window !== "undefined") {
      this.syncWithServer().catch(() => {});
    }

    if (options?.delayMs && options.delayMs > 0) {
      this.scheduleExecutionEvent(event, options.delayMs).catch(() => {});
      // Return true if matches found synchronously in existing registry
      const currentMatches = this.findMatchingTriggers(event);
      return currentMatches.length > 0;
    }

    const matches = this.findMatchingTriggers(event);
    let unlockedAny = false;

    for (const manifest of matches) {
      const store = useHiddenLessonsStore.getState();
      const didUnlock = store.unlockLesson({
        lessonId: manifest.hiddenLessonId,
        slug: manifest.slug,
        title: manifest.title,
        subtitle: manifest.subtitle,
        description: manifest.description,
        badge: manifest.badge,
        tags: manifest.tags,
        sourceLessonId: manifest.sourceLessonId || event.lessonId || null,
        triggerSource: event.challengeId || event.lessonId || event.blockId,
        triggerExecutionId: event.attemptId,
        triggerType: manifest.trigger.type || "code_execution",
        triggerDescription: event.challengeId
          ? `Challenge: ${event.challengeId}`
          : event.blockId
          ? `Code block: ${event.blockId}`
          : `Lesson: ${event.lessonId}`,
      });

      if (didUnlock) {
        unlockedAny = true;
      }
    }

    return unlockedAny;
  }
}

export const HiddenLessonTriggerService = new HiddenLessonTriggerServiceClass();
