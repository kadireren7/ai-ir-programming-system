"use client";

import { forwardRef } from "react";
import { cn } from "@/lib/utils";

interface GlowCardProps extends React.HTMLAttributes<HTMLDivElement> {
  glowColor?: "cyan" | "red" | "amber" | "none";
  danger?: boolean;
}

export const GlowCard = forwardRef<HTMLDivElement, GlowCardProps>(
  ({ className, glowColor = "cyan", danger, children, ...props }, ref) => {
    const topGlow =
      danger || glowColor === "red"
        ? "before:bg-gradient-to-r before:from-transparent before:via-[#f43f5e]/50 before:to-transparent"
        : glowColor === "amber"
          ? "before:bg-gradient-to-r before:from-transparent before:via-[#fbbf24]/40 before:to-transparent"
          : glowColor === "cyan"
            ? "before:bg-gradient-to-r before:from-transparent before:via-[#22d3ee]/40 before:to-transparent"
            : "";

    return (
      <div
        ref={ref}
        className={cn(
          "relative overflow-hidden rounded-[10px] border border-[#161b22]",
          "bg-gradient-to-b from-[#0a0d12] to-[#080b10]",
          topGlow &&
            "before:pointer-events-none before:absolute before:inset-x-0 before:top-0 before:h-px before:content-['']",
          className,
        )}
        {...props}
      >
        {children}
      </div>
    );
  },
);
GlowCard.displayName = "GlowCard";
