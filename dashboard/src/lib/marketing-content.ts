import type { ComponentType } from "react";
import { FileCheck2, Rocket, Shield, Share2, Users, Workflow } from "lucide-react";

export const githubUrl = "https://github.com/kadireren7/ai-ir-programming-system";

export const docsUrl = `${githubUrl}/tree/main/docs`;

export const socialProof = [
  { title: "Built for automation teams", value: "n8n, internal tools, AI ops" },
  { title: "Fast workflow risk checks", value: "Deterministic server-side analysis" },
  { title: "Deterministic findings", value: "No black-box randomness" },
  { title: "Secure by design", value: "Share controls, auth, API keys" },
];

export const featureItems: Array<{ title: string; copy: string; icon: ComponentType<{ className?: string }> }> = [
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

export const trustItems = [
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

export const useCases = [
  "n8n teams shipping multi-step automations faster",
  "Internal ops teams reviewing workflow risk before rollout",
  "Agencies managing many client automations safely",
  "Security review teams enforcing baseline controls",
  "AI workflow builders needing trustworthy guardrails",
];

export const heroStats = [
  { label: "Scans analyzed", value: 2840, suffix: "+" },
  { label: "Findings surfaced", value: 128, suffix: "" },
  { label: "Deterministic", value: 100, suffix: "%" },
];

export const trustBadges = ["Explainable AI", "Workspace RLS", "API-first", "Share controls"];

export const demoFindings = [
  { label: "Hardcoded secret in HTTP node", severity: "critical" as const },
  { label: "Webhook trigger has no auth", severity: "review" as const },
  { label: "TLS verification disabled", severity: "critical" as const },
  { label: "Disconnected node detected", severity: "info" as const },
];
