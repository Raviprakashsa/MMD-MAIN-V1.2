"use client";

import React from "react";
import { motion } from "framer-motion";
import { staggerContainer } from "@/lib/animations";
import { cn } from "@/lib/utils";

interface PageTransitionProps {
  children: React.ReactNode;
  className?: string;
}

export const PageTransition = ({ children, className }: PageTransitionProps) => {
  return (
    <motion.div
      initial="hidden"
      animate="visible"
      exit="hidden"
      variants={staggerContainer}
      className={cn("w-full h-full", className)}
    >
      {children}
    </motion.div>
  );
};
