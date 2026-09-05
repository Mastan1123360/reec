import { describe, it, expect } from "vitest";

/**
 * Pure helper simulating the single source of truth carousel position logic
 * used in RoadmapStepperCard and LearningRoadmap.
 */
export function computeCarouselState({
  scrollLeft,
  scrollWidth,
  clientWidth,
  cardOffsets,
  phaseCount,
}: {
  scrollLeft: number;
  scrollWidth: number;
  clientWidth: number;
  cardOffsets: number[];
  phaseCount: number;
}) {
  const maxScroll = Math.max(0, scrollWidth - clientWidth);
  const isAtStart = scrollLeft <= 4;
  const isAtEnd = maxScroll <= 4 || scrollLeft >= maxScroll - 6;

  const canScrollLeft = !isAtStart;
  const canScrollRight = !isAtEnd;

  if (phaseCount === 0) {
    return { activeIndex: 0, canScrollLeft: false, canScrollRight: false };
  }

  if (isAtEnd) {
    return { activeIndex: phaseCount - 1, canScrollLeft, canScrollRight };
  }

  if (isAtStart) {
    return { activeIndex: 0, canScrollLeft, canScrollRight };
  }

  let closestIdx = 0;
  let minDistance = Infinity;

  for (let i = 0; i < cardOffsets.length; i++) {
    const dist = Math.abs(cardOffsets[i] - scrollLeft);
    if (dist < minDistance) {
      minDistance = dist;
      closestIdx = i;
    }
  }

  return {
    activeIndex: Math.min(phaseCount - 1, Math.max(0, closestIdx)),
    canScrollLeft,
    canScrollRight,
  };
}

describe("Roadmap Carousel State & Pagination Synchronization", () => {
  const phases = Array.from({ length: 9 }, (_, i) => ({ id: i }));
  // Example desktop layout: 9 cards with 245px width + 10px gap
  const cardOffsets = phases.map((_, i) => i * 255);
  const scrollWidth = 9 * 255;
  const clientWidth = 800; // ~3 cards visible at a time
  const maxScroll = scrollWidth - clientWidth; // 2295 - 800 = 1495

  it("correctly identifies start state and disables left scroll", () => {
    const state = computeCarouselState({
      scrollLeft: 0,
      scrollWidth,
      clientWidth,
      cardOffsets,
      phaseCount: 9,
    });

    expect(state.activeIndex).toBe(0);
    expect(state.canScrollLeft).toBe(false);
    expect(state.canScrollRight).toBe(true);
  });

  it("correctly tracks middle cards based on physical element offsetLeft", () => {
    // Scrolled to card 3 (offset = 3 * 255 = 765)
    const state = computeCarouselState({
      scrollLeft: 765,
      scrollWidth,
      clientWidth,
      cardOffsets,
      phaseCount: 9,
    });

    expect(state.activeIndex).toBe(3);
    expect(state.canScrollLeft).toBe(true);
    expect(state.canScrollRight).toBe(true);
  });

  it("CRITICAL: synchronizes pagination dot to the FINAL phase when reaching carousel end", () => {
    // When scrolled to the absolute maximum right (1495px)
    // The previous bug left pagination stuck on index 5 (because 1495/260 = 5.7)
    // The new hardened implementation MUST report activeIndex = 8 (the last phase)
    const state = computeCarouselState({
      scrollLeft: maxScroll,
      scrollWidth,
      clientWidth,
      cardOffsets,
      phaseCount: 9,
    });

    expect(state.activeIndex).toBe(8); // Phase 8 (9th phase)
    expect(state.canScrollLeft).toBe(true);
    expect(state.canScrollRight).toBe(false); // Next arrow disabled at end
  });

  it("handles tolerance when reaching near the right edge", () => {
    const state = computeCarouselState({
      scrollLeft: maxScroll - 3,
      scrollWidth,
      clientWidth,
      cardOffsets,
      phaseCount: 9,
    });

    expect(state.activeIndex).toBe(8);
    expect(state.canScrollRight).toBe(false);
  });

  it("handles small mobile viewports where scrollWidth is only slightly larger than clientWidth", () => {
    const state = computeCarouselState({
      scrollLeft: 300,
      scrollWidth: 600,
      clientWidth: 300,
      cardOffsets: [0, 200, 400],
      phaseCount: 3,
    });

    expect(state.activeIndex).toBe(2); // at end (300 >= 600-300 = 300)
    expect(state.canScrollRight).toBe(false);
  });

  it("safely handles 0 phases without throwing or dividing by zero", () => {
    const state = computeCarouselState({
      scrollLeft: 0,
      scrollWidth: 0,
      clientWidth: 0,
      cardOffsets: [],
      phaseCount: 0,
    });

    expect(state.activeIndex).toBe(0);
    expect(state.canScrollLeft).toBe(false);
    expect(state.canScrollRight).toBe(false);
  });
});
