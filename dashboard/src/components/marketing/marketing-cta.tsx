"use client";

import Link from "next/link";
import { motion, useReducedMotion } from "framer-motion";
import { ArrowRight, GitBranch, LayoutDashboard } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { githubUrl } from "@/lib/marketing-content";

export function MarketingCinematicCta() {
  const reduce = useReducedMotion();
  return (
    <div className="relative overflow-hidden rounded-3xl border border-primary/30 shadow-2xl shadow-primary/10 ring-1 ring-white/[0.05]">
      <motion.div
        className="pointer-events-none absolute inset-0"
        aria-hidden
        animate={
          reduce
            ? {}
            : {
                backgroundPosition: ["0% 50%", "100% 50%", "0% 50%"],
              }
        }
        transition={{ duration: 14, repeat: Infinity, ease: "linear" }}
        style={{
          backgroundSize: "200% 200%",
          backgroundImage: `
            linear-gradient(125deg, hsl(var(--primary) / 0.35), transparent 35%, hsl(var(--chart-2) / 0.25), transparent 70%),
            radial-gradient(ellipse 100% 80% at 50% 120%, hsl(188 72% 25% / 0.5), transparent 55%)
          `,
        }}
      />
      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(to_top,hsl(var(--background)/0.92),transparent)]" />
      <Card className="relative border-0 bg-transparent shadow-none">
        <CardHeader className="space-y-3 px-6 pb-2 pt-8 sm:px-10 sm:pt-10">
          <CardTitle className="max-w-3xl text-2xl sm:text-3xl lg:text-4xl">
            Ready to make workflow risk{" "}
            <span className="bg-gradient-to-r from-primary-foreground via-white to-cyan-200 bg-clip-text text-transparent">
              visible
            </span>
            ?
          </CardTitle>
          <CardDescription className="max-w-2xl text-sm text-foreground/80 sm:text-base">
            Start scanning today, run your team on deterministic findings, and share remediation-ready reports.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-3 px-6 pb-8 sm:px-10 sm:pb-10">
          <motion.div whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.97 }}>
            <Button asChild size="lg" className="gap-2 shadow-lg shadow-primary/30">
              <Link href="/scan">
                Start scanning
                <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
          </motion.div>
          <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
            <Button asChild size="lg" variant="secondary" className="gap-2 border border-white/10 bg-background/70 backdrop-blur">
              <Link href="/overview">
                Open dashboard
                <LayoutDashboard className="h-4 w-4" />
              </Link>
            </Button>
          </motion.div>
          <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
            <Button asChild size="lg" variant="outline" className="gap-2 border-border/80 bg-background/40 backdrop-blur">
              <Link href={githubUrl} target="_blank" rel="noreferrer">
                Explore GitHub
                <GitBranch className="h-4 w-4" />
              </Link>
            </Button>
          </motion.div>
        </CardContent>
      </Card>
    </div>
  );
}
