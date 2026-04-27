"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { animate, motion, useInView, useReducedMotion } from "framer-motion";
import { ArrowRight, ArrowUpRight, GitBranch, LayoutDashboard, Shield, Sparkles, Zap } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { githubUrl, heroStats, trustBadges } from "@/lib/marketing-content";
import { cn } from "@/lib/utils";

function AnimatedCounter({ to, suffix = "" }: { to: number; suffix?: string }) {
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true, margin: "-20px" });
  const [v, setV] = useState(0);
  const reduce = useReducedMotion();

  useEffect(() => {
    if (!inView || reduce) {
      setV(to);
      return;
    }
    const c = animate(0, to, {
      duration: 1.85,
      ease: [0.22, 1, 0.36, 1],
      onUpdate: (latest) => setV(Math.round(latest)),
    });
    return () => c.stop();
  }, [inView, to, reduce]);

  return (
    <span ref={ref} className="tabular-nums tracking-tight">
      {v}
      {suffix}
    </span>
  );
}

function FloatingCard({
  className,
  children,
  delay,
}: {
  className?: string;
  children: React.ReactNode;
  delay: number;
}) {
  const reduce = useReducedMotion();
  return (
    <motion.div
      className={cn("absolute w-[min(100%,280px)]", className)}
      initial={reduce ? false : { opacity: 0, y: 24, rotate: -2 }}
      animate={{ opacity: 1, y: 0, rotate: 0 }}
      transition={{ duration: 0.75, delay, ease: [0.22, 1, 0.36, 1] }}
    >
      <motion.div
        animate={
          reduce
            ? {}
            : {
                y: [0, -8, 0],
              }
        }
        transition={{ duration: 5 + delay, repeat: Infinity, ease: "easeInOut" }}
      >
        {children}
      </motion.div>
    </motion.div>
  );
}

export function MarketingHero() {
  const reduce = useReducedMotion();

  return (
    <section className="relative min-h-[min(92vh,880px)] overflow-hidden border-b border-border/50">
      {/* Animated mesh gradient */}
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
            radial-gradient(ellipse 80% 50% at 20% 20%, hsl(var(--primary) / 0.35), transparent 50%),
            radial-gradient(ellipse 60% 40% at 80% 10%, hsl(var(--chart-2) / 0.28), transparent 45%),
            radial-gradient(ellipse 50% 60% at 70% 80%, hsl(188 72% 35% / 0.2), transparent 50%),
            radial-gradient(circle at 50% 50%, hsl(224 32% 12%), hsl(224 36% 6%))
          `,
        }}
      />

      {/* Moving grid */}
      <div className="torqa-hero-grid pointer-events-none absolute inset-0 opacity-[0.35]" aria-hidden />

      {/* Glowing orbs */}
      {!reduce && (
        <>
          <motion.div
            className="pointer-events-none absolute -left-20 top-1/4 h-72 w-72 rounded-full bg-primary/25 blur-[100px]"
            animate={{ x: [0, 40, 0], y: [0, 20, 0], scale: [1, 1.08, 1] }}
            transition={{ duration: 12, repeat: Infinity, ease: "easeInOut" }}
            aria-hidden
          />
          <motion.div
            className="pointer-events-none absolute -right-16 top-1/3 h-64 w-64 rounded-full bg-chart-2/20 blur-[90px]"
            animate={{ x: [0, -30, 0], y: [0, 40, 0] }}
            transition={{ duration: 14, repeat: Infinity, ease: "easeInOut" }}
            aria-hidden
          />
          <motion.div
            className="pointer-events-none absolute bottom-0 left-1/3 h-48 w-48 rounded-full bg-chart-4/15 blur-[70px]"
            animate={{ opacity: [0.4, 0.7, 0.4] }}
            transition={{ duration: 6, repeat: Infinity }}
            aria-hidden
          />
        </>
      )}

      <div className="relative z-10 mx-auto max-w-6xl px-6 pb-16 pt-16 sm:px-8 sm:pb-20 sm:pt-20 lg:pt-24">
        <motion.div
          initial={reduce ? false : { opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <Badge className="w-fit border-primary/40 bg-primary/15 px-3 py-1 text-primary shadow-[0_0_24px_-4px_hsl(var(--primary)/0.5)]">
            <Sparkles className="mr-1.5 h-3.5 w-3.5" />
            Scan Engine v1 • deterministic workflow security analysis
          </Badge>
        </motion.div>

        <div className="mt-8 grid gap-12 lg:grid-cols-[1.08fr_0.92fr] lg:items-center lg:gap-10">
          <div className="space-y-7">
            <motion.h1
              className="text-balance text-4xl font-semibold tracking-tight sm:text-5xl lg:text-[3.25rem] lg:leading-[1.08]"
              initial={reduce ? false : { opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.55, delay: 0.06 }}
            >
              Ship automation faster with{" "}
              <span className="bg-gradient-to-r from-primary via-cyan-300 to-primary bg-clip-text text-transparent">
                security confidence
              </span>
              .
            </motion.h1>
            <motion.p
              className="max-w-2xl text-base leading-relaxed text-muted-foreground sm:text-lg"
              initial={reduce ? false : { opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.55, delay: 0.12 }}
            >
              Torqa gives automation teams deterministic findings, transparent trust scoring, and remediation-ready
              reports for every workflow scan.
            </motion.p>

            <motion.div
              className="flex flex-wrap gap-4"
              initial={reduce ? false : { opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.18 }}
            >
              {heroStats.map((s) => (
                <div
                  key={s.label}
                  className="rounded-2xl border border-border/60 bg-card/40 px-5 py-3 shadow-lg shadow-black/20 ring-1 ring-white/[0.04] backdrop-blur-md"
                >
                  <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">{s.label}</p>
                  <p className="mt-1 text-2xl font-semibold text-foreground sm:text-3xl">
                    <AnimatedCounter to={s.value} suffix={s.suffix} />
                  </p>
                </div>
              ))}
            </motion.div>

            <motion.div
              className="flex flex-wrap gap-3"
              initial={reduce ? false : { opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.22 }}
            >
              <motion.div whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.98 }} className="relative">
                <div className="pointer-events-none absolute -inset-0.5 rounded-lg bg-gradient-to-r from-primary/50 to-cyan-400/40 opacity-70 blur-md" />
                <Button asChild size="lg" className="relative gap-2 shadow-xl shadow-primary/25">
                  <Link href="/scan">
                    Try Live Demo
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                </Button>
              </motion.div>
              <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                <Button asChild size="lg" variant="outline" className="gap-2 border-border/80 bg-background/50 backdrop-blur">
                  <Link href={githubUrl} target="_blank" rel="noreferrer">
                    <GitBranch className="h-4 w-4" />
                    View GitHub
                    <ArrowUpRight className="h-3.5 w-3.5" />
                  </Link>
                </Button>
              </motion.div>
            </motion.div>

            <motion.div
              className="flex flex-wrap gap-2"
              initial={reduce ? false : { opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.35 }}
            >
              {trustBadges.map((b) => (
                <span
                  key={b}
                  className="inline-flex items-center gap-1.5 rounded-full border border-border/70 bg-muted/30 px-3 py-1 text-xs font-medium text-muted-foreground ring-1 ring-white/[0.03]"
                >
                  <Shield className="h-3 w-3 text-primary/90" aria-hidden />
                  {b}
                </span>
              ))}
            </motion.div>

            <p className="text-xs text-muted-foreground sm:text-sm">
              Trusted by teams building on modern automation stacks • No black-box scoring • Explainable findings
            </p>
          </div>

          {/* Floating dashboard visuals */}
          <div className="relative mx-auto min-h-[420px] w-full max-w-lg lg:mx-0 lg:max-w-none lg:min-h-[480px]">
            <FloatingCard className="right-0 top-0 z-30 lg:right-4" delay={0.25}>
              <Card className="border-border/60 bg-card/80 shadow-2xl shadow-black/40 ring-1 ring-primary/15 backdrop-blur-xl">
                <CardHeader className="space-y-1 pb-2">
                  <div className="flex items-center gap-2">
                    <Zap className="h-4 w-4 text-amber-400" />
                    <CardTitle className="text-sm">Live scan pulse</CardTitle>
                  </div>
                  <CardDescription className="text-xs">Engine preview · server-side</CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex items-center justify-between rounded-lg border border-border/60 bg-background/60 px-3 py-2">
                    <span className="text-xs text-muted-foreground">Status</span>
                    <Badge className="border-emerald-500/40 bg-emerald-500/15 text-emerald-200">PASS</Badge>
                  </div>
                  <div className="h-1.5 overflow-hidden rounded-full bg-muted">
                    <motion.div
                      className="h-full rounded-full bg-gradient-to-r from-primary to-cyan-400"
                      initial={{ width: "12%" }}
                      animate={{ width: ["12%", "92%", "76%", "92%"] }}
                      transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
                    />
                  </div>
                </CardContent>
              </Card>
            </FloatingCard>

            <FloatingCard className="left-0 top-[38%] z-20 lg:left-0" delay={0.45}>
              <Card className="border-border/60 bg-card/75 shadow-xl ring-1 ring-white/[0.06] backdrop-blur-xl">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">Trust index</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-end justify-between gap-2">
                    <span className="text-3xl font-semibold tabular-nums text-foreground">84</span>
                    <LayoutDashboard className="mb-1 h-8 w-8 text-primary/40" aria-hidden />
                  </div>
                  <p className="mt-1 text-[10px] uppercase tracking-wider text-muted-foreground">Risk-aware posture</p>
                </CardContent>
              </Card>
            </FloatingCard>

            <FloatingCard className="right-4 top-[58%] z-10 hidden sm:block lg:right-8" delay={0.6}>
              <Card className="border-primary/25 bg-gradient-to-br from-primary/10 to-transparent shadow-lg ring-1 ring-primary/20 backdrop-blur-md">
                <CardContent className="p-4 text-xs text-muted-foreground">
                  <p className="font-medium text-foreground">Governance layer</p>
                  <p className="mt-1 leading-relaxed">Policy templates evaluate every scan for team standards.</p>
                </CardContent>
              </Card>
            </FloatingCard>
          </div>
        </div>
      </div>
    </section>
  );
}
