/**
 * lib/domain/projects/types.ts
 *
 * Implements Master Engineering Specification Section 20:
 * PROJECTS
 *
 * Projects must be treated as learning-domain entities.
 * Separate:
 * - project identity
 * - project progress
 * - project completion
 * - project metadata
 *
 * Invariant: Do not infer project completion from UI state.
 */

export interface ProjectMilestone {
  readonly id: string;
  readonly title: string;
  readonly description: string;
  readonly isCompleted: boolean;
  readonly requiredForCompletion: boolean;
  readonly completedAt?: string | null;
}

export interface ProjectIdentity {
  readonly id: string;
  readonly slug: string;
  readonly phase: number;
}

export interface ProjectMetadata {
  readonly title: string;
  readonly tagline: string;
  readonly description: string;
  readonly techStack: readonly string[];
  readonly difficulty: "Beginner" | "Intermediate" | "Advanced" | "Expert";
  readonly estimatedHours: number;
  readonly starterCode?: string;
  readonly architectureHighlights?: readonly string[];
}

export interface ProjectProgress {
  readonly milestones: readonly ProjectMilestone[];
  readonly completedMilestoneIds: ReadonlySet<string>;
  readonly progressPercent: number;
  readonly startedAt: string | null;
  readonly lastWorkedAt: string | null;
}

export interface ProjectCompletion {
  readonly isCompleted: boolean;
  readonly completedAt: string | null;
  readonly verifiedAllRequiredMilestones: boolean;
}

export interface LearningProject {
  readonly identity: ProjectIdentity;
  readonly metadata: ProjectMetadata;
  readonly progress: ProjectProgress;
  readonly completion: ProjectCompletion;
}

/**
 * Authoritative evaluation of project completion from learning domain rules.
 * Never infer project completion from ephemeral UI state.
 */
export function evaluateProjectCompletion(
  projectOrMilestones: readonly ProjectMilestone[] | { readonly requiredDeliverables?: readonly string[]; readonly milestones?: readonly ProjectMilestone[] },
  completedDeliverablesOrIds?: readonly string[]
): any {
  if (Array.isArray(completedDeliverablesOrIds) && projectOrMilestones && typeof projectOrMilestones === "object" && !Array.isArray(projectOrMilestones)) {
    const required: readonly string[] = (projectOrMilestones as any).requiredDeliverables || [];
    if (required.length === 0) return true;
    return required.every((req) => completedDeliverablesOrIds.includes(req));
  }

  const milestones: readonly ProjectMilestone[] = Array.isArray(projectOrMilestones)
    ? projectOrMilestones
    : ((projectOrMilestones as any)?.milestones || []);

  if (!milestones || milestones.length === 0) {
    return {
      isCompleted: false,
      completedAt: null,
      verifiedAllRequiredMilestones: false,
    };
  }

  const required = milestones.filter((m) => m.requiredForCompletion);
  const allRequiredMet =
    required.length > 0
      ? required.every((m) => m.isCompleted)
      : milestones.every((m) => m.isCompleted);

  const isCompleted = allRequiredMet;
  const completedAt = isCompleted
    ? milestones.reduce<string | null>((latest, m) => {
        if (!m.completedAt) return latest;
        if (!latest) return m.completedAt;
        return new Date(m.completedAt) > new Date(latest) ? m.completedAt : latest;
      }, null) || new Date().toISOString()
    : null;

  return {
    isCompleted,
    completedAt,
    verifiedAllRequiredMilestones: allRequiredMet,
  };
}
