"use client";

/**
 * lib/files/store.ts
 *
 * The "hello_reec" directory — a persisted (localStorage-backed) personal
 * file store where a student saves the actual Rust deliverables lessons
 * ask for (per the original curriculum's Lab 0.1: "a committed
 * hello_reec Git repository..."). Rust-only, matching the rest of REEC —
 * there is no language field because there is only one language.
 */

import { create } from "zustand";
import { persist } from "zustand/middleware";
import { SupabaseSyncService } from "@/lib/supabase/sync-service";

export interface SavedFile {
  id: string;
  name: string;
  content: string;
  createdAt: number;
  updatedAt: number;
}

interface FilesState {
  files: Record<string, SavedFile>;
  createFile: (name: string, content?: string) => string;
  updateContent: (id: string, content: string) => void;
  renameFile: (id: string, name: string) => void;
  deleteFile: (id: string) => void;
}

function makeId() {
  return `f_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

export const useFilesStore = create<FilesState>()(
  persist(
    (set) => ({
      files: {},

      createFile: (name, content = "") => {
        const id = makeId();
        const now = Date.now();
        const newFile: SavedFile = { id, name, content, createdAt: now, updatedAt: now };
        set((s) => ({
          files: { ...s.files, [id]: newFile },
        }));
        SupabaseSyncService.queueWorkspaceFileSync(newFile);
        return id;
      },

      updateContent: (id, content) =>
        set((s) => {
          const file = s.files[id];
          if (!file) return s;
          const updated: SavedFile = { ...file, content, updatedAt: Date.now() };
          SupabaseSyncService.queueWorkspaceFileSync(updated);
          return { files: { ...s.files, [id]: updated } };
        }),

      renameFile: (id, name) =>
        set((s) => {
          const file = s.files[id];
          if (!file) return s;
          const updated: SavedFile = { ...file, name, updatedAt: Date.now() };
          SupabaseSyncService.queueWorkspaceFileSync(updated);
          return { files: { ...s.files, [id]: updated } };
        }),

      deleteFile: (id) => {
        set((s) => {
          const next = { ...s.files };
          delete next[id];
          return { files: next };
        });
        SupabaseSyncService.deleteWorkspaceFile(id);
      },
    }),
    { name: "reec-academy-hello-reec" }
  )
);
