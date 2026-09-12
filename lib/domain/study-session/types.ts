/**
 * lib/domain/study-session/types.ts
 *
 * Implements Master Engineering Specification Section 22:
 * STUDY SESSION
 *
 * Define study sessions independently from authentication.
 *
 * StudySession
 * ├── start
 * ├── activity
 * ├── duration
 * └── completion/end
 *
 * Authentication identifies the owner.
 * Learning state records the resulting activity.
 *
 * Invariant: Do not make study-session state responsible for authentication.
 */

export interface StudyActivity {
  readonly id: string;
  readonly type: "reading" | "exercise" | "terminal" | "quiz";
  readonly targetId: string; // e.g. lessonId or challengeId
  readonly timestamp: string;
  readonly metadata?: Record<string, unknown>;
}

export type StudySessionStatus = "active" | "completed" | "abandoned";

export interface StudySession {
  readonly id: string;
  /** Owner identity passed from authentication; session does not manage auth */
  readonly ownerUserId: string;
  readonly startedAt: string;
  readonly endedAt: string | null;
  readonly durationSeconds: number;
  readonly activities: readonly StudyActivity[];
  readonly status: StudySessionStatus;
}

export function startStudySession(params: {
  id?: string;
  ownerUserId: string;
  startedAt?: string;
}): StudySession {
  if (!params.ownerUserId) {
    throw new Error("Study session requires an identified owner user.");
  }

  return {
    id: params.id || `session_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    ownerUserId: params.ownerUserId,
    startedAt: params.startedAt || new Date().toISOString(),
    endedAt: null,
    durationSeconds: 0,
    activities: [],
    status: "active",
  };
}

export function recordStudyActivity(
  session: StudySession,
  activity: Omit<StudyActivity, "id" | "timestamp"> & { id?: string; timestamp?: string }
): StudySession {
  if (session.status !== "active") {
    throw new Error(`Cannot record activity on a ${session.status} study session.`);
  }

  const newActivity: StudyActivity = {
    id: activity.id || `act_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
    type: activity.type,
    targetId: activity.targetId,
    timestamp: activity.timestamp || new Date().toISOString(),
    metadata: activity.metadata,
  };

  const now = new Date(newActivity.timestamp).getTime();
  const start = new Date(session.startedAt).getTime();
  const durationSeconds = Math.max(session.durationSeconds, Math.floor((now - start) / 1000));

  return {
    ...session,
    durationSeconds,
    activities: [...session.activities, newActivity],
  };
}

export function completeStudySession(
  session: StudySession,
  endedAt = new Date().toISOString()
): StudySession {
  if (session.status !== "active") {
    return session;
  }

  const start = new Date(session.startedAt).getTime();
  const end = new Date(endedAt).getTime();
  const durationSeconds = Math.max(0, Math.floor((end - start) / 1000));

  return {
    ...session,
    endedAt,
    durationSeconds,
    status: "completed",
  };
}
