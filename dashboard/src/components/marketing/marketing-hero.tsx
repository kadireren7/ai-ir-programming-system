"use client";

import { useRef } from "react";
import Link from "next/link";
import { motion, useMotionValue, useSpring, useReducedMotion } from "framer-motion";

const WORKFLOWS = [
  { name: "handoff_production_v3", meta: "github · strict policy", source: "n8n",     score: "94 / 100", status: "APPROVED", pass: true  },
  { name: "customer_support_n8n",  meta: "n8n · default policy",   source: "n8n",     score: "72 / 100", status: "REVIEW",   pass: false },
  { name: "onboarding_flow_v2",    meta: "n8n · default policy",   source: "webhook", score: "88 / 100", status: "APPROVED", pass: true  },
  { name: "billing_automation",    meta: "webhook · enterprise",    source: "webhook", score: "91 / 100", status: "APPROVED", pass: true  },
];

const METRICS = [
  { label: "Approved",       value: "2,847", color: "#67e8f9", spark: "0,16 14,12 28,14 42,8 56,10 70,6 84,8 100,4",    stroke: "#22d3ee" },
  { label: "Held for review",value: "128",   color: "#f0f3f7", spark: "0,12 14,14 28,10 42,12 56,14 70,11 84,13 100,11", stroke: "#a8b1bd" },
  { label: "Rejected",       value: "7",     color: "#fb7185", spark: "0,18 14,17 28,18 42,14 56,16 70,15 84,12 100,10", stroke: "#fb7185" },
];

function CornerMark({ pos }: { pos: "tl" | "tr" | "bl" | "br" }) {
  const cls = {
    tl: "top-[-6px] left-[-6px] border-r-0 border-b-0",
    tr: "top-[-6px] right-[-6px] border-l-0 border-b-0",
    bl: "bottom-[-6px] left-[-6px] border-r-0 border-t-0",
    br: "bottom-[-6px] right-[-6px] border-l-0 border-t-0",
  }[pos];
  return <span className={`absolute h-3 w-3 border border-[#22d3ee] opacity-50 ${cls}`} aria-hidden />;
}

export function MarketingHero() {
  const reduce = useReducedMotion();
  const wrapRef = useRef<HTMLDivElement>(null);
  const rotX = useMotionValue(22);
  const rotY = useMotionValue(-2);
  const springX = useSpring(rotX, { stiffness: 80, damping: 20 });
  const springY = useSpring(rotY, { stiffness: 80, damping: 20 });

  function onMouseMove(e: React.MouseEvent) {
    if (reduce || !wrapRef.current) return;
    const r = wrapRef.current.getBoundingClientRect();
    rotX.set(22 - ((e.clientY - r.top) / r.height - 0.5) * 8);
    rotY.set(-2 + ((e.clientX - r.left) / r.width - 0.5) * 10);
  }

  function onMouseLeave() {
    rotX.set(22);
    rotY.set(-2);
  }

  return (
    <section className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden bg-[#06080b] px-5 pb-16 pt-28 sm:px-10 sm:pb-20 sm:pt-32">
      {/* moving grid */}
      <div className="tr-grid pointer-events-none absolute inset-0" aria-hidden />

      {/* glow blobs */}
      <div
        className="pointer-events-none absolute left-1/2 top-[60%] h-[600px] w-[800px] -translate-x-1/2 -translate-y-1/2 blur-[60px]"
        style={{ background: "radial-gradient(ellipse, rgba(34,211,238,0.18), transparent 60%)" }}
        aria-hidden
      />
      <div
        className="pointer-events-none absolute bottom-[10%] right-[10%] h-[400px] w-[400px] blur-[80px]"
        style={{ background: "radial-gradient(circle, rgba(244,63,94,0.10), transparent 60%)" }}
        aria-hidden
      />

      {/* eyebrow */}
      <motion.div
        className="mb-8 flex items-center gap-2 rounded-full border border-[#1f2630] bg-[rgba(10,13,18,0.6)] px-3 py-1.5 backdrop-blur-md"
        initial={reduce ? false : { opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, delay: 0.2 }}
      >
        <span
          className="h-1.5 w-1.5 rounded-full bg-[#22d3ee]"
          style={{ boxShadow: "0 0 10px #22d3ee", animation: "tr-pulse 2s ease-in-out infinite" }}
        />
        <span className="font-mono text-[11px] uppercase tracking-[0.08em] text-[#a8b1bd]">
          Live · governing 12,408 workflows now
        </span>
      </motion.div>

      {/* headline */}
      <motion.h1
        className="mb-6 max-w-[1100px] text-center font-bold leading-[0.98] tracking-[-0.045em]"
        style={{
          fontSize: "clamp(48px, 8vw, 96px)",
          background: "linear-gradient(180deg, #ffffff 0%, #ffffff 50%, #8a96a6 100%)",
          WebkitBackgroundClip: "text",
          WebkitTextFillColor: "transparent",
          backgroundClip: "text",
        }}
        initial={reduce ? false : { opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 1, delay: 0.35 }}
      >
        The control layer
        <br />
        for{" "}
        <span
          style={{
            background: "linear-gradient(180deg, #67e8f9, #0891b2)",
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
            backgroundClip: "text",
            fontStyle: "italic",
            fontWeight: 600,
          }}
        >
          every
        </span>{" "}
        automation
      </motion.h1>

      {/* sub */}
      <motion.p
        className="mb-11 max-w-[580px] text-center leading-[1.5] text-[#a8b1bd]"
        style={{ fontSize: "clamp(15px, 1.4vw, 19px)" }}
        initial={reduce ? false : { opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 1, delay: 0.5 }}
      >
        Torqa inspects, governs, and approves workflows the moment they&apos;re authored — across n8n,
        GitHub, agents, and webhooks. One gate. Deterministic decisions.
      </motion.p>

      {/* CTA */}
      <motion.div
        className="mb-12 flex flex-wrap justify-center gap-3 sm:mb-20"
        initial={reduce ? false : { opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 1, delay: 0.65 }}
      >
        <Link
          href="/login"
          className="flex items-center gap-1.5 rounded-md bg-[#22d3ee] px-5 py-2.5 text-[14px] font-semibold text-[#06080b] transition-[box-shadow,transform] hover:-translate-y-px hover:shadow-[0_0_24px_rgba(34,211,238,0.4)]"
        >
          Get started →
        </Link>
        <Link
          href="/demo/report"
          className="flex items-center rounded-md border border-[#1f2630] px-5 py-2.5 text-[14px] font-medium text-[#f0f3f7] transition-colors hover:border-[#5a6470] hover:bg-[rgba(255,255,255,0.02)]"
        >
          See it run
        </Link>
      </motion.div>

      {/* 3-D stage — hidden on very small screens to avoid overflow */}
      <motion.div
        ref={wrapRef}
        className="relative hidden sm:block"
        style={{ perspective: "2000px" }}
        onMouseMove={onMouseMove}
        onMouseLeave={onMouseLeave}
        initial={reduce ? false : { opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 1.4, delay: 0.9 }}
      >
        <motion.div
          style={{
            width: "min(960px, 90vw)",
            height: 480,
            transformStyle: "preserve-3d",
            rotateX: reduce ? 22 : springX,
            rotateY: reduce ? -2 : springY,
            position: "relative",
          }}
        >
          <CornerMark pos="tl" />
          <CornerMark pos="tr" />
          <CornerMark pos="bl" />
          <CornerMark pos="br" />

          {/* Layer 1 — workflow table */}
          <div
            className="absolute inset-0 overflow-hidden rounded-[14px] border border-[#161b22]"
            style={{
              background: "linear-gradient(180deg,rgba(14,19,26,0.95),rgba(10,13,18,0.95))",
              backdropFilter: "blur(8px)",
              boxShadow: "0 20px 80px rgba(0,0,0,0.5)",
              transform: "translateZ(0px)",
            }}
          >
            <div
              className="pointer-events-none absolute inset-x-0 h-0.5 bg-gradient-to-r from-transparent via-[#67e8f9] to-transparent"
              style={{ boxShadow: "0 0 16px #22d3ee", animation: "tr-scan 5s ease-in-out infinite" }}
              aria-hidden
            />
            <div className="flex items-center justify-between border-b border-[#161b22] px-[22px] py-3.5">
              <div className="flex items-center gap-3">
                <div className="flex gap-1.5">
                  {[0,1,2].map(i => <span key={i} className="h-2 w-2 rounded-full bg-[#1f2630]" />)}
                </div>
                <span className="ml-3 font-mono text-[11px] tracking-[0.06em] text-[#5a6470]">
                  torqa://workflows/active
                </span>
              </div>
              <div className="flex items-center gap-1.5 rounded-full border border-[rgba(34,211,238,0.2)] bg-[rgba(34,211,238,0.08)] px-2.5 py-[3px]">
                <span
                  className="h-[5px] w-[5px] rounded-full bg-[#22d3ee]"
                  style={{ boxShadow: "0 0 8px #22d3ee", animation: "tr-pulse 1.5s ease-in-out infinite" }}
                />
                <span className="font-mono text-[10px] text-[#67e8f9]">LIVE · 6 SCANNING</span>
              </div>
            </div>
            <div className="flex flex-col gap-2.5 p-[18px_22px]">
              {WORKFLOWS.map(wf => (
                <div
                  key={wf.name}
                  className="grid items-center gap-4 rounded-lg border px-3.5 py-2.5 text-[12px]"
                  style={{
                    gridTemplateColumns: "1fr 80px 90px 100px",
                    background: wf.pass ? "rgba(34,211,238,0.04)" : "rgba(244,63,94,0.06)",
                    borderColor: wf.pass ? "rgba(34,211,238,0.25)" : "rgba(244,63,94,0.35)",
                  }}
                >
                  <div>
                    <div className="font-mono text-[12px] text-[#f0f3f7]">{wf.name}</div>
                    <div className="text-[11px] text-[#5a6470]">{wf.meta}</div>
                  </div>
                  <div className="text-[11px] text-[#5a6470]">{wf.source}</div>
                  <div className="font-mono tabular-nums text-[#f0f3f7]">{wf.score}</div>
                  <div
                    className="flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-[0.08em]"
                    style={{ color: wf.pass ? "#67e8f9" : "#fb7185" }}
                  >
                    <span
                      className="h-1.5 w-1.5 rounded-full"
                      style={{
                        background: wf.pass ? "#22d3ee" : "#f43f5e",
                        boxShadow: wf.pass ? "0 0 6px #22d3ee" : "0 0 6px #f43f5e",
                      }}
                    />
                    {wf.status}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Layer 2 — metrics */}
          <div
            className="absolute overflow-hidden rounded-[14px] border border-[#161b22]"
            style={{
              top: 30, left: 60, right: 60, height: 360,
              transform: "translateZ(80px)",
              background: "linear-gradient(180deg,rgba(14,19,26,0.95),rgba(10,13,18,0.95))",
              backdropFilter: "blur(8px)",
              boxShadow: "0 20px 80px rgba(0,0,0,0.5)",
            }}
          >
            <div className="p-[18px_22px]">
              <div className="mb-3.5 flex items-center justify-between">
                <span className="text-[13px] font-medium text-[#f0f3f7]">Run telemetry · last 24h</span>
                <div className="flex items-center gap-1.5 rounded-full border border-[rgba(34,211,238,0.2)] bg-[rgba(34,211,238,0.08)] px-2.5 py-[3px]">
                  <span
                    className="h-[5px] w-[5px] rounded-full bg-[#22d3ee]"
                    style={{ boxShadow: "0 0 8px #22d3ee", animation: "tr-pulse 1.5s ease-in-out infinite" }}
                  />
                  <span className="font-mono text-[10px] text-[#67e8f9]">STREAMING</span>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-3">
                {METRICS.map(m => (
                  <div key={m.label} className="rounded-lg border border-[#161b22] bg-[rgba(255,255,255,0.02)] p-[12px_14px]">
                    <div className="mb-1 font-mono text-[9px] uppercase tracking-[0.12em] text-[#5a6470]">{m.label}</div>
                    <div className="text-2xl font-semibold tabular-nums" style={{ color: m.color }}>{m.value}</div>
                    <svg className="mt-2 block w-full" height="20" viewBox="0 0 100 20" preserveAspectRatio="none" aria-hidden>
                      <polyline points={m.spark} fill="none" stroke={m.stroke} strokeWidth="1.2" />
                    </svg>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Layer 3 — decision orb */}
          <div
            className="absolute overflow-hidden rounded-[14px] border border-[#161b22]"
            style={{
              top: 70, left: 140, right: 140, height: 200,
              transform: "translateZ(160px)",
              background: "linear-gradient(180deg,rgba(14,19,26,0.95),rgba(10,13,18,0.95))",
              backdropFilter: "blur(8px)",
              boxShadow: "0 20px 80px rgba(0,0,0,0.5)",
            }}
          >
            <div className="flex items-center gap-[18px] p-6">
              <div
                className="relative h-14 w-14 shrink-0 rounded-full"
                style={{
                  background: "radial-gradient(circle at 30% 30%, #a5f3fc, #22d3ee 40%, #0891b2 80%)",
                  boxShadow: "0 0 40px rgba(34,211,238,0.5), inset 0 -10px 20px rgba(0,0,0,0.2)",
                }}
              >
                <span
                  className="absolute inset-[-3px] rounded-full border border-[rgba(34,211,238,0.35)]"
                  style={{ animation: "tr-ring 3s ease-in-out infinite" }}
                />
              </div>
              <div>
                <div className="text-[14px] font-semibold text-[#f0f3f7]">
                  Decision: <span style={{ color: "#67e8f9" }}>approved</span>
                </div>
                <div className="mt-1 font-mono text-[11px] text-[#5a6470]">
                  policy=strict · 0.34s · 4 checks passed
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </section>
  );
}
