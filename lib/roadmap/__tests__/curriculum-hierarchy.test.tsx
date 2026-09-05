/**
 * @vitest-environment jsdom
 */
import React from "react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, cleanup } from "@testing-library/react";
import { Sidebar } from "@/components/Sidebar";
import { BackButton } from "@/components/ui/BackButton";
import type { Lesson } from "@/lib/content/types";
import type { RoadmapStatus } from "@/lib/content/discover";

// Mock next/navigation
const mockPush = vi.fn();
const mockBack = vi.fn();
let mockPathname = "/lesson/phase-00/week-01/day-01";

vi.mock("next/navigation", () => ({
  usePathname: () => mockPathname,
  useRouter: () => ({
    push: mockPush,
    back: mockBack,
  }),
}));

// Mock next/link
vi.mock("next/link", () => ({
  default: ({ children, href, className }: any) => (
    <a href={href} className={className}>
      {children}
    </a>
  ),
}));

const mockRoadmap: RoadmapStatus[] = [
  {
    phase: 0,
    title: "Rust Foundations",
    description: "Computational thinking and basics",
    hasContent: true,
    lessonCount: 4,
    weeks: [1, 2],
  },
  {
    phase: 1,
    title: "Systems Programming",
    description: "Memory and concurrency",
    hasContent: true,
    lessonCount: 2,
    weeks: [1],
  },
];

const mockLessons: Lesson[] = [
  {
    frontmatter: {
      id: "P0-W1-D1",
      phase: 0,
      week: 1,
      day: 1,
      title: "Ownership Fundamentals",
      published: true,
      difficulty: 1,
      learning_objectives: [],
      prerequisites: [],
      widgets: [],
      project: null,
      failure_lab: null,
      tags: [],
      key_terms: [],
      reading: [],
      next: null,
      previous: null,
      hidden: false,
      badge: null,
      subtitle: null,
      description: null,
      category: null,
      estimated_time: null,
      slug: null,
      trigger: null,
    },
    slug: ["phase-00", "week-01", "day-01"],
    path: "/lesson/phase-00/week-01/day-01",
    sections: [],
    blocks: [],
    readingTimeMinutes: 5,
    excerpt: "Intro",
    rawWordCount: 500,
  },
  {
    frontmatter: {
      id: "P0-W1-D2",
      phase: 0,
      week: 1,
      day: 2,
      title: "Borrow Checker In-Depth",
      published: true,
      difficulty: 2,
      learning_objectives: [],
      prerequisites: [],
      widgets: [],
      project: null,
      failure_lab: null,
      tags: [],
      key_terms: [],
      reading: [],
      next: null,
      previous: null,
      hidden: false,
      badge: null,
      subtitle: null,
      description: null,
      category: null,
      estimated_time: null,
      slug: null,
      trigger: null,
    },
    slug: ["phase-00", "week-01", "day-02"],
    path: "/lesson/phase-00/week-01/day-02",
    sections: [],
    blocks: [],
    readingTimeMinutes: 5,
    excerpt: "Borrow checker",
    rawWordCount: 500,
  },
  {
    frontmatter: {
      id: "P0-W2-D1",
      phase: 0,
      week: 2,
      day: 1,
      title: "Slices and Lifetimes",
      published: true,
      difficulty: 2,
      learning_objectives: [],
      prerequisites: [],
      widgets: [],
      project: null,
      failure_lab: null,
      tags: [],
      key_terms: [],
      reading: [],
      next: null,
      previous: null,
      hidden: false,
      badge: null,
      subtitle: null,
      description: null,
      category: null,
      estimated_time: null,
      slug: null,
      trigger: null,
    },
    slug: ["phase-00", "week-02", "day-01"],
    path: "/lesson/phase-00/week-02/day-01",
    sections: [],
    blocks: [],
    readingTimeMinutes: 6,
    excerpt: "Slices",
    rawWordCount: 600,
  },
];

describe("Lesson Outline Hierarchy & Back Navigation", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockPathname = "/lesson/phase-00/week-01/day-01";
  });

  afterEach(() => {
    cleanup();
  });

  it("renders Phase and Week hierarchical groupings", () => {
    render(<Sidebar lessons={mockLessons} roadmap={mockRoadmap} />);

    // Check Phase Title
    expect(screen.getByText(/Phase 00 · Rust Foundations/i)).toBeDefined();

    // Check Week Groups
    expect(screen.getByText(/Week 01/i)).toBeDefined();
    expect(screen.getByText(/Week 02/i)).toBeDefined();

    // Active lesson in Week 01 should be rendered
    expect(screen.getByText("Ownership Fundamentals")).toBeDefined();
  });

  it("toggles week accordion when clicked", async () => {
    render(<Sidebar lessons={mockLessons} roadmap={mockRoadmap} />);

    const week2Button = screen.getByText(/Week 02/i).closest("button");
    expect(week2Button).not.toBeNull();

    // Click Week 02 to toggle open
    fireEvent.click(week2Button!);

    // Should display the week 2 lesson
    expect(screen.getByText("Slices and Lifetimes")).toBeDefined();
  });

  it("BackButton triggers fallback navigation when history length <= 1", () => {
    render(<BackButton fallbackHref="/" label="Return to Dashboard" />);

    const button = screen.getByRole("button", { name: "Return to Dashboard" });
    expect(button).toBeDefined();

    fireEvent.click(button);
    expect(mockPush).toHaveBeenCalledWith("/");
  });

  it("BackButton triggers router.back when history has previous entries", () => {
    // Simulate navigation history in window
    Object.defineProperty(window, "history", {
      value: { length: 3, state: { idx: 2 } },
      writable: true,
    });

    render(<BackButton fallbackHref="/" label="Return to Dashboard" />);

    const button = screen.getByRole("button", { name: "Return to Dashboard" });
    fireEvent.click(button);
    expect(mockBack).toHaveBeenCalled();
  });
});
