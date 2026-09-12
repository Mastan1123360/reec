// @vitest-environment jsdom
import { describe, it, expect, beforeEach, vi } from "vitest";
import {
  resolveInstantProfile,
  reconcileProfileWithDatabase,
  setPerUserProfileCache,
} from "../profile-resolver";

describe("Deterministic Instant-Profile Resolver", () => {
  beforeEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
  });

  describe("displayName priority", () => {
    it("1. prioritizes user_metadata.full_name over all else", () => {
      const profile = resolveInstantProfile({
        id: "usr-1",
        email: "ferris@rustacean.org",
        user_metadata: {
          full_name: "Ferris The Architect",
          name: "Ferris Crab",
          display_name: "FerrisDisplayName",
          user_name: "ferris_gh",
          preferred_username: "ferris_oauth",
        },
      });
      expect(profile.displayName).toBe("Ferris The Architect");
    });

    it("2. falls back to user_metadata.name", () => {
      const profile = resolveInstantProfile({
        id: "usr-1",
        email: "ferris@rustacean.org",
        user_metadata: {
          name: "Ferris Crab",
          display_name: "FerrisDisplayName",
          user_name: "ferris_gh",
        },
      });
      expect(profile.displayName).toBe("Ferris Crab");
    });

    it("3. falls back to user_metadata.display_name", () => {
      const profile = resolveInstantProfile({
        id: "usr-1",
        email: "ferris@rustacean.org",
        user_metadata: {
          display_name: "FerrisDisplayName",
          user_name: "ferris_gh",
        },
      });
      expect(profile.displayName).toBe("FerrisDisplayName");
    });

    it("4. falls back to user_metadata.user_name", () => {
      const profile = resolveInstantProfile({
        id: "usr-1",
        email: "ferris@rustacean.org",
        user_metadata: {
          user_name: "ferris_gh",
          preferred_username: "ferris_pref",
        },
      });
      expect(profile.displayName).toBe("ferris_gh");
    });

    it("5. falls back to user_metadata.preferred_username", () => {
      const profile = resolveInstantProfile({
        id: "usr-1",
        email: "ferris@rustacean.org",
        user_metadata: {
          preferred_username: "ferris_pref",
        },
      });
      expect(profile.displayName).toBe("ferris_pref");
    });

    it("6. falls back to per-user local cache (reec_display_name_<userId>)", () => {
      localStorage.setItem("reec_display_name_usr-1", "Cached Specialist");
      const profile = resolveInstantProfile({
        id: "usr-1",
        email: "ferris@rustacean.org",
        user_metadata: {},
      });
      expect(profile.displayName).toBe("Cached Specialist");
    });

    it("7. falls back to email prefix", () => {
      const profile = resolveInstantProfile({
        id: "usr-1",
        email: "rustacean_engineer@example.com",
        user_metadata: {},
      });
      expect(profile.displayName).toBe("rustacean_engineer");
    });

    it("8. falls back to safe default 'Learner' when no email or metadata", () => {
      const profile = resolveInstantProfile({
        id: "usr-1",
        email: null,
        user_metadata: {},
      });
      expect(profile.displayName).toBe("Learner");
    });
  });

  describe("username priority", () => {
    it("1. prioritizes existing REEC username in Auth metadata", () => {
      localStorage.setItem("reec_username_usr-1", "cached_user");
      const profile = resolveInstantProfile({
        id: "usr-1",
        email: "test@example.com",
        user_metadata: {
          username: "auth_meta_user",
          user_name: "gh_user",
        },
      });
      expect(profile.username).toBe("auth_meta_user");
    });

    it("2. falls back to per-user REEC local cache", () => {
      localStorage.setItem("reec_username_usr-1", "per_user_cached");
      localStorage.setItem("reec_persisted_username", "global_persisted");
      const profile = resolveInstantProfile({
        id: "usr-1",
        email: "test@example.com",
        user_metadata: {
          user_name: "gh_user",
        },
      });
      expect(profile.username).toBe("per_user_cached");
    });

    it("3. falls back to existing persisted username", () => {
      localStorage.setItem("reec_persisted_username", "global_persisted");
      const profile = resolveInstantProfile({
        id: "usr-1",
        email: "test@example.com",
        user_metadata: {
          user_name: "gh_user",
        },
      });
      expect(profile.username).toBe("global_persisted");
    });

    it("4. falls back to OAuth provider username (user_name / preferred_username)", () => {
      const profile = resolveInstantProfile({
        id: "usr-1",
        email: "test@example.com",
        user_metadata: {
          preferred_username: "oauth_coder",
        },
      });
      expect(profile.username).toBe("oauth_coder");
    });

    it("5. falls back to email prefix", () => {
      const profile = resolveInstantProfile({
        id: "usr-1",
        email: "rust_lover_99@example.com",
        user_metadata: {},
      });
      expect(profile.username).toBe("rust_lover_99");
    });
  });

  describe("avatar priority", () => {
    it("1. prioritizes Auth metadata avatar_id", () => {
      localStorage.setItem("reec_avatar_id_usr-1", "human-female-ava");
      const profile = resolveInstantProfile({
        id: "usr-1",
        user_metadata: {
          avatar_id: "human-male-marcus",
        },
      });
      expect(profile.avatarId).toBe("human-male-marcus");
    });

    it("2. falls back to per-user local cache", () => {
      localStorage.setItem("reec_avatar_id_usr-1", "human-female-ava");
      const profile = resolveInstantProfile({
        id: "usr-1",
        user_metadata: {},
      });
      expect(profile.avatarId).toBe("human-female-ava");
    });

    it("3. falls back to safe default", () => {
      const profile = resolveInstantProfile({
        id: "usr-1",
        user_metadata: {},
      });
      expect(profile.avatarId).toBe("human-male-alex");
    });
  });

  describe("gender priority", () => {
    it("1. prioritizes Auth metadata gender", () => {
      localStorage.setItem("reec_gender_usr-1", "male");
      const profile = resolveInstantProfile({
        id: "usr-1",
        user_metadata: {
          gender: "female",
        },
      });
      expect(profile.gender).toBe("female");
    });

    it("2. falls back to per-user local cache", () => {
      localStorage.setItem("reec_gender_usr-1", "female");
      const profile = resolveInstantProfile({
        id: "usr-1",
        user_metadata: {},
      });
      expect(profile.gender).toBe("female");
    });

    it("3. falls back to safe default 'male'", () => {
      const profile = resolveInstantProfile({
        id: "usr-1",
        user_metadata: {},
      });
      expect(profile.gender).toBe("male");
    });
  });

  describe("reconciliation safety", () => {
    it("MUST NOT overwrite valid instant values with null, undefined, or empty string", () => {
      const instant = resolveInstantProfile({
        id: "usr-1",
        email: "shaik@example.com",
        user_metadata: {
          full_name: "Shaik Mastan Vali",
          username: "shaikmastanvali223",
          avatar_id: "human-male-marcus",
          gender: "male",
        },
      });

      const reconciled = reconcileProfileWithDatabase(instant, {
        displayName: "",
        username: null as any,
        avatarId: undefined,
        gender: null as any,
      });

      expect(reconciled.displayName).toBe("Shaik Mastan Vali");
      expect(reconciled.username).toBe("shaikmastanvali223");
      expect(reconciled.avatarId).toBe("human-male-marcus");
      expect(reconciled.gender).toBe("male");
    });

    it("reconciles newer valid database values correctly", () => {
      const instant = resolveInstantProfile({
        id: "usr-1",
        email: "shaik@example.com",
        user_metadata: {
          full_name: "Shaik Mastan Vali",
          username: "shaikmastanvali223",
        },
      });

      const reconciled = reconcileProfileWithDatabase(instant, {
        displayName: "Shaik Mastan Vali Senior",
        coins: 150,
      });

      expect(reconciled.displayName).toBe("Shaik Mastan Vali Senior");
      expect(reconciled.coins).toBe(150);
    });
  });
});
