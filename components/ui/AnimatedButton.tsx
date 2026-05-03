"use client";

import React from "react";
import { motion, HTMLMotionProps, useReducedMotion } from "framer-motion";
import { cn } from "@/lib/utils";
import { buttonPress } from "@/lib/animations";

/**
 * AnimatedButton - Premium Button with Micro-Interactions
 * ======================================================
 * Enhanced button with spring animations and accessibility
 * 
 * Features:
 * - Spring-based press feedback (scale 0.96)
 * - Hover lift effect with subtle shadow
 * - Loading state with spinner
 * - Respects reduced motion preferences
 * - Full keyboard accessibility
 */

interface AnimatedButtonProps extends Omit<HTMLMotionProps<"button">, "variants"> {
  children: React.ReactNode;
  className?: string;
  variant?: "primary" | "secondary" | "ghost" | "danger";
  size?: "sm" | "md" | "lg";
  loading?: boolean;
  disabled?: boolean;
  icon?: React.ReactNode;
  iconPosition?: "left" | "right";
}

export const AnimatedButton = React.forwardRef<HTMLButtonElement, AnimatedButtonProps>(
  (
    {
      children,
      className,
      variant = "primary",
      size = "md",
      loading = false,
      disabled = false,
      icon,
      iconPosition = "left",
      ...props
    },
    ref
  ) => {
    const prefersReducedMotion = useReducedMotion();

    const variantClasses = {
      primary:
        "bg-gradient-to-r from-indigo-600 to-blue-600 text-white hover:from-indigo-500 hover:to-blue-500 shadow-lg shadow-indigo-500/30",
      secondary:
        "bg-white/10 backdrop-blur-sm text-white border border-white/20 hover:bg-white/15",
      ghost: "bg-transparent text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800",
      danger:
        "bg-gradient-to-r from-red-600 to-rose-600 text-white hover:from-red-500 hover:to-rose-500 shadow-lg shadow-red-500/30",
    };

    const sizeClasses = {
      sm: "px-3 py-1.5 text-sm",
      md: "px-4 py-2 text-base",
      lg: "px-6 py-3 text-lg",
    };

    const isDisabled = disabled || loading;

    return (
      <motion.button
        ref={ref}
        variants={prefersReducedMotion ? undefined : buttonPress}
        initial={prefersReducedMotion ? undefined : "rest"}
        whileHover={prefersReducedMotion || isDisabled ? undefined : "hover"}
        whileTap={prefersReducedMotion || isDisabled ? undefined : "tap"}
        disabled={isDisabled}
        className={cn(
          "btn-spring", // Uses global CSS animation
          "relative inline-flex items-center justify-center gap-2",
          "rounded-lg font-medium",
          "transition-all duration-200",
          "focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2",
          "disabled:cursor-not-allowed disabled:opacity-50",
          variantClasses[variant],
          sizeClasses[size],
          className
        )}
        {...props}
      >
        {loading && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            className="absolute inset-0 flex items-center justify-center bg-inherit rounded-lg"
          >
            <svg
              className="animate-spin h-5 w-5"
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
            >
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
              ></circle>
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
              ></path>
            </svg>
          </motion.div>
        )}

        <span className={cn("inline-flex items-center gap-2", loading && "invisible")}>
          {icon && iconPosition === "left" && <span className="flex-shrink-0">{icon}</span>}
          {children}
          {icon && iconPosition === "right" && <span className="flex-shrink-0">{icon}</span>}
        </span>
      </motion.button>
    );
  }
);

AnimatedButton.displayName = "AnimatedButton";
