"use client";

import React from "react";
import { motion, HTMLMotionProps, useReducedMotion } from "framer-motion";
import { cn } from "@/lib/utils";
import { slideUp, cardHover } from "@/lib/animations";

/**
 * GlassCard - Premium Glassmorphism Component
 * ==========================================
 * Design Philosophy: "Dense UI but visually calm"
 * 
 * Features:
 * - High information density with low visual noise
 * - Subtle glassmorphism effect
 * - Premium hover lift effect
 * - Respects reduced motion preferences
 */

interface GlassCardProps extends HTMLMotionProps<"div"> {
    children: React.ReactNode;
    className?: string;
    variant?: "default" | "hover" | "interaction" | "elevated";
    noPadding?: boolean;
    /** Use light theme (white background) instead of dark glass */
    lightMode?: boolean;
    /** Enable subtle shimmer overlay (default: true) */
    shimmer?: boolean;
}

const GlassCard = React.forwardRef<HTMLDivElement, GlassCardProps>(
    ({ children, className, variant = "default", noPadding = false, lightMode = false, shimmer = true, ...props }, ref) => {
        const prefersReducedMotion = useReducedMotion();

        // Animation variants based on variant prop
        const motionVariants = variant === "interaction" || variant === "hover" 
            ? cardHover 
            : slideUp;

        return (
            <motion.div
                ref={ref}
                initial={prefersReducedMotion ? false : "hidden"}
                animate="visible"
                whileHover={
                    !prefersReducedMotion && (variant === "hover" || variant === "interaction") 
                        ? "hover" 
                        : undefined
                }
                whileTap={
                    !prefersReducedMotion && variant === "interaction" 
                        ? "tap" 
                        : undefined
                }
                variants={motionVariants}
                className={cn(
                    // Base Styles
                    "relative overflow-hidden rounded-2xl",
                    
                    // Light Mode (default for staffing app) - DRAMATICALLY ENHANCED
                    lightMode && [
                        "bg-gradient-to-b from-white via-white to-[#fafaff]",
                        "border border-[rgba(23,0,174,0.06)]",
                        "shadow-[0_1px_3px_rgba(15,23,42,0.04),0_6px_20px_rgba(15,23,42,0.10),0_12px_40px_rgba(23,0,174,0.06)]",
                    ],
                    
                    // Dark Glass Mode (for hero sections, dark backgrounds)
                    !lightMode && [
                        "border border-white/10 shadow-xl",
                        "bg-white/5 backdrop-blur-md",
                        "text-white",
                    ],

                    // Shimmer effect (subtle, not distracting)
                    shimmer && !prefersReducedMotion && "before:absolute before:inset-0 before:-translate-x-full before:animate-[shimmer_3s_infinite] before:bg-gradient-to-r before:from-transparent before:via-white/5 before:to-transparent",

                    // Variants - ENHANCED hover effects
                    variant === "hover" && lightMode && "hover:shadow-[0_1px_4px_rgba(15,23,42,0.04),0_16px_48px_rgba(15,23,42,0.14),0_24px_60px_rgba(23,0,174,0.10)] hover:border-[rgba(23,0,174,0.12)] hover:-translate-y-1 transition-all duration-300",
                    variant === "hover" && !lightMode && "hover:bg-white/10 hover:border-white/20 transition-all duration-base",
                    variant === "interaction" && "cursor-pointer hover:shadow-[0_1px_4px_rgba(15,23,42,0.04),0_16px_48px_rgba(15,23,42,0.14),0_24px_60px_rgba(23,0,174,0.10)] hover:border-[rgba(23,0,174,0.12)] hover:-translate-y-1 transition-all duration-300",
                    variant === "elevated" && lightMode && "shadow-[0_2px_6px_rgba(15,23,42,0.06),0_10px_32px_rgba(15,23,42,0.12)] border-[rgba(23,0,174,0.08)]",
                    variant === "elevated" && !lightMode && "shadow-2xl bg-white/8",

                    // Padding
                    !noPadding && "p-5",

                    className
                )}
                {...props}
            >
                {/* Inner glow for depth (dark mode only) */}
                {!lightMode && (
                    <div className="absolute inset-0 -z-10 bg-gradient-to-br from-white/5 to-transparent opacity-50" />
                )}
                {children}
            </motion.div>
        );
    }
);

GlassCard.displayName = "GlassCard";

// Light mode variant for staffing app
const LightCard = React.forwardRef<HTMLDivElement, Omit<GlassCardProps, 'lightMode'>>(
    (props, ref) => <GlassCard ref={ref} lightMode {...props} />
);
LightCard.displayName = "LightCard";

// Mission card wrapper with brand styling
const MissionCardWrapper = React.forwardRef<HTMLDivElement, Omit<GlassCardProps, 'lightMode' | 'variant'>>(
    ({ className, ...props }, ref) => (
        <GlassCard 
            ref={ref} 
            lightMode 
            variant="interaction"
            className={cn("mission-card", className)}
            {...props} 
        />
    )
);
MissionCardWrapper.displayName = "MissionCardWrapper";

export { GlassCard, LightCard, MissionCardWrapper };
