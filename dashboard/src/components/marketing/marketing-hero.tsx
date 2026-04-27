"use client";

import Link from "next/link";
import { motion, useReducedMotion } from "framer-motion";
import { ArrowUpRight, GitBranch, Sparkles } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { githubUrl } from "@/lib/marketing-content";

export function MarketingHero() {
  const reduce = useReducedMotion();

  return (
    <section className="relative min-h-[min(88vh,820px)] overflow-hidden border-b border-border/40">
      <motion.div
        className="pointer-events-none absolute inset-0 opacity-90"
        aria-hidden
        animate={
          reduce
            ? {}
            : {
                backgroundPosition: ["0% 0%", "100% 100%", "0% 0%"],
              }
        }
        transition={{ duration: 18, repeat: Infinity, ease: "linear" }}
        style={{
          backgroundSize: "200% 200%",
          backgroundImage: `
            radial-gradient(ellipse 90% 55% at 15% 25%, hsl(var(--primary) / 0.28), transparent 52%),
            radial-gradient(ellipse 70% 45% at 85% 15%, hsl(var(--chart-2) / 0.22), transparent 48%),
            radial-gradient(ellipse 50% 55% at 60% 85%, hsl(188 72% 32% / 0.14), transparent 55%),
            radial-gradient(circle at 50% 50%, hsl(224 32% 10%), hsl(224 36% 6%))
          `,
        }}
      />

      <div className="torqa-hero-grid pointer-events-none absolute inset-0 opacity-[0.28]" aria-hidden />

      {!reduce && (
        <>
          <motion.div
            className="pointer-events-none absolute -left-24 top-1/3 h-80 w-80 rounded-full bg-primary/20 blur-[110px]"
            animate={{ x: [0, 36, 0], y: [0, 16, 0] }}
            transition={{ duration: 14, repeat: Infinity, ease: "easeInOut" }}
            aria-hidden
          />
          <motion.div
            className="pointer-events-none absolute -right-20 top-1/4 h-72 w-72 rounded-full bg-chart-2/18 blur-[100px]"
            animate={{ x: [0, -28, 0], y: [0, 28, 0] }}
            transition={{ duration: 16, repeat: Infinity, ease: "easeInOut" }}
            aria-hidden
          />
        </>
      )}

      <div className="relative z-10 mx-auto flex max-w-4xl flex-col px-6 pb-24 pt-32 sm:px-8 sm:pb-28 sm:pt-36 lg:pt-40">
        <motion.div
          initial={reduce ? false : { opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45 }}
        >
          <Badge variant="secondary" className="border-border/60 bg-muted/40 px-3 py-1 text-xs font-medium text-muted-foreground">
            <Sparkles className="mr-1.5 h-3 w-3 text-primary" />
            Workflow governance
          </Badge>
        </motion.div>

        <motion.h1
          className="mt-10 text-balance text-4xl font-semibold leading-[1.08] tracking-tight sm:text-5xl lg:text-6xl"
          initial={reduce ? false : { opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.55, delay: 0.05 }}
        >
          Continuous governance for automation workflows.
        </motion.h1>

        <motion.p
          className="mt-8 max-w-2xl text-pretty text-base leading-relaxed text-muted-foreground sm:text-lg"
          initial={reduce ? false : { opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
        >
          Connect tools like n8n, scan changes automatically, enforce policies, and alert your team before risky
          workflows reach production.
        </motion.p>

        <motion.div
          className="mt-12 flex flex-wrap items-center gap-3"
          initial={reduce ? false : { opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45, delay: 0.16 }}
        >
          <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} className="relative">
            <div className="pointer-events-none absolute -inset-0.5 rounded-lg bg-gradient-to-r from-primary/45 to-cyan-400/35 opacity-80 blur-md" />
            <Button asChild size="lg" className="relative gap-2 px-6 shadow-xl shadow-primary/20">
              <Link href="/integrations">Connect a workflow source</Link>
            </Button>
          </motion.div>
          <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
            <Button asChild size="lg" variant="outline" className="gap-2 border-border/70 bg-background/40 backdrop-blur">
              <Link href={githubUrl} target="_blank" rel="noreferrer">
                <GitBranch className="h-4 w-4" />
                View GitHub
                <ArrowUpRight className="h-3.5 w-3.5 opacity-70" />
              </Link>
            </Button>
          </motion.div>
        </motion.div>
      </div>
    </section>
  );
}
