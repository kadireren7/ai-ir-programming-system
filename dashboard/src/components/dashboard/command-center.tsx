"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion } from "framer-motion";
import { MetricCard } from "@/components/ui/metric-card";
import { GlowCard } from "@/components/ui/glow-card";

type NavEntry = { label: string; href: string; badge?: string; icon: () => React.ReactElement };

/* ─── Nav data ─────────────────────────────────────────── */
const NAV_CONTROL: NavEntry[] = [
  { label: "Command", href: "/dashboard", badge: "●", icon: HomeIcon },
  { label: "Inspect",  href: "/scan",     badge: "128", icon: SearchIcon },
  { label: "Policies", href: "/policies", badge: "14",  icon: ShieldIcon },
  { label: "Runs",     href: "/runs",     badge: "2.8k", icon: PlayIcon },
];
const NAV_SOURCES: NavEntry[] = [
  { label: "n8n",      href: "/sources", badge: "86", icon: GridIcon },
  { label: "GitHub",   href: "/sources", badge: "31", icon: BranchIcon },
  { label: "Webhooks", href: "/sources", badge: "11", icon: NodeIcon },
];

/* ─── Queue data ────────────────────────────────────────── */
const QUEUE = [
  { n: "01", name: "customer_support_n8n",   meta: "n8n · 2 findings · score 72",  st: "rev"  },
  { n: "02", name: "ai_draft_pipeline",      meta: "webhook · 5 findings · score 28", st: "fail" },
  { n: "03", name: "internal_ops_scheduler", meta: "github · 1 finding · score 61",  st: "rev"  },
  { n: "04", name: "marketing_intake_v2",    meta: "n8n · scanning…",               st: "run"  },
  { n: "05", name: "handoff_production_v3",  meta: "github · clean · score 94",     st: "pass" },
  { n: "06", name: "billing_automation",     meta: "webhook · clean · score 91",    st: "pass" },
];

const STATUS_META: Record<string, { label: string; color: string; glow: string }> = {
  pass: { label: "approved", color: "#67e8f9", glow: "#22d3ee" },
  rev:  { label: "review",   color: "#fbbf24", glow: "#fbbf24" },
  fail: { label: "rejected", color: "#fb7185", glow: "#f43f5e" },
  run:  { label: "running",  color: "#67e8f9", glow: "#22d3ee" },
};

/* ─── Policy cards ──────────────────────────────────────── */
const POLICIES = [
  { name: "strict",       rules: "12 rules", count: 31 },
  { name: "default",      rules: "8 rules",  count: 62 },
  { name: "enterprise",   rules: "14 rules", count: 18 },
  { name: "review-heavy", rules: "10 rules", count: 11 },
  { name: "ai-gate",      rules: "9 rules",  count: 6  },
];

const SYS_HEALTH = [
  { name: "gate.evaluator", pct: 96, warn: false },
  { name: "policy.engine",  pct: 88, warn: false },
  { name: "queue.worker",   pct: 72, warn: true  },
  { name: "audit.sink",     pct: 99, warn: false },
];

/* ─── SVG icons ─────────────────────────────────────────── */
function HomeIcon()   { return <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6"><path d="M3 12L12 4l9 8M5 10v11h14V10"/></svg>; }
function SearchIcon() { return <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6"><circle cx="11" cy="11" r="7"/><line x1="20" y1="20" x2="16.5" y2="16.5"/></svg>; }
function ShieldIcon() { return <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>; }
function PlayIcon()   { return <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6"><polygon points="6 4 20 12 6 20 6 4"/></svg>; }
function GridIcon()   { return <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6"><rect x="3" y="3" width="6" height="6"/><rect x="15" y="3" width="6" height="6"/><rect x="3" y="15" width="6" height="6"/><rect x="15" y="15" width="6" height="6"/></svg>; }
function BranchIcon() { return <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6"><line x1="6" y1="3" x2="6" y2="15"/><circle cx="18" cy="6" r="3"/><circle cx="6" cy="18" r="3"/><path d="M18 9a9 9 0 0 1-9 9"/></svg>; }
function NodeIcon()   { return <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6"><circle cx="12" cy="12" r="3"/><circle cx="6" cy="6" r="2"/><circle cx="18" cy="6" r="2"/><circle cx="18" cy="18" r="2"/><line x1="9" y1="9" x2="7" y2="7"/><line x1="15" y1="9" x2="17" y2="7"/><line x1="14" y1="14" x2="17" y2="17"/></svg>; }
function TorqaLogo()  { return <svg width="18" height="18" viewBox="0 0 64 64" aria-hidden><path d="M8 18 L48 18 L56 26 L16 26 Z M8 38 L40 38 L48 46 L16 46 Z" fill="#22d3ee"/><circle cx="56" cy="46" r="2" fill="#67e8f9"/></svg>; }

/* ─── Sidebar ───────────────────────────────────────────── */
function Sidebar() {
  const pathname = usePathname();

  function NavItem({ item }: { item: { label: string; href: string; badge?: string; icon: () => React.ReactElement } }) {
    const active = pathname === item.href;
    const Icon = item.icon;
    return (
      <Link
        href={item.href}
        className="flex items-center gap-2.5 rounded-md border px-3 py-2 text-[13px] transition-all"
        style={
          active
            ? { color: "#f0f3f7", background: "rgba(34,211,238,0.06)", borderColor: "rgba(34,211,238,0.2)", boxShadow: "inset 2px 0 0 #22d3ee" }
            : { color: "#5a6470", border: "1px solid transparent" }
        }
      >
        <span style={{ color: active ? "#67e8f9" : undefined }}><Icon /></span>
        <span className="flex-1">{item.label}</span>
        {item.badge && (
          <span className="font-mono text-[10px]" style={{ color: active ? "#67e8f9" : "#3b4754" }}>
            {item.badge}
          </span>
        )}
      </Link>
    );
  }

  return (
    <aside
      className="flex w-[248px] shrink-0 flex-col border-r"
      style={{
        background: "linear-gradient(180deg,#080a0e,#06080b)",
        borderColor: "#161b22",
        position: "relative",
      }}
    >
      {/* cyan edge glow */}
      <span
        className="pointer-events-none absolute right-[-1px] top-0 w-px"
        style={{
          height: "60%",
          background: "linear-gradient(180deg,transparent,rgba(34,211,238,0.3),transparent)",
        }}
        aria-hidden
      />

      {/* header */}
      <div className="flex items-center gap-2.5 border-b border-[#161b22] px-[22px] py-5">
        <div
          className="flex h-[30px] w-[30px] items-center justify-center rounded-[7px] border border-[#1f2630]"
          style={{ background: "radial-gradient(circle at 50% 30%,#0e131a,#06080b)", boxShadow: "inset 0 1px 0 rgba(255,255,255,0.04)" }}
        >
          <TorqaLogo />
        </div>
        <div className="min-w-0 flex-1">
          <div className="text-[13px] font-semibold tracking-[-0.01em] text-[#f0f3f7]">Torqa</div>
          <div className="font-mono text-[10px] tracking-[0.06em] text-[#5a6470]">acme · prod</div>
        </div>
      </div>

      {/* status pulse */}
      <div className="flex items-center gap-2 border-b border-[#161b22] px-[22px] py-3.5">
        <span
          className="h-1.5 w-1.5 rounded-full bg-[#22d3ee]"
          style={{ boxShadow: "0 0 8px #22d3ee", animation: "tr-pulse 1.6s ease-in-out infinite" }}
        />
        <span className="font-mono text-[10px] uppercase tracking-[0.1em] text-[#67e8f9]">Gate online</span>
        <span className="ml-auto font-mono text-[10px] text-[#5a6470]">340ms</span>
      </div>

      {/* nav */}
      <div className="flex-1 overflow-y-auto">
        <div className="px-[22px] pb-1.5 pt-[18px] font-mono text-[10px] uppercase tracking-[0.16em] text-[#3b4754]">Control</div>
        <div className="flex flex-col gap-px px-2.5">
          {NAV_CONTROL.map(item => <NavItem key={item.label} item={item} />)}
        </div>
        <div className="px-[22px] pb-1.5 pt-[18px] font-mono text-[10px] uppercase tracking-[0.16em] text-[#3b4754]">Sources</div>
        <div className="flex flex-col gap-px px-2.5">
          {NAV_SOURCES.map(item => <NavItem key={item.label} item={item} />)}
        </div>
      </div>

      {/* footer */}
      <div className="flex items-center gap-2.5 border-t border-[#161b22] px-[22px] py-3.5">
        <div
          className="flex h-[26px] w-[26px] items-center justify-center rounded-full text-[11px] font-semibold"
          style={{ background: "linear-gradient(135deg,#22d3ee,#0891b2)", color: "#06080b" }}
        >
          K
        </div>
        <div>
          <div className="text-[12px] font-medium text-[#f0f3f7]">kadireren</div>
          <div className="font-mono text-[10px] text-[#5a6470]">admin · acme</div>
        </div>
      </div>
    </aside>
  );
}

/* ─── Main command center ───────────────────────────────── */
export function CommandCenter() {
  const fu = (delay: number) => ({
    initial: { opacity: 0, y: 12 },
    animate: { opacity: 1, y: 0 },
    transition: { duration: 0.55, ease: [0.16, 1, 0.3, 1], delay },
  });

  return (
    <div
      className="flex h-screen overflow-hidden"
      style={{ background: "#06080b", color: "#f0f3f7" }}
    >
      <Sidebar />

      {/* main */}
      <div
        className="flex flex-1 flex-col overflow-hidden"
        style={{
          background: "radial-gradient(ellipse 80% 50% at 50% 0%,rgba(34,211,238,0.04),transparent 60%), #06080b",
        }}
      >
        {/* topbar */}
        <div
          className="flex h-14 shrink-0 items-center justify-between border-b px-7"
          style={{
            background: "rgba(6,8,11,0.85)",
            backdropFilter: "blur(16px)",
            borderColor: "#161b22",
          }}
        >
          <div className="flex items-center gap-2.5 font-mono text-[11px] tracking-[0.06em]">
            <span className="text-[#5a6470]">acme</span>
            <span className="text-[#3b4754]">/</span>
            <span className="text-[#5a6470]">prod</span>
            <span className="text-[#3b4754]">/</span>
            <span className="text-[#f0f3f7]">command</span>
          </div>
          <div className="flex items-center gap-2.5">
            <div
              className="flex min-w-[240px] items-center gap-2 rounded-md border px-3 py-1.5 font-mono text-[11px] text-[#5a6470]"
              style={{ borderColor: "#161b22", background: "#0a0d12" }}
            >
              <SearchIcon />
              <span>workflow, policy, run…</span>
              <span className="ml-auto rounded border border-[#1f2630] px-1 text-[9px] text-[#5a6470]">⌘K</span>
            </div>
            <Link
              href="/scan"
              className="rounded-md border border-[#161b22] bg-[#0a0d12] px-3 py-1.5 text-[12px] font-medium text-[#a8b1bd] transition-colors hover:text-[#f0f3f7]"
            >
              Manual scan
            </Link>
            <Link
              href="/runs"
              className="rounded-md px-3 py-1.5 text-[12px] font-semibold text-[#06080b] transition-[box-shadow] hover:shadow-[0_0_20px_rgba(34,211,238,0.4)]"
              style={{ background: "#22d3ee" }}
            >
              Approve queue · 4
            </Link>
          </div>
        </div>

        {/* scrollable content */}
        <div className="flex-1 overflow-y-auto px-7 py-7">
          {/* page header */}
          <motion.div className="mb-6 flex items-end justify-between" {...fu(0)}>
            <div>
              <div className="mb-2 flex items-center gap-2.5 font-mono text-[10px] uppercase tracking-[0.18em] text-[#67e8f9]">
                <span className="h-px w-[18px] bg-[#22d3ee]" />
                Acme · production gate
              </div>
              <h1 className="text-[30px] font-semibold leading-[1.1] tracking-[-0.03em]">Command center</h1>
              <p className="mt-1.5 max-w-[540px] text-[13px] text-[#a8b1bd]">
                Live state of every workflow under governance. Decisions stream in real time; held items wait for your approval.
              </p>
            </div>
            <div className="text-right font-mono text-[11px] text-[#5a6470]">
              <div>UTC · 17:42:08</div>
              <div className="mt-0.5 text-[13px] text-[#f0f3f7]">Gate v3.14 · stable</div>
            </div>
          </motion.div>

          {/* KPI row */}
          <div className="mb-3.5 grid grid-cols-4 gap-3.5">
            {[
              { label: "Decisions / 24h", value: "12,408", valueColor: "cyan" as const, live: true,  glowColor: "cyan" as const, delta: "8.4%", deltaUp: true,  spark: "0,18 10,15 22,16 34,11 46,12 58,7 70,9 82,5 100,3", sparkColor: "#22d3ee", delay: 0.06 },
              { label: "Median latency",  value: "340",    unit: "ms",                  glowColor: "none" as const, delta: "12ms",deltaUp: true,  spark: "0,8 14,10 28,9 42,12 56,11 70,13 84,12 100,14", sparkColor: "#a8b1bd", delay: 0.12 },
              { label: "Held for review", value: "128",    valueColor: "amber" as const, glowColor: "amber" as const, spark: "0,14 14,12 28,15 42,11 56,9 70,12 84,8 100,7", sparkColor: "#fbbf24", delay: 0.18 },
              { label: "Rejected · 24h",  value: "7",      valueColor: "red" as const,  danger: true, glowColor: "red" as const,  delta: "3",    deltaUp: false, spark: "0,18 14,17 28,15 42,16 56,13 70,14 84,11 100,9", sparkColor: "#fb7185", delay: 0.24 },
            ].map(({ delay, ...props }) => (
              <motion.div key={props.label} {...fu(delay)}>
                <MetricCard {...props} />
              </motion.div>
            ))}
          </div>

          {/* Decision stream + last decision */}
          <div className="mb-3.5 grid gap-3.5" style={{ gridTemplateColumns: "2fr 1fr" }}>
            <motion.div {...fu(0.12)}>
              <GlowCard>
                <div className="flex items-center justify-between border-b border-[#161b22] px-[18px] py-3.5">
                  <span className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.14em] text-[#5a6470]">
                    <span className="inline-block h-1.5 w-1.5 rotate-45 border border-tr-cyan bg-tr-cyan" style={{ boxShadow: "0 0 6px var(--tr-cyan)" }} />
                    Decision stream · 24h
                  </span>
                  <span className="font-mono text-[10px] text-[#5a6470]">expand →</span>
                </div>
                <div className="px-[18px] pb-[18px] pt-3.5">
                  <div className="mb-2 flex gap-4">
                    {[["#22d3ee","Approved"],["#fbbf24","Held"],["#f43f5e","Rejected"]].map(([c,l])=>(
                      <span key={l} className="flex items-center gap-1.5 font-mono text-[11px] text-[#5a6470]">
                        <span className="inline-block h-0.5 w-2 rounded-sm" style={{ background: c }} />
                        {l}
                      </span>
                    ))}
                  </div>
                  <div className="relative h-[200px]">
                    <svg viewBox="0 0 800 200" preserveAspectRatio="none" className="h-full w-full" aria-hidden>
                      <defs>
                        <linearGradient id="gApp" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#22d3ee" stopOpacity="0.4"/>
                          <stop offset="100%" stopColor="#22d3ee" stopOpacity="0"/>
                        </linearGradient>
                      </defs>
                      <line x1="0" y1="50"  x2="800" y2="50"  stroke="#161b22" strokeDasharray="2 4"/>
                      <line x1="0" y1="100" x2="800" y2="100" stroke="#161b22" strokeDasharray="2 4"/>
                      <line x1="0" y1="150" x2="800" y2="150" stroke="#161b22" strokeDasharray="2 4"/>
                      <polygon points="0,170 50,140 100,150 150,110 200,120 250,90 300,100 350,70 400,80 450,55 500,65 550,40 600,50 650,30 700,45 750,25 800,30 800,200 0,200" fill="url(#gApp)"/>
                      <polyline points="0,170 50,140 100,150 150,110 200,120 250,90 300,100 350,70 400,80 450,55 500,65 550,40 600,50 650,30 700,45 750,25 800,30" fill="none" stroke="#22d3ee" strokeWidth="1.6" filter="drop-shadow(0 0 4px rgba(34,211,238,0.5))"/>
                      <polyline points="0,180 50,175 100,178 150,170 200,172 250,168 300,170 350,160 400,165 450,155 500,160 550,150 600,155 650,148 700,152 750,145 800,148" fill="none" stroke="#fbbf24" strokeWidth="1.2"/>
                      <polyline points="0,195 50,193 100,194 150,190 200,192 250,191 300,189 350,190 400,188 450,189 500,186 550,187 600,184 650,185 700,182 750,183 800,180" fill="none" stroke="#f43f5e" strokeWidth="1.2"/>
                      <circle cx="800" cy="30" r="3" fill="#67e8f9"/>
                      <circle cx="800" cy="30" r="6" fill="none" stroke="#22d3ee" strokeOpacity="0.4">
                        <animate attributeName="r" from="3" to="10" dur="1.5s" repeatCount="indefinite"/>
                        <animate attributeName="stroke-opacity" from="0.6" to="0" dur="1.5s" repeatCount="indefinite"/>
                      </circle>
                    </svg>
                  </div>
                  <div className="mt-2 flex justify-between font-mono text-[10px] text-[#3b4754]">
                    <span>17:42 −24h</span><span>−18h</span><span>−12h</span><span>−6h</span><span>now</span>
                  </div>
                </div>
              </GlowCard>
            </motion.div>

            <motion.div className="flex flex-col gap-3.5" {...fu(0.18)}>
              {/* Decision orb */}
              <GlowCard>
                <div className="flex items-center justify-between border-b border-[#161b22] px-[18px] py-3.5">
                  <span className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.14em] text-[#5a6470]">
                    <span className="inline-block h-1.5 w-1.5 rotate-45 border border-tr-cyan bg-tr-cyan" style={{ boxShadow: "0 0 6px var(--tr-cyan)" }} />
                    Last decision
                  </span>
                  <span className="font-mono text-[10px] text-[#5a6470]">log →</span>
                </div>
                <div className="flex items-center gap-[18px] p-6">
                  <div
                    className="relative h-16 w-16 shrink-0 rounded-full"
                    style={{
                      background: "radial-gradient(circle at 30% 30%,#a5f3fc,#22d3ee 40%,#0891b2 80%)",
                      boxShadow: "0 0 50px rgba(34,211,238,0.45), inset 0 -10px 20px rgba(0,0,0,0.3)",
                    }}
                  >
                    <span
                      className="absolute inset-[-3px] rounded-full border border-[rgba(34,211,238,0.35)]"
                      style={{ animation: "tr-ring 3s ease-in-out infinite" }}
                    />
                  </div>
                  <div>
                    <div className="text-[14px] font-semibold text-[#f0f3f7]">handoff_production_v3</div>
                    <div className="mt-1 font-mono text-[11px] text-[#67e8f9]">▸ APPROVED · 0.34s</div>
                    <div className="mt-0.5 font-mono text-[11px] text-[#5a6470]">policy=strict · 4/4 checks</div>
                  </div>
                </div>

                {/* System health */}
                <div className="border-t border-[#161b22] px-[18px] pb-1 pt-3.5">
                  <div className="mb-2 font-mono text-[10px] uppercase tracking-[0.14em] text-[#5a6470]">System health</div>
                  <div className="flex flex-col gap-0.5">
                    {SYS_HEALTH.map(s => (
                      <div key={s.name} className="grid items-center gap-3 py-2 font-mono text-[11px]" style={{ gridTemplateColumns: "120px 1fr auto" }}>
                        <span className="text-[#a8b1bd]">{s.name}</span>
                        <div className="h-1 overflow-hidden rounded-sm bg-[#161b22]">
                          <div
                            className="h-full rounded-sm"
                            style={{
                              width: `${s.pct}%`,
                              background: s.warn
                                ? "linear-gradient(90deg,#92400e,#fbbf24)"
                                : "linear-gradient(90deg,#0891b2,#22d3ee)",
                              boxShadow: s.warn
                                ? "0 0 8px rgba(251,191,36,0.4)"
                                : "0 0 8px rgba(34,211,238,0.5)",
                            }}
                          />
                        </div>
                        <span className="tabular-nums text-[#f0f3f7]">{s.pct}%</span>
                      </div>
                    ))}
                  </div>
                </div>
              </GlowCard>
            </motion.div>
          </div>

          {/* Queue + Policies */}
          <div className="grid gap-3.5" style={{ gridTemplateColumns: "1.5fr 1fr" }}>
            <motion.div {...fu(0.24)}>
              <GlowCard>
                <div className="flex items-center justify-between border-b border-[#161b22] px-[18px] py-3.5">
                  <span className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.14em] text-[#5a6470]">
                    <span className="inline-block h-1.5 w-1.5 rotate-45 border border-[#3b4754]" />
                    Approval queue · 4 awaiting
                  </span>
                  <Link href="/runs" className="font-mono text-[10px] text-[#5a6470] hover:text-[#67e8f9]">view all →</Link>
                </div>
                <div>
                  {QUEUE.map(item => {
                    const s = STATUS_META[item.st];
                    return (
                      <div
                        key={item.n}
                        className="grid items-center gap-3 border-b border-[#161b22] px-[18px] py-3 transition-colors last:border-0 hover:bg-[rgba(255,255,255,0.015)]"
                        style={{ gridTemplateColumns: "auto 1fr auto" }}
                      >
                        <span className="w-[18px] font-mono text-[10px] text-[#3b4754]">{item.n}</span>
                        <div>
                          <div className="font-mono text-[12px] text-[#f0f3f7]">{item.name}</div>
                          <div className="mt-0.5 font-mono text-[10px] text-[#5a6470]">{item.meta}</div>
                        </div>
                        <div
                          className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.1em]"
                          style={{ color: s.color }}
                        >
                          <span
                            className="h-1.5 w-1.5 rounded-full"
                            style={{
                              background: s.glow,
                              boxShadow: `0 0 6px ${s.glow}`,
                              animation: item.st === "run" ? "tr-pulse 1.4s ease-in-out infinite" : undefined,
                            }}
                          />
                          {s.label}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </GlowCard>
            </motion.div>

            <motion.div {...fu(0.30)}>
              <GlowCard>
                <div className="flex items-center justify-between border-b border-[#161b22] px-[18px] py-3.5">
                  <span className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.14em] text-[#5a6470]">
                    <span className="inline-block h-1.5 w-1.5 rotate-45 border border-[#3b4754]" />
                    Active policies
                  </span>
                  <Link href="/policies" className="font-mono text-[10px] text-[#5a6470] hover:text-[#67e8f9]">manage →</Link>
                </div>
                <div className="grid grid-cols-3 gap-2 p-3.5">
                  {POLICIES.map(p => (
                    <div
                      key={p.name}
                      className="rounded-lg border border-[#161b22] bg-[rgba(255,255,255,0.01)] p-3.5"
                    >
                      <div className="text-[13px] font-semibold text-[#f0f3f7]">{p.name}</div>
                      <div className="mt-0.5 font-mono text-[10px] text-[#5a6470]">{p.rules}</div>
                      <div className="mt-2.5 flex items-center justify-between font-mono text-[10px]">
                        <span className="text-[#5a6470]">workflows</span>
                        <span className="text-[#67e8f9]">{p.count}</span>
                      </div>
                    </div>
                  ))}
                  <div
                    className="rounded-lg border p-3.5"
                    style={{ background: "rgba(34,211,238,0.04)", borderColor: "rgba(34,211,238,0.2)" }}
                  >
                    <div className="text-[13px] font-semibold text-[#67e8f9]">+ new</div>
                    <div className="mt-0.5 font-mono text-[10px] text-[#5a6470]">compose ruleset</div>
                    <div className="mt-2.5 flex items-center justify-between font-mono text-[10px]">
                      <span className="text-[#5a6470]">draft</span>
                      <span className="text-[#67e8f9]">→</span>
                    </div>
                  </div>
                </div>
              </GlowCard>
            </motion.div>
          </div>
        </div>
      </div>
    </div>
  );
}
