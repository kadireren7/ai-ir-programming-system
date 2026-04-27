"use client";

import { motion, useReducedMotion } from "framer-motion";

const rows = [
  { k: "Source", v: "n8n connected", tone: "ok" as const },
  { k: "Schedule", v: "Daily scan", tone: "ok" as const },
  { k: "Policy", v: "n8n production", tone: "neutral" as const },
  { k: "Alert", v: "Slack on FAIL", tone: "warn" as const },
];

export function MarketingDemoStrip() {
  const reduce = useReducedMotion();
  return (
    <div className="mx-auto max-w-3xl px-6 sm:px-8">
      <motion.div
        className="overflow-hidden rounded-2xl border border-border/50 bg-gradient-to-br from-card/80 to-muted/[0.15] shadow-inner ring-1 ring-white/[0.04]"
        initial={reduce ? false : { opacity: 0, y: 12 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.5 }}
      >
        <div className="border-b border-border/40 px-5 py-3">
          <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">Live posture</p>
        </div>
        <ul className="divide-y divide-border/40">
          {rows.map((row, i) => (
            <motion.li
              key={row.k}
              className="flex items-center justify-between gap-4 px-5 py-4"
              initial={reduce ? false : { opacity: 0, x: -8 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.06 * i, duration: 0.35 }}
            >
              <span className="text-xs font-medium text-muted-foreground">{row.k}</span>
              <span className="flex items-center gap-2 text-sm text-foreground">
                <span
                  className={
                    row.tone === "ok"
                      ? "h-2 w-2 rounded-full bg-emerald-400 shadow-[0_0_8px_hsl(142_71%_45%/0.6)]"
                      : row.tone === "warn"
                        ? "h-2 w-2 rounded-full bg-amber-400 shadow-[0_0_8px_hsl(38_92%_50%/0.5)]"
                        : "h-2 w-2 rounded-full bg-primary/70"
                  }
                  aria-hidden
                />
                {row.v}
              </span>
            </motion.li>
          ))}
        </ul>
      </motion.div>
    </div>
  );
}
