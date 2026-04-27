"use client";

import Link from "next/link";
import { Fragment } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { Bell, CalendarClock, ChevronDown, ChevronRight, Link2, Shield } from "lucide-react";
import { cn } from "@/lib/utils";

const stages = [
  { label: "Connect source", sub: "n8n · library · API", icon: Link2, href: "/integrations" },
  { label: "Scheduled scan", sub: "On your cadence", icon: CalendarClock, href: "/schedules" },
  { label: "Policy gate", sub: "PASS · WARN · FAIL", icon: Shield, href: "/policies" },
  { label: "Alert", sub: "Slack · email · in-app", icon: Bell, href: "/alerts" },
] as const;

export function MarketingGovernancePipeline() {
  const reduce = useReducedMotion();
  return (
    <div className="mx-auto max-w-5xl px-6 py-12 sm:px-8 sm:py-16 lg:py-20">
      <div className="flex flex-col items-stretch gap-4 md:flex-row md:items-center md:justify-center md:gap-2 lg:gap-4">
        {stages.map((stage, i) => {
          const Icon = stage.icon;
          return (
            <Fragment key={stage.label}>
              <motion.div
                initial={reduce ? false : { opacity: 0, y: 14 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-30px" }}
                transition={{ delay: 0.07 * i, duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
                className="md:flex-1 md:min-w-0"
              >
                <Link
                  href={stage.href}
                  className={cn(
                    "group block rounded-2xl border border-border/50 bg-card/35 p-6 shadow-lg shadow-black/25 ring-1 ring-white/[0.04] backdrop-blur-sm",
                    "transition-colors hover:border-primary/35 hover:bg-card/55"
                  )}
                >
                  <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl border border-primary/25 bg-primary/10 text-primary transition-transform group-hover:scale-105">
                    <Icon className="h-5 w-5" aria-hidden />
                  </div>
                  <p className="text-sm font-semibold tracking-tight text-foreground">{stage.label}</p>
                  <p className="mt-1 text-xs text-muted-foreground">{stage.sub}</p>
                </Link>
              </motion.div>
              {i < stages.length - 1 ? (
                <motion.div
                  className="flex justify-center py-1 text-primary/35 md:py-0 md:px-1"
                  initial={reduce ? false : { opacity: 0, scale: 0.8 }}
                  whileInView={{ opacity: 1, scale: 1 }}
                  viewport={{ once: true }}
                  transition={{ delay: 0.1 + i * 0.08, duration: 0.35 }}
                  aria-hidden
                >
                  <ChevronDown className="h-5 w-5 md:hidden" />
                  <ChevronRight className="hidden h-5 w-5 md:block" />
                </motion.div>
              ) : null}
            </Fragment>
          );
        })}
      </div>
    </div>
  );
}
