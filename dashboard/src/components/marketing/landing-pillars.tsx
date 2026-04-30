"use client";

import { motion } from "framer-motion";
import { SectionHeader } from "@/components/ui/section-header";

const PILLARS = [
  {
    num: "01 / Inspect",
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
        <circle cx="11" cy="11" r="7"/><line x1="20" y1="20" x2="16.5" y2="16.5"/>
        <line x1="11" y1="8" x2="11" y2="14"/><line x1="8" y1="11" x2="14" y2="11"/>
      </svg>
    ),
    title: "Static analysis, by design.",
    desc: "Every workflow JSON is parsed against a deterministic ruleset — no probabilistic scoring, no opaque models. You see exactly which rule fired and why.",
  },
  {
    num: "02 / Govern",
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
      </svg>
    ),
    title: "Policies as gates.",
    desc: "Compose strict, default, or custom policies. Enforce them in CI, on schedule, or as a webhook gate before runs ever reach production.",
  },
  {
    num: "03 / Approve",
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
        <polyline points="20 6 9 17 4 12"/>
      </svg>
    ),
    title: "Human in the loop, when it matters.",
    desc: "Borderline cases route to your reviewers with full context — diff, finding, severity, history. Decisions become signed records, not Slack messages.",
  },
];

export function LandingPillars() {
  return (
    <section id="pillars" className="relative bg-[#06080b] px-5 py-20 sm:px-10 sm:py-[140px]">
      <div className="mx-auto max-w-[1200px]">
        <SectionHeader
          eyebrow="Platform"
          title="A single gate for every automation system you run."
          subtitle="Torqa sits above your tools — not inside them. Connect a source and we begin scanning every workflow, run, and version against deterministic rules you control."
        />

        {/* gap:1px + background trick creates hairline dividers between cells */}
        <div
          className="grid overflow-hidden rounded-2xl border border-[#161b22] [grid-template-columns:1fr] md:[grid-template-columns:repeat(3,1fr)]"
          style={{ gap: "1px", background: "#161b22" }}
        >
          {PILLARS.map((p, i) => (
            <motion.div
              key={p.num}
              className="group relative bg-[#0a0d12] px-9 pb-11 pt-10 transition-colors hover:bg-[#0e131a]"
              initial={{ opacity: 0, y: 40 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-40px" }}
              transition={{ duration: 0.9, ease: [0.16, 1, 0.3, 1], delay: i * 0.08 }}
            >
              <div className="mb-[26px] font-mono text-[11px] tracking-[0.1em] text-[#3b4754]">{p.num}</div>
              <div
                className="mb-[22px] flex h-11 w-11 items-center justify-center rounded-[10px] border text-[#67e8f9]"
                style={{
                  background: "linear-gradient(180deg,rgba(34,211,238,0.08),rgba(34,211,238,0.02))",
                  borderColor: "rgba(34,211,238,0.2)",
                  boxShadow: "inset 0 1px 0 rgba(255,255,255,0.05)",
                }}
              >
                {p.icon}
              </div>
              <h3 className="mb-2.5 text-[22px] font-semibold leading-snug tracking-[-0.02em] text-[#f0f3f7]">
                {p.title}
              </h3>
              <p className="text-[14px] leading-[1.6] text-[#a8b1bd]">{p.desc}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
