"use client";

import React from "react";
import { motion, useReducedMotion } from "framer-motion";
import { cn } from "@/lib/utils";
import { staggerContainer, fadeIn } from "@/lib/animations";

/**
 * PageContainer - Premium Page Wrapper with Stagger Animations
 * ===========================================================
 * Provides consistent layout structure with entrance animations
 * 
 * Features:
 * - Staggered child animations for visual hierarchy
 * - Responsive max-width with consistent padding
 * - Respects reduced motion preferences
 * - Handles breadcrumbs, headers, and body content
 */

interface PageContainerProps {
  children: React.ReactNode;
  className?: string;
  /** Max width constraint (default: 7xl) */
  maxWidth?: "4xl" | "5xl" | "6xl" | "7xl" | "full";
  /** Add breadcrumbs above content */
  breadcrumbs?: React.ReactNode;
  /** Page header/title section */
  header?: React.ReactNode;
  /** Enable stagger animation on children (default: true) */
  stagger?: boolean;
}

export function PageContainer({
  children,
  className,
  maxWidth = "7xl",
  breadcrumbs,
  header,
  stagger = true,
}: Readonly<PageContainerProps>) {
  const prefersReducedMotion = useReducedMotion();

  const maxWidthClass = {
    "4xl": "max-w-4xl",
    "5xl": "max-w-5xl",
    "6xl": "max-w-6xl",
    "7xl": "max-w-7xl",
    "full": "max-w-full",
  }[maxWidth];

  return (
    <motion.div
      variants={stagger && !prefersReducedMotion ? staggerContainer : fadeIn}
      initial="hidden"
      animate="visible"
      className={cn("mx-auto w-full px-4 py-6 sm:px-6 lg:px-8", maxWidthClass, className)}
    >
      {breadcrumbs && (
        <motion.div variants={prefersReducedMotion ? undefined : fadeIn} className="mb-4">
          {breadcrumbs}
        </motion.div>
      )}

      {header && (
        <motion.div variants={prefersReducedMotion ? undefined : fadeIn} className="mb-8">
          {header}
        </motion.div>
      )}

      <motion.div variants={prefersReducedMotion || !stagger ? undefined : fadeIn}>
        {children}
      </motion.div>
    </motion.div>
  );
}
