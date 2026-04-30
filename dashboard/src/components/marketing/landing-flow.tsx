"use client";

import { motion } from "framer-motion";
import { SectionHeader } from "@/components/ui/section-header";

const SOURCES = ["n8n cloud", "github / actions", "webhook ingress", "agent runtime"];
const TARGETS = ["production runtime", "staging deploys", "review queue", "audit log"];

function FlowArrow({ delay }: { delay: number }) {
  return (
    <motion.div
      className="flex items-center justify-center md:flex-none"
      initial={{ opacity: 0 }}
      whileInView={{ opacity: 1 }}
      viewport={{ once: true }}
      transition={{ duration: 0.6, delay }}
    >
      {/* horizontal on md+, vertical on mobile */}
      <div className="relative h-10 w-px bg-gradient-to-b from-[#161b22] via-[#22d3ee] to-[#161b22] md:h-px md:w-10 md:bg-gradient-to-r">
        <span
          className="absolute bottom-0 left-[-3px] border-t-[6px] border-x-[3px] border-t-[#22d3ee] border-x-transparent md:bottom-auto md:left-auto md:right-0 md:top-[-3px] md:border-l-[6px] md:border-y-[3px] md:border-l-[#22d3ee] md:border-y-transparent md:border-t-0"
        />
      </div>
    </motion.div>
  );
}

function FlowNode({
  label,
  title,
  items,
  center = false,
  delay,
}: {
  label: string;
  title: string;
  items: string[];
  center?: boolean;
  delay: number;
}) {
  return (
    <motion.div
      className="rounded-xl border p-6 transition-colors"
      style={
        center
          ? {
              background: "linear-gradient(180deg,rgba(34,211,238,0.06),rgba(34,211,238,0.01))",
              borderColor: "rgba(34,211,238,0.35)",
              boxShadow: "0 0 60px rgba(34,211,238,0.08), inset 0 1px 0 rgba(34,211,238,0.1)",
            }
          : { background: "#0a0d12", borderColor: "#161b22" }
      }
      initial={{ opacity: 0, y: 32 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-40px" }}
      transition={{ duration: 0.9, ease: [0.16, 1, 0.3, 1], delay }}
    >
      <div
        className="mb-2.5 font-mono text-[10px] uppercase tracking-[0.12em]"
        style={{ color: center ? "#67e8f9" : "#5a6470" }}
      >
        {label}
      </div>
      <h4 className="mb-1.5 text-[16px] font-semibold leading-snug tracking-[-0.01em] text-[#f0f3f7]">
        {title}
      </h4>
      <div className="mt-3 flex flex-col gap-1.5">
        {items.map(item => (
          <div
            key={item}
            className="flex items-center gap-2 rounded-md border px-2.5 py-[6px] font-mono text-[11px]"
            style={
              center && item.startsWith("policy")
                ? { color: "#67e8f9", borderColor: "rgba(34,211,238,0.2)", background: "rgba(34,211,238,0.04)" }
                : { color: "#a8b1bd", borderColor: "#161b22", background: "rgba(255,255,255,0.02)" }
            }
          >
            <span
              className="h-[5px] w-[5px] rounded-full"
              style={{ background: center && item.startsWith("policy") ? "#22d3ee" : "#3b4754" }}
            />
            {item}
          </div>
        ))}
      </div>
    </motion.div>
  );
}

export function LandingFlow() {
  return (
    <section
      id="flow"
      className="relative px-10 py-[140px]"
      style={{ background: "linear-gradient(180deg, transparent, rgba(34,211,238,0.02) 50%, transparent)" }}
    >
      <div className="mx-auto max-w-[1200px]">
        <SectionHeader
          eyebrow="Architecture"
          title="Above your stack, not inside it."
          subtitle="Torqa observes and gates without touching execution paths. Drop in a webhook, leave your runtime alone."
        />

        {/* mobile: stack vertically; md+: 3-column horizontal */}
        <div className="mx-auto flex max-w-[1100px] flex-col items-stretch gap-4 py-16 md:flex-row md:items-center md:gap-6">
          <div className="flex-1">
            <FlowNode label="01 · Sources" title="Where workflows live" items={SOURCES} delay={0} />
          </div>
          <FlowArrow delay={0.1} />
          <div className="flex-1">
            <FlowNode
              label="02 · Torqa gate"
              title="Inspect → policy → decision"
              items={["policy.evaluate()", "4 checks · 0.34s"]}
              center
              delay={0.16}
            />
          </div>
          <FlowArrow delay={0.24} />
          <div className="flex-1">
            <FlowNode label="03 · Targets" title="What we approve into" items={TARGETS} delay={0.32} />
          </div>
        </div>
      </div>
    </section>
  );
}
