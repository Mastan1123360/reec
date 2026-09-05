// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from "vitest";
import { SupabaseSyncService } from "../sync-service";
import * as clientModule from "../client";
import { useProgressStore } from "@/lib/progress/store";
import { useHiddenLessonsStore } from "@/lib/hidden-lessons/store";
import { useProjectStore } from "@/lib/projects/store";
import { useFilesStore } from "@/lib/files/store";
import { POST } from "@/app/api/account/delete/route";
import { NextRequest } from "next/server";

describe("REEC Permanent Account & Data Deletion", () => {
  beforeEach(() => {
    localStorage.clear();
    SupabaseSyncService.resetStateForTesting();
    vi.restoreAllMocks();

    useProgressStore.setState({
      completedLessons: new Set(),
      completedBlocks: new Set(),
      bookmarks: new Set(),
      notes: {},
      checklist: {},
      lastVisited: null,
      activityLog: [],
      studyTimeMinutes: 0,
      dailyMinutes: {},
      activeDates: [],
    });

    useHiddenLessonsStore.setState({
      unlockedLessons: {},
      recentUnlockedLesson: null,
      isRevealModalOpen: false,
    });

    useProjectStore.setState({
      projects: [],
    });

    useFilesStore.setState({
      files: {},
    });
  });

  describe("API Endpoint Security & Invariants (/api/account/delete)", () => {
    it("rejects unauthenticated requests without bearer token", async () => {
      const req = new NextRequest("http://localhost:3000/api/account/delete", {
        method: "POST",
        body: JSON.stringify({ confirmation: "DELETE" }),
      });

      const res = await POST(req);
      const data = await res.json();

      expect(res.status).toBe(401);
      expect(data.success).toBe(false);
      expect(data.error).toContain("Missing authentication token");
    });

    it("rejects requests with invalid confirmation string", async () => {
      const req = new NextRequest("http://localhost:3000/api/account/delete", {
        method: "POST",
        headers: {
          Authorization: "Bearer mock-test-token",
        },
        body: JSON.stringify({ confirmation: "WRONG_KEYWORD" }),
      });

      const res = await POST(req);
      const data = await res.json();

      expect(res.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.error).toContain('confirmation: "DELETE"');
    });
  });

  describe("Client-Side Account Deletion & Local Data Purge", () => {
    it("purges all local user stores and storage keys on account deletion", async () => {
      const deletedTables: string[] = [];
      const deleteFilters: Array<{ column: string; value: string }> = [];

      const mockDelete = vi.fn().mockImplementation(() => ({
        eq: vi.fn().mockImplementation((col, val) => {
          deleteFilters.push({ column: col, value: val });
          return Promise.resolve({ error: null });
        }),
      }));

      const mockClient = {
        auth: {
          getSession: vi.fn().mockResolvedValue({
            data: { session: { access_token: "test-token" } },
            error: null,
          }),
          signOut: vi.fn().mockResolvedValue({ error: null }),
        },
        from: vi.fn().mockImplementation((tableName: string) => {
          deletedTables.push(tableName);
          return {
            delete: mockDelete,
          };
        }),
      };

      vi.spyOn(clientModule, "getSupabaseClient").mockReturnValue(
        mockClient as unknown as ReturnType<typeof clientModule.getSupabaseClient>
      );

      // Mock fetch for /api/account/delete
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ success: true }),
      });

      const targetUserId = "user-delete-test-uuid";
      SupabaseSyncService.setCurrentUser(targetUserId, "engineer@reec.dev");

      // Populate local stores & storage
      useProgressStore.getState().toggleLesson("/phase-00/week-01/day-01", "Lab 0.1", 10);
      useFilesStore.getState().createFile("main.rs", "fn main() {}");
      localStorage.setItem("reec-academy-user-progress", "{}");
      localStorage.setItem("reec-hidden-lessons-v1", "{}");
      localStorage.setItem("reec_user_projects", "[]");

      const result = await SupabaseSyncService.deleteCurrentAccount(targetUserId);

      expect(result.success).toBe(true);
      expect(global.fetch).toHaveBeenCalledWith("/api/account/delete", expect.objectContaining({
        method: "POST",
        headers: expect.objectContaining({
          Authorization: "Bearer test-token",
        }),
        body: JSON.stringify({ confirmation: "DELETE" }),
      }));

      // Verify all local stores cleared
      expect(useProgressStore.getState().completedLessons.size).toBe(0);
      expect(Object.keys(useFilesStore.getState().files).length).toBe(0);
      expect(localStorage.getItem("reec-academy-user-progress")).toBeNull();
      expect(localStorage.getItem("reec-hidden-lessons-v1")).toBeNull();
      expect(mockClient.auth.signOut).toHaveBeenCalled();
    });

    it("verifies that curriculum tables are never targeted for deletion", async () => {
      const deletedTables: string[] = [];

      const mockDelete = vi.fn().mockImplementation(() => ({
        eq: vi.fn().mockResolvedValue({ error: null }),
      }));

      const mockClient = {
        auth: {
          getSession: vi.fn().mockResolvedValue({
            data: { session: null },
            error: null,
          }),
          signOut: vi.fn().mockResolvedValue({ error: null }),
        },
        from: vi.fn().mockImplementation((tableName: string) => {
          deletedTables.push(tableName);
          return {
            delete: mockDelete,
          };
        }),
      };

      vi.spyOn(clientModule, "getSupabaseClient").mockReturnValue(
        mockClient as unknown as ReturnType<typeof clientModule.getSupabaseClient>
      );

      const targetUserId = "user-delete-isolated";
      await SupabaseSyncService.deleteCurrentAccount(targetUserId);

      // Verify curriculum tables are strictly excluded
      expect(deletedTables).not.toContain("content_files");
      expect(deletedTables).not.toContain("content_file_versions");
      expect(deletedTables).not.toContain("curriculum_phases");
    });
  });
});
