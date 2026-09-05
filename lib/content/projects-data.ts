export interface EngineeringProject {
  id: string;
  phase: number;
  title: string;
  tagline: string;
  description: string;
  difficulty: "Foundation" | "Intermediate" | "Advanced" | "Production Grade";
  estimatedHours: number;
  techStack: string[];
  milestones: {
    title: string;
    description: string;
    completed?: boolean;
  }[];
  starterCode: string;
  architectureHighlights: string[];
  createdAt?: string;
}

// Projects are empty by default on fresh installation and created by users
export const ENGINEERING_PROJECTS: EngineeringProject[] = [];
