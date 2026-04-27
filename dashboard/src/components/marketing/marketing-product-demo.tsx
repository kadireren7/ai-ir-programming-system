"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { Activity, Radar, ShieldAlert } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { demoFindings } from "@/lib/marketing-content";
import { cn } from "@/lib/utils";

const RISK_TARGETS = [74, 62, 88];

export function MarketingProductDemo() {
  const reduce = useReducedMotion();
  const [phase, setPhase] = useState(0);
  const [visibleCount, setVisibleCount] = useState(0);
  const risk = RISK_TARGETS[phase % RISK_TARGETS.length];

  useEffect(() => {
    if (reduce) {
      setVisibleCount(demoFindings.length);
      return;
    }
    const id = window.setInterval(() => {
      setPhase((p) => (p + 1) % 4);
    }, 2400);
    return () => window.clearInterval(id);
  }, [reduce]);

  useEffect(() => {
    if (reduce) return;
    setVisibleCount(0);
    let i = 0;
    const step = window.setInterval(() => {
      i += 1;
      setVisibleCount(i);
      if (i >= demoFindings.length) window.clearInterval(step);
    }, 280);
    return () => window.clearInterval(step);
  }, [phase, reduce]);

  return (
    <div className="relative">
      <div className="pointer-events-none absolute -inset-4 rounded-[2rem] bg-gradient-to-br from-primary/20 via-transparent to-chart-2/15 blur-2xl" aria-hidden />
      <Card className="relative overflow-hidden border-border/60 bg-card/85 shadow-2xl ring-1 ring-white/[0.06] backdrop-blur-xl">
        <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-primary/50 to-transparent" />
        <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-3 border-b border-border/50 bg-muted/20 pb-4">
          <div className="flex items-center gap-3">
            <div className="flex gap-1.5">
              <span className="h-2.5 w-2.5 rounded-full bg-rose-500/80" />
              <span className="h-2.5 w-2.5 rounded-full bg-amber-400/80" />
              <span className="h-2.5 w-2.5 rounded-full bg-emerald-500/80" />
            </div>
            <div>
              <CardTitle className="text-base">Dashboard preview</CardTitle>
              <CardDescription className="text-xs">Illustrative UI — connect your workspace for live data</CardDescription>
            </div>
          </div>
          <motion.div
            className="relative"
            animate={reduce ? {} : { scale: [1, 1.05, 1] }}
            transition={{ duration: 2, repeat: Infinity }}
          >
            <span className="absolute inset-0 rounded-md bg-primary/30 blur-md" />
            <Badge className="relative border-primary/40 bg-primary/20 text-primary-foreground">
              <Radar className="mr-1 h-3 w-3" aria-hidden />
              Scanning
            </Badge>
          </motion.div>
        </CardHeader>
        <CardContent className="grid gap-6 p-6 pt-6 lg:grid-cols-[1fr_1.1fr]">
          <div className="space-y-4">
            <div className="rounded-xl border border-border/60 bg-background/50 p-4">
              <div className="mb-3 flex items-center justify-between">
                <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Trust index</span>
                <Activity className="h-4 w-4 text-primary" aria-hidden />
              </div>
              <motion.p
                key={risk}
                className="text-4xl font-semibold tabular-nums tracking-tight text-foreground"
                initial={{ opacity: 0.5, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ type: "spring", stiffness: 200, damping: 18 }}
              >
                {risk}
              </motion.p>
              <div className="mt-3 h-2 overflow-hidden rounded-full bg-muted">
                <motion.div
                  className="h-full rounded-full bg-gradient-to-r from-rose-500 via-amber-400 to-emerald-400"
                  animate={{ width: `${Math.min(100, Math.max(8, risk))}%` }}
                  transition={{ type: "spring", stiffness: 120, damping: 18 }}
                />
              </div>
            </div>
            <div className="rounded-xl border border-border/60 bg-background/40 p-4">
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Outcome mix</p>
              <div className="mt-3 flex h-24 items-end gap-2">
                {[40, 65, 52, 78, 48, 90, 72].map((h, i) => (
                  <motion.div
                    key={`${phase}-${i}`}
                    className="flex-1 rounded-t-md bg-gradient-to-t from-primary/60 to-primary/20"
                    initial={{ height: 4 }}
                    animate={{ height: Math.max(6, (h / 100) * 88) }}
                    transition={{ delay: i * 0.05, type: "spring", stiffness: 200, damping: 18 }}
                  />
                ))}
              </div>
            </div>
          </div>
          <div className="space-y-2 rounded-xl border border-border/60 bg-background/50 p-4">
            <div className="mb-2 flex items-center gap-2 text-xs text-muted-foreground">
              <ShieldAlert className="h-3.5 w-3.5" aria-hidden />
              Findings stream
            </div>
            <AnimatePresence initial={false}>
              {demoFindings.slice(0, visibleCount).map((f, i) => (
                <motion.div
                  key={`${phase}-${i}-${f.label}`}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 8 }}
                  transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
                  className="flex items-center justify-between rounded-lg border border-border/50 bg-card/70 px-3 py-2.5"
                >
                  <span className="text-sm text-foreground">{f.label}</span>
                  <Badge
                    className={cn(
                      f.severity === "critical" && "border-rose-500/40 bg-rose-500/10 text-rose-200",
                      f.severity === "review" && "border-amber-500/40 bg-amber-500/10 text-amber-200",
                      f.severity === "info" && "border-slate-500/40 bg-slate-500/10 text-slate-200"
                    )}
                  >
                    {f.severity}
                  </Badge>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
