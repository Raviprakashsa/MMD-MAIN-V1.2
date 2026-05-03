
/**
 * MMDSS Animation Library - Framer Motion Presets
 * ================================================
 * Premium Enterprise Polish with Neuropsychology-Optimized Motion
 * 
 * Timing Scale:
 * - Micro: 120-180ms (instant feedback)
 * - Normal: 200-350ms (standard transitions)
 * - Big: 450-600ms (major state changes)
 * 
 * Motion Philosophy:
 * - Motion must teach structure (reinforce where objects go)
 * - Always respect reduced motion preferences
 * - Use consistent bezier curves across the app
 */

import { Variants, Transition } from 'framer-motion'

// =============================================================================
// PREMIUM BEZIER CURVES
// =============================================================================

export const easing = {
  premium: [0.22, 0.9, 0.33, 1] as const,
  spring: [0.34, 1.56, 0.64, 1] as const,
  outExpo: [0.16, 1, 0.3, 1] as const,
  standard: [0.4, 0, 0.2, 1] as const,
  enter: [0, 0, 0.2, 1] as const,
  exit: [0.4, 0, 1, 1] as const,
}

// =============================================================================
// TIMING CONSTANTS
// =============================================================================

export const duration = {
  micro: 0.12,
  fast: 0.18,
  base: 0.22,
  normal: 0.3,
  slow: 0.45,
  slower: 0.6,
}

// =============================================================================
// SPRING CONFIGS - Physical, Natural Feel
// =============================================================================

export const springConfig = {
  snappy: { type: 'spring' as const, stiffness: 400, damping: 30 },
  gentle: { type: 'spring' as const, stiffness: 200, damping: 25 },
  bouncy: { type: 'spring' as const, stiffness: 300, damping: 20 },
  smooth: { type: 'spring' as const, stiffness: 150, damping: 20 },
}

// =============================================================================
// BASIC VARIANTS
// =============================================================================

export const fadeIn: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { duration: duration.normal, ease: easing.standard }
  }
}

export const slideUp: Variants = {
  hidden: { y: 20, opacity: 0 },
  visible: {
    y: 0,
    opacity: 1,
    transition: { duration: duration.normal, ease: easing.premium }
  }
}

export const slideDown: Variants = {
  hidden: { y: -20, opacity: 0 },
  visible: {
    y: 0,
    opacity: 1,
    transition: { duration: duration.normal, ease: easing.premium }
  }
}

export const slideLeft: Variants = {
  hidden: { x: 20, opacity: 0 },
  visible: {
    x: 0,
    opacity: 1,
    transition: { duration: duration.normal, ease: easing.premium }
  }
}

export const slideRight: Variants = {
  hidden: { x: -20, opacity: 0 },
  visible: {
    x: 0,
    opacity: 1,
    transition: { duration: duration.normal, ease: easing.premium }
  }
}

// =============================================================================
// SCALE VARIANTS
// =============================================================================

export const scaleIn: Variants = {
  hidden: { scale: 0.95, opacity: 0 },
  visible: {
    scale: 1,
    opacity: 1,
    transition: { duration: duration.base, ease: easing.premium }
  }
}

export const popIn: Variants = {
  hidden: { scale: 0.9, opacity: 0 },
  visible: {
    scale: 1,
    opacity: 1,
    transition: springConfig.bouncy
  }
}

// =============================================================================
// STAGGER CONTAINERS
// =============================================================================

export const staggerContainer: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.08,
      delayChildren: 0.1
    }
  }
}

export const staggerContainerFast: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.05,
      delayChildren: 0.05
    }
  }
}

export const staggerItem: Variants = {
  hidden: { y: 12, opacity: 0 },
  visible: {
    y: 0,
    opacity: 1,
    transition: { duration: duration.base, ease: easing.premium }
  }
}

// =============================================================================
// CARD HOVER VARIANTS - Premium Enterprise Polish
// =============================================================================

export const cardHover: Variants = {
  initial: { y: 0, boxShadow: '0 4px 12px rgba(15, 23, 42, 0.06)' },
  hover: {
    y: -3,
    boxShadow: '0 16px 40px rgba(0, 0, 0, 0.08)',
    transition: { duration: duration.base, ease: easing.premium }
  },
  tap: {
    y: -1,
    boxShadow: '0 8px 24px rgba(0, 0, 0, 0.06)',
    transition: { duration: duration.micro, ease: easing.standard }
  }
}

export const buttonPress: Variants = {
  initial: { scale: 1 },
  hover: { scale: 1.02, transition: { duration: duration.micro } },
  tap: { scale: 0.97, transition: { duration: duration.micro } }
}

// =============================================================================
// GLASS MORPHISM VARIANTS
// =============================================================================

export const glassVariants: Variants = {
  initial: {
    backdropFilter: 'blur(10px)',
    backgroundColor: 'rgba(255, 255, 255, 0.8)',
  },
  hover: {
    backdropFilter: 'blur(16px)',
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    transition: { duration: duration.normal }
  }
}

// =============================================================================
// DRAWER / PANEL VARIANTS
// =============================================================================

export const drawerSlide: Variants = {
  hidden: { x: '100%', opacity: 0 },
  visible: {
    x: 0,
    opacity: 1,
    transition: { duration: duration.slow, ease: easing.outExpo }
  },
  exit: {
    x: '100%',
    opacity: 0,
    transition: { duration: duration.normal, ease: easing.exit }
  }
}

export const modalScale: Variants = {
  hidden: { scale: 0.95, opacity: 0 },
  visible: {
    scale: 1,
    opacity: 1,
    transition: { duration: duration.normal, ease: easing.outExpo }
  },
  exit: {
    scale: 0.95,
    opacity: 0,
    transition: { duration: duration.fast, ease: easing.exit }
  }
}

export const backdropFade: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { duration: duration.base }
  },
  exit: {
    opacity: 0,
    transition: { duration: duration.fast }
  }
}

// =============================================================================
// DOPAMINE MICRO-REWARDS - Subtle Success Feedback
// =============================================================================

export const successPop: Variants = {
  hidden: { scale: 0.8, opacity: 0 },
  visible: {
    scale: 1,
    opacity: 1,
    transition: springConfig.bouncy
  }
}

export const checkmarkDraw: Variants = {
  hidden: { pathLength: 0, opacity: 0 },
  visible: {
    pathLength: 1,
    opacity: 1,
    transition: { duration: duration.normal, ease: easing.outExpo }
  }
}

export const rippleExpand: Variants = {
  initial: { scale: 0.5, opacity: 0 },
  animate: {
    scale: 1.5,
    opacity: [0, 1, 0],
    transition: { duration: duration.slow, ease: easing.outExpo }
  }
}

// =============================================================================
// STAGE MOVE / PIPELINE ANIMATIONS
// =============================================================================

export const stageMoveLeft: Variants = {
  initial: { x: 50, opacity: 0 },
  animate: {
    x: 0,
    opacity: 1,
    transition: { duration: duration.normal, ease: easing.premium }
  },
  exit: {
    x: -50,
    opacity: 0,
    transition: { duration: duration.fast, ease: easing.exit }
  }
}

export const stageMoveRight: Variants = {
  initial: { x: -50, opacity: 0 },
  animate: {
    x: 0,
    opacity: 1,
    transition: { duration: duration.normal, ease: easing.premium }
  },
  exit: {
    x: 50,
    opacity: 0,
    transition: { duration: duration.fast, ease: easing.exit }
  }
}

// =============================================================================
// TOAST ANIMATIONS
// =============================================================================

export const toastSlideUp: Variants = {
  hidden: { y: 100, opacity: 0, scale: 0.95 },
  visible: {
    y: 0,
    opacity: 1,
    scale: 1,
    transition: { duration: duration.normal, ease: easing.outExpo }
  },
  exit: {
    y: 20,
    opacity: 0,
    scale: 0.95,
    transition: { duration: duration.fast, ease: easing.exit }
  }
}

export const undoProgress: Variants = {
  initial: { width: '100%' },
  animate: {
    width: '0%',
    transition: { duration: 5, ease: 'linear' }
  }
}

// =============================================================================
// LOADING / SKELETON ANIMATIONS
// =============================================================================

export const shimmer: Variants = {
  animate: {
    x: ['0%', '100%'],
    transition: {
      duration: 1.5,
      ease: 'linear',
      repeat: Infinity,
    }
  }
}

export const pulse: Variants = {
  animate: {
    opacity: [1, 0.5, 1],
    transition: {
      duration: 2,
      ease: 'easeInOut',
      repeat: Infinity,
    }
  }
}

// =============================================================================
// SLA URGENCY ANIMATIONS
// =============================================================================

export const warningPulse: Variants = {
  animate: {
    boxShadow: [
      '0 0 0 0 rgba(255, 107, 53, 0)',
      '0 0 0 4px rgba(255, 107, 53, 0.15)',
      '0 0 0 0 rgba(255, 107, 53, 0)',
    ],
    transition: {
      duration: 3,
      ease: 'easeInOut',
      repeat: Infinity,
    }
  }
}

// Critical SLA - More urgent pulse
export const criticalPulse: Variants = {
  animate: {
    boxShadow: [
      '0 0 0 0 rgba(229, 62, 62, 0)',
      '0 0 0 6px rgba(229, 62, 62, 0.2)',
      '0 0 0 0 rgba(229, 62, 62, 0)',
    ],
    transition: {
      duration: 2,
      ease: 'easeInOut',
      repeat: Infinity,
    }
  }
}

// =============================================================================
// LIST ITEM ANIMATIONS
// =============================================================================

export const listItem: Variants = {
  hidden: { opacity: 0, y: 10 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: {
      delay: i * 0.05,
      duration: duration.base,
      ease: easing.premium,
    }
  }),
  exit: {
    opacity: 0,
    x: -20,
    transition: { duration: duration.fast }
  }
}

// =============================================================================
// PAGE TRANSITIONS
// =============================================================================

export const pageTransition: Variants = {
  initial: { opacity: 0, y: 8 },
  animate: {
    opacity: 1,
    y: 0,
    transition: { duration: duration.normal, ease: easing.premium }
  },
  exit: {
    opacity: 0,
    y: -8,
    transition: { duration: duration.fast, ease: easing.exit }
  }
}

// =============================================================================
// UTILITY: Reduced Motion Safe Transition
// =============================================================================

export const safeTransition = (transition: Transition): Transition => ({
  ...transition,
  // When reduced motion is preferred, use instant transitions
  // This is handled at the component level with useReducedMotion
})

// =============================================================================
// UTILITY: Create Custom Spring
// =============================================================================

export const createSpring = (stiffness: number, damping: number) => ({
  type: 'spring' as const,
  stiffness,
  damping,
})

// =============================================================================
// PRESETS FOR COMMON USE CASES
// =============================================================================

export const presets = {
  // Card interactions
  card: cardHover,
  button: buttonPress,

  // Content reveal
  fadeIn,
  slideUp,
  scaleIn,

  // Lists
  staggerContainer,
  staggerItem,
  listItem,

  // Modals & Drawers
  drawer: drawerSlide,
  modal: modalScale,
  backdrop: backdropFade,

  // Feedback
  success: successPop,
  toast: toastSlideUp,

  // Page
  page: pageTransition,
}

export default presets
