import Link from "next/link";
import type { ComponentType } from "react";
import {
  ArrowUpRight,
  ArrowRight,
  CheckCircle2,
  Clock3,
  FileCheck2,
  FileSearch2,
  GitBranch,
  LayoutDashboard,
  Network,
  Rocket,
  Shield,
  Share2,
  Sparkles,
  Users,
  Workflow,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

const githubUrl = "https://github.com/kadireren7/ai-ir-programming-system";

const docsUrl = `${githubUrl}/tree/main/docs`;

const socialProof = [
  { title: "Built for automation teams", value: "n8n, internal tools, AI ops" },
  { title: "Fast workflow risk checks", value: "Deterministic server-side analysis" },
  { title: "Deterministic findings", value: "No black-box randomness" },
  { title: "Secure by design", value: "Share controls, auth, API keys" },
];

const featureItems: Array<{ title: string; copy: string; icon: ComponentType<{ className?: string }> }> = [
  {
    title: "Scan workflows instantly",
    copy: "Upload JSON and run deterministic risk checks in seconds.",
    icon: Workflow,
  },
  {
    title: "Detect secrets & insecure webhooks",
    copy: "Flags hardcoded credentials, public webhook exposure, and transport risks.",
    icon: Shield,
  },
  {
    title: "Share reports safely",
    copy: "Create public links for non-sensitive snapshots with clear controls.",
    icon: Share2,
  },
  {
    title: "Team collaboration",
    copy: "Workspace scope, shared history, and invite-driven collaboration.",
    icon: Users,
  },
  {
    title: "API access",
    copy: "Use API keys with public scan endpoint for automation pipelines.",
    icon: Rocket,
  },
  {
    title: "Governance-ready",
    copy: "Structured findings, remediation steps, and traceable scan history.",
    icon: FileCheck2,
  },
];

const trustItems = [
  {
    title: "Deterministic engine",
    copy: "Same workflow input always yields the same findings and score.",
  },
  {
    title: "No black-box scoring",
    copy: "Weighted deduction model is explicit, inspectable, and predictable.",
  },
  {
    title: "Explainable findings",
    copy: "Each rule includes clear rationale and actionable remediation guidance.",
  },
  {
    title: "Modern automation stacks",
    copy: "Built to analyze n8n-style and generic workflow JSON payloads.",
  },
];

const useCases = [
  "n8n teams shipping multi-step automations faster",
  "Internal ops teams reviewing workflow risk before rollout",
  "Agencies managing many client automations safely",
  "Security review teams enforcing baseline controls",
  "AI workflow builders needing trustworthy guardrails",
];

export default function MarketingLandingPage() {
  return (
    <main className="bg-background text-foreground">
      <section className="relative overflow-hidden border-b border-border/60">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_15%_15%,hsl(var(--primary)/0.24),transparent_32%),radial-gradient(circle_at_85%_0%,hsl(var(--chart-2)/0.2),transparent_34%),radial-gradient(circle_at_70%_65%,hsl(var(--chart-1)/0.1),transparent_42%)]" />
        <div className="relative mx-auto max-w-6xl px-6 pb-14 pt-20 sm:px-8 lg:pb-16 lg:pt-24">
          <Badge className="w-fit border-primary/30 bg-primary/10 text-primary">
            <Sparkles className="mr-1 h-3.5 w-3.5" />
            Scan Engine v1 • deterministic workflow security analysis
          </Badge>
          <div className="mt-6 grid gap-10 lg:grid-cols-[1.05fr_0.95fr] lg:items-center">
            <div className="space-y-6">
              <h1 className="text-balance text-4xl font-semibold tracking-tight sm:text-5xl lg:text-6xl">
                Ship automation faster with security confidence.
              </h1>
              <p className="max-w-2xl text-base leading-relaxed text-muted-foreground sm:text-lg">
                Torqa gives automation teams deterministic findings, transparent trust scoring, and remediation-ready
                reports for every workflow scan.
              </p>
              <div className="flex flex-wrap items-center gap-3">
                <Button asChild size="lg" className="gap-2 shadow-lg shadow-primary/30">
                  <Link href="/scan">
                    Try Live Demo
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                </Button>
                <Button asChild size="lg" variant="outline" className="gap-2 border-border/80 bg-background/60">
                  <Link href={githubUrl} target="_blank" rel="noreferrer">
                    <GitBranch className="h-4 w-4" />
                    View GitHub
                    <ArrowUpRight className="h-3.5 w-3.5" />
                  </Link>
                </Button>
              </div>
              <p className="text-xs text-muted-foreground sm:text-sm">
                Trusted by teams building on modern automation stacks • No black-box scoring • Explainable findings
              </p>
            </div>
            <HeroVisual />
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-6 py-8 sm:px-8">
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {socialProof.map((item) => (
            <Card key={item.title} className="border-border/70 bg-card/55">
              <CardContent className="p-5">
                <p className="text-sm font-semibold text-foreground">{item.title}</p>
                <p className="mt-1 text-xs text-muted-foreground">{item.value}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-6 py-12 sm:px-8 lg:py-16">
        <div className="mb-6 flex items-end justify-between gap-3">
          <div>
            <h2 className="text-2xl font-semibold tracking-tight sm:text-3xl">Product capabilities</h2>
            <p className="mt-2 text-sm text-muted-foreground">Everything teams need to scan, review, and ship securely.</p>
          </div>
          <Link href="/overview" className="text-sm text-primary hover:underline">
            Open dashboard
          </Link>
        </div>
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {featureItems.map((feature) => {
            const Icon = feature.icon;
            return (
              <Card key={feature.title} className="border-border/70 bg-card/60 shadow-sm ring-1 ring-white/[0.03]">
                <CardHeader className="space-y-3 pb-2">
                  <div className="w-fit rounded-lg border border-primary/25 bg-primary/10 p-2">
                    <Icon className="h-4 w-4 text-primary" />
                  </div>
                  <CardTitle className="text-lg">{feature.title}</CardTitle>
                </CardHeader>
                <CardContent className="pt-1 text-sm text-muted-foreground">{feature.copy}</CardContent>
              </Card>
            );
          })}
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-6 py-12 sm:px-8 lg:py-16">
        <h2 className="text-2xl font-semibold tracking-tight sm:text-3xl">How it works</h2>
        <div className="mt-6 grid gap-4 md:grid-cols-3">
          <StepCard
            step="01"
            title="Upload"
            copy="Import n8n or generic workflow JSON from your automation stack."
            icon={Network}
          />
          <StepCard
            step="02"
            title="Scan"
            copy="Run deterministic analysis to detect secrets, webhook risk, and transport issues."
            icon={FileSearch2}
          />
          <StepCard
            step="03"
            title="Fix"
            copy="Use actionable findings and shareable reports to remediate quickly."
            icon={CheckCircle2}
          />
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-6 py-12 sm:px-8">
        <h2 className="text-2xl font-semibold tracking-tight sm:text-3xl">Use cases</h2>
        <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-5">
          {useCases.map((item) => (
            <Card key={item} className="border-border/70 bg-card/50">
              <CardContent className="p-4 text-sm leading-relaxed text-muted-foreground">{item}</CardContent>
            </Card>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-6 py-12 sm:px-8 lg:py-16">
        <div className="mb-6">
          <h2 className="text-2xl font-semibold tracking-tight sm:text-3xl">Trust and credibility</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Built for teams that need reliable, explainable security checks before shipping.
          </p>
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          {trustItems.map((item) => (
            <Card key={item.title} className="border-border/70 bg-card/55">
              <CardHeader>
                <CardTitle className="text-base">{item.title}</CardTitle>
              </CardHeader>
              <CardContent className="text-sm text-muted-foreground">{item.copy}</CardContent>
            </Card>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-6 pb-16 pt-6 sm:px-8">
        <Card className="overflow-hidden border-primary/25 bg-gradient-to-br from-primary/[0.15] via-card to-card shadow-xl">
          <CardHeader className="space-y-3">
            <CardTitle className="text-2xl sm:text-3xl">Ready to make workflow risk visible?</CardTitle>
            <CardDescription className="max-w-2xl text-sm sm:text-base">
              Start scanning today, run your team on deterministic findings, and share remediation-ready reports.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-3">
            <Button asChild className="gap-2">
              <Link href="/scan">
                Start scanning
                <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
            <Button asChild variant="outline" className="gap-2 border-border/80 bg-background/60">
              <Link href="/overview">
                Open dashboard
                <LayoutDashboard className="h-4 w-4" />
              </Link>
            </Button>
            <Button asChild variant="outline" className="gap-2 border-border/80 bg-background/60">
              <Link href={githubUrl} target="_blank" rel="noreferrer">
                Explore GitHub
                <GitBranch className="h-4 w-4" />
              </Link>
            </Button>
          </CardContent>
        </Card>
      </section>

      <footer className="border-t border-border/60 py-9">
        <div className="mx-auto flex max-w-6xl flex-col gap-5 px-6 text-sm text-muted-foreground sm:px-8 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="font-semibold text-foreground">Torqa</p>
            <p className="mt-1">Deterministic security analysis for modern automation workflows.</p>
          </div>
          <div className="flex flex-wrap gap-x-5 gap-y-2">
            <Link href={docsUrl} target="_blank" rel="noreferrer" className="hover:text-foreground">
              Docs
            </Link>
            <Link href={githubUrl} target="_blank" rel="noreferrer" className="hover:text-foreground">
              GitHub
            </Link>
            <Link href="/overview" className="hover:text-foreground">
              Dashboard
            </Link>
            <Link href="/policy" className="hover:text-foreground">
              Privacy
            </Link>
          </div>
        </div>
      </footer>
    </main>
  );
}

function HeroVisual() {
  return (
    <Card className="relative overflow-hidden border-border/70 bg-card/70 shadow-2xl ring-1 ring-white/[0.06]">
      <div className="pointer-events-none absolute -right-8 -top-8 h-36 w-36 rounded-full bg-primary/25 blur-3xl" />
      <div className="pointer-events-none absolute -left-8 bottom-6 h-28 w-28 rounded-full bg-chart-2/20 blur-3xl" />
      <CardHeader className="space-y-2 pb-3">
        <CardTitle className="text-base">Live risk visibility</CardTitle>
        <CardDescription>Preview how Torqa reports workflow posture in real time.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="rounded-xl border border-border/70 bg-background/70 p-4">
          <div className="mb-3 flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Scan snapshot</span>
            <Badge className="border-amber-500/40 bg-amber-500/10 text-amber-300">Needs review</Badge>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <MiniMetric label="Trust" value="78" />
            <MiniMetric label="Findings" value="5" />
            <MiniMetric label="Critical" value="1" />
          </div>
        </div>
        <div className="space-y-2 rounded-xl border border-border/70 bg-background/60 p-4">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Clock3 className="h-3.5 w-3.5" />
            Deterministic finding feed
          </div>
          <FindingRow label="Hardcoded secret in HTTP node" severity="critical" />
          <FindingRow label="Webhook trigger has no auth" severity="review" />
          <FindingRow label="Disconnected node detected" severity="info" />
        </div>
        <p className="text-xs text-muted-foreground">
          Includes auth, history, share links, workspace collaboration, and API key access out of the box.
        </p>
      </CardContent>
    </Card>
  );
}

function FindingRow({ label, severity }: { label: string; severity: "critical" | "review" | "info" }) {
  return (
    <div className="flex items-center justify-between rounded-md border border-border/60 bg-card/60 px-3 py-2">
      <span className="text-sm text-foreground">{label}</span>
      <Badge
        className={
          severity === "critical"
            ? "border-rose-500/40 bg-rose-500/10 text-rose-200"
            : severity === "review"
              ? "border-amber-500/40 bg-amber-500/10 text-amber-200"
              : "border-slate-500/40 bg-slate-500/10 text-slate-200"
        }
      >
        {severity}
      </Badge>
    </div>
  );
}

function StepCard({
  step,
  title,
  copy,
  icon: Icon,
}: {
  step: string;
  title: string;
  copy: string;
  icon: ComponentType<{ className?: string }>;
}) {
  return (
    <Card className="border-border/70 bg-card/60">
      <CardHeader className="space-y-3">
        <div className="flex items-center justify-between">
          <Badge variant="secondary" className="font-semibold">
            {step}
          </Badge>
          <Icon className="h-4 w-4 text-primary" />
        </div>
        <CardTitle className="text-lg">{title}</CardTitle>
      </CardHeader>
      <CardContent className="text-sm text-muted-foreground">{copy}</CardContent>
    </Card>
  );
}

function MiniMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-border/60 bg-card/70 px-3 py-2">
      <p className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</p>
      <p className="text-xl font-semibold text-foreground">{value}</p>
    </div>
  );
}

