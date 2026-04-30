"use client";

import { motion } from "framer-motion";

const STATS = [
  { value: "99.97", unit: "%",  label: "Decision accuracy" },
  { value: "340",   unit: "ms", label: "Median gate latency" },
  { value: "12.4",  unit: "k",  label: "Active workflows" },
  { value: "2.1",   unit: "M",  label: "Decisions / month" },
];

export function LandingMetricsBand() {
  return (
    <section id="metrics" className="bg-[#06080b] px-10 py-20">
      <div
        className="mx-auto max-w-[1200px] overflow-hidden border-y border-[#161b22] [grid-template-columns:repeat(2,1fr)] sm:[grid-template-columns:repeat(4,1fr)]"
        style={{ display: "grid", gap: "1px", background: "#161b22" }}
      >
        {STATS.map((s, i) => (
          <motion.div
            key={s.label}
            className="bg-[#06080b] px-7 py-6"
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1], delay: i * 0.08 }}
          >
            <div
              className="text-[44px] font-semibold leading-none tracking-[-0.04em] tabular-nums"
              style={{
                background: "linear-gradient(180deg,#fff,#8a96a6)",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
                backgroundClip: "text",
              }}
            >
              {s.value}
              <span style={{ fontSize: 22, color: "#67e8f9", WebkitTextFillColor: "#67e8f9" }}>
                {s.unit}
              </span>
            </div>
            <div className="mt-1.5 font-mono text-[11px] uppercase tracking-[0.12em] text-[#5a6470]">
              {s.label}
            </div>
          </motion.div>
        ))}
      </div>
    </section>
  );
}
