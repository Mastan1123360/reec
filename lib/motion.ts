import { type Variants, type Transition } from "framer-motion";

/**
 * REEC Unified Motion Tokens & Physics
 * Apple-inspired motion design: immediate feedback, restrained transitions,
 * physical continuity, and zero visual jank.
 */

// 1. Duration Tokens (seconds)
export const DURATION = {
  instant: 0.1,    // 100ms: micro-interactions, toggles, badges
  micro: 0.14,     // 140ms: icons, chevrons, tooltips
  quick: 0.18,     // 180ms: menus, small cards, selection pills
  standard: 0.24,  // 240ms: route transitions, cards settling, accordions
  emphasized: 0.32,// 320ms: modals, sheet drawers, large panels
  large: 0.42,     // 420ms: full layout reconfigurations
} as const;

// 2. Calibrated Easing Curves (Apple Human Interface Guidelines)
export const EASING = {
  // Apple fluid deceleration curve for natural entrances
  easeOut: [0.16, 1, 0.3, 1] as const,
  // Fast acceleration for elements leaving the viewport
  easeIn: [0.7, 0, 0.84, 0] as const,
  // Smooth symmetrical easing for property toggles
  easeInOut: [0.4, 0, 0.2, 1] as const,
  // Snappy deceleration
  decelerate: [0.05, 0.7, 0.1, 1.0] as const,
} as const;

// 3. Spring Physics Configurations
export const SPRINGS = {
  // Tactile press & small button responses
  tactile: {
    type: "spring",
    stiffness: 500,
    damping: 35,
    mass: 0.8,
  } as Transition,

  // Snappy layout transitions (e.g. active nav pill, search palette)
  snappy: {
    type: "spring",
    stiffness: 400,
    damping: 30,
    mass: 0.9,
  } as Transition,

  // Gentle physical settling (e.g. modals, carousels, drawers)
  gentle: {
    type: "spring",
    stiffness: 300,
    damping: 28,
    mass: 1.0,
  } as Transition,

  // Smooth accordion & panel expansion
  smoothPanel: {
    type: "spring",
    stiffness: 320,
    damping: 32,
    mass: 0.95,
  } as Transition,
} as const;

// 4. Standard Reusable Transition Variants
export const pageTransitionVariants: Variants = {
  initial: {
    opacity: 0,
    y: 5,
  },
  animate: {
    opacity: 1,
    y: 0,
    transition: {
      duration: DURATION.standard,
      ease: EASING.easeOut,
    },
  },
  exit: {
    opacity: 0,
    y: -3,
    transition: {
      duration: DURATION.quick,
      ease: EASING.easeIn,
    },
  },
};

// Subtle staggered container for dashboard cards and lists
export const staggerContainerVariants: Variants = {
  initial: {},
  animate: {
    transition: {
      staggerChildren: 0.03,
      delayChildren: 0.005,
    },
  },
};

// Subtle card entrance
export const cardEntranceVariants: Variants = {
  initial: {
    opacity: 0,
    y: 6,
  },
  animate: {
    opacity: 1,
    y: 0,
    transition: {
      duration: DURATION.standard,
      ease: EASING.easeOut,
    },
  },
};

// Dialog / Modal scale & opacity
export const dialogBackdropVariants: Variants = {
  initial: { opacity: 0 },
  animate: {
    opacity: 1,
    transition: { duration: DURATION.quick, ease: EASING.easeOut },
  },
  exit: {
    opacity: 0,
    transition: { duration: DURATION.micro, ease: EASING.easeIn },
  },
};

export const dialogContentVariants: Variants = {
  initial: {
    opacity: 0,
    scale: 0.97,
    y: 4,
  },
  animate: {
    opacity: 1,
    scale: 1,
    y: 0,
    transition: {
      duration: DURATION.quick,
      ease: EASING.easeOut,
    },
  },
  exit: {
    opacity: 0,
    scale: 0.98,
    y: 2,
    transition: {
      duration: DURATION.micro,
      ease: EASING.easeIn,
    },
  },
};

// Accordion Expand/Collapse
export const accordionVariants: Variants = {
  collapsed: {
    height: 0,
    opacity: 0,
    overflow: "hidden",
    transition: {
      height: { duration: DURATION.quick, ease: EASING.easeIn },
      opacity: { duration: DURATION.micro, ease: EASING.easeIn },
    },
  },
  expanded: {
    height: "auto",
    opacity: 1,
    overflow: "visible",
    transition: {
      height: { duration: DURATION.standard, ease: EASING.easeOut },
      opacity: { duration: DURATION.quick, delay: 0.04, ease: EASING.easeOut },
    },
  },
};

// Tactile Tap / Press Props for Motion buttons
export const buttonTapProps = {
  whileTap: { scale: 0.98 },
  transition: { duration: DURATION.instant, ease: EASING.easeOut },
};

export const cardHoverProps = {
  whileHover: { y: -1 },
  transition: { duration: DURATION.quick, ease: EASING.easeOut },
};
