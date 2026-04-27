"use client";

import { motion, useReducedMotion } from "framer-motion";
import type { ComponentType } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

export function MarketingFeatureCard({
  title,
  copy,
  icon: Icon,
}: {
  title: string;
  copy: string;
  icon: ComponentType<{ className?: string }>;
}) {
  const reduce = useReducedMotion();
  return (
    <motion.div
      whileHover={reduce ? {} : { y: -6, transition: { type: "spring", stiffness: 400, damping: 22 } }}
      className="h-full"
    >
      <Card
        className={cn(
          "group relative h-full overflow-hidden border-border/60 bg-card/50 shadow-lg shadow-black/25",
          "ring-1 ring-white/[0.04] transition-shadow duration-500",
          "hover:border-primary/35 hover:shadow-xl hover:shadow-primary/10 hover:ring-primary/20"
        )}
      >
        <div className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-500 group-hover:opacity-100">
          <div className="absolute inset-0 bg-gradient-to-br from-primary/[0.12] via-transparent to-chart-2/[0.08]" />
        </div>
        <CardHeader className="relative space-y-3 pb-2">
          <motion.div
            className="w-fit rounded-xl border border-primary/30 bg-primary/10 p-2.5 shadow-inner"
            whileHover={reduce ? {} : { rotate: [0, -4, 4, 0], scale: 1.05 }}
            transition={{ duration: 0.45 }}
          >
            <Icon className="h-5 w-5 text-primary" />
          </motion.div>
          <CardTitle className="text-lg">{title}</CardTitle>
        </CardHeader>
        <CardContent className="relative pt-1 text-sm leading-relaxed text-muted-foreground">{copy}</CardContent>
        <div className="absolute bottom-0 left-4 right-4 h-px scale-x-0 bg-gradient-to-r from-transparent via-primary/50 to-transparent transition-transform duration-500 group-hover:scale-x-100" />
      </Card>
    </motion.div>
  );
}
