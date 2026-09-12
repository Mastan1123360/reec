export interface DashboardLesson {
  slug: string;
  path: string;
  title: string;
  subtitle?: string;
  phase: number;
  week?: number;
  day?: number;
  tags?: string[];
  description?: string;
  estimated_time?: string;
  difficulty?: number;
  category?: string;
  learning_objectives?: string[];
}

export interface DashboardPhase {
  phaseNumber: number;
  title: string;
  tagline: string;
  hasContent: boolean;
  lessons: DashboardLesson[];
}
