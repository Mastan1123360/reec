import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { EngineeringProject } from "@/lib/content/projects-data";
import { SupabaseSyncService } from "@/lib/supabase/sync-service";

interface ProjectStore {
  projects: EngineeringProject[];
  addProject: (project: Omit<EngineeringProject, "id">) => string;
  updateProject: (id: string, updates: Partial<EngineeringProject>) => void;
  deleteProject: (id: string) => void;
  toggleMilestone: (projectId: string, milestoneIndex: number) => void;
}

export const useProjectStore = create<ProjectStore>()(
  persist(
    (set, get) => ({
      projects: [],
      addProject: (data) => {
        const id = `proj-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
        const newProject: EngineeringProject = {
          ...data,
          id,
          createdAt: new Date().toISOString(),
        };
        set((state) => ({
          projects: [newProject, ...state.projects],
        }));
        SupabaseSyncService.syncProject(newProject);
        return id;
      },
      updateProject: (id, updates) => {
        set((state) => {
          const next = state.projects.map((p) => (p.id === id ? { ...p, ...updates } : p));
          const updated = next.find((p) => p.id === id);
          if (updated) SupabaseSyncService.syncProject(updated);
          return { projects: next };
        });
      },
      deleteProject: (id) => {
        set((state) => ({
          projects: state.projects.filter((p) => p.id !== id),
        }));
        SupabaseSyncService.deleteProject(id);
      },
      toggleMilestone: (projectId, milestoneIndex) => {
        set((state) => {
          let updatedProj: EngineeringProject | undefined;
          const next = state.projects.map((p) => {
            if (p.id !== projectId) return p;
            const milestones = [...p.milestones];
            if (milestones[milestoneIndex]) {
              milestones[milestoneIndex] = {
                ...milestones[milestoneIndex],
                completed: !milestones[milestoneIndex].completed,
              };
            }
            updatedProj = { ...p, milestones };
            return updatedProj;
          });
          if (updatedProj) SupabaseSyncService.syncProject(updatedProj);
          return { projects: next };
        });
      },
    }),
    {
      name: "reec_user_projects",
    }
  )
);
