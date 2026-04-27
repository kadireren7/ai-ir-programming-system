"use client";

import Link from "next/link";
import { Check, Circle } from "lucide-react";
import type { HomeDashboardMode, HomeOnboardingCounts } from "@/data/types";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { GovernanceJourneyStrip } from "./governance-journey-strip";

type Props = {
  mode: HomeDashboardMode;
  savedReportsAllTime: number;
  onboarding: HomeOnboardingCounts | null;
};

type Step = { id: string; label: string; href: string; done: boolean; optional?: boolean };

export function OverviewFirstRun({ mode, savedReportsAllTime, onboarding }: Props) {
  const cloud = mode === "supabase" && onboarding !== null;
  const o = onboarding;

  const scanDone = savedReportsAllTime > 0;
  const steps: Step[] = [
    {
      id: "integration",
      label: "Connect an integration",
      href: "/integrations",
      done: cloud ? (o!.integrations > 0) : false,
    },
    {
      id: "workflow",
      label: "Upload or import a workflow",
      href: "/workflow-library",
      done: cloud ? (o!.workflowTemplates > 0) : false,
    },
    {
      id: "scan",
      label: "Run your first scan",
      href: "/scan",
      done: scanDone,
    },
    {
      id: "policy",
      label: "Apply a policy",
      href: "/policies",
      done: cloud ? (o!.workspacePolicies > 0) : false,
    },
    {
      id: "alert",
      label: "Set an alert",
      href: "/alerts",
      done: cloud ? (o!.alertDestinations > 0) : false,
    },
    {
      id: "team",
      label: "Invite a teammate",
      href: "/team",
      done: cloud ? o!.organizationMembers > 1 : false,
      optional: !cloud || o!.organizationMembers <= 1,
    },
  ];

  const doneCount = steps.filter((s) => s.done).length;
  const allCoreDone = steps.slice(0, 5).every((s) => s.done);

  return (
    <div className="space-y-6">
      <GovernanceJourneyStrip />

      <Card className="border-border/70 bg-card/50 shadow-md ring-1 ring-black/[0.03] dark:ring-white/[0.05]">
        <CardHeader className="pb-3">
          <div className="flex flex-wrap items-end justify-between gap-2">
            <div>
              <CardTitle className="text-lg font-semibold">Get started</CardTitle>
              <CardDescription className="mt-1 max-w-xl">
                {cloud
                  ? `${doneCount}/${steps.length} complete · finish the loop to operationalize Torqa.`
                  : "Connect Supabase to unlock saved data, then work through these steps."}
              </CardDescription>
            </div>
            {!cloud ? (
              <Link
                href="/workspace"
                className="text-xs font-medium text-primary underline-offset-4 hover:underline"
              >
                Cloud setup →
              </Link>
            ) : null}
          </div>
        </CardHeader>
        <CardContent className="grid gap-2 sm:grid-cols-2">
          {steps.map((s) => (
            <Link
              key={s.id}
              href={s.href}
              className={cn(
                "group flex items-start gap-3 rounded-xl border px-3 py-3 transition-colors",
                s.done
                  ? "border-emerald-500/25 bg-emerald-500/[0.06]"
                  : "border-border/60 bg-muted/20 hover:border-primary/30 hover:bg-muted/35"
              )}
            >
              <span className="mt-0.5 shrink-0 text-primary" aria-hidden>
                {s.done ? <Check className="h-4 w-4" strokeWidth={2.5} /> : <Circle className="h-4 w-4" />}
              </span>
              <span className="min-w-0 text-left">
                <span className="block text-sm font-medium text-foreground group-hover:text-primary">{s.label}</span>
                {s.optional && !s.done ? (
                  <span className="mt-0.5 block text-[11px] text-muted-foreground">Optional in personal workspace</span>
                ) : null}
              </span>
            </Link>
          ))}
        </CardContent>
        {cloud && allCoreDone ? (
          <CardContent className="border-t border-border/50 pt-0">
            <p className="text-center text-xs text-muted-foreground">
              Core setup complete. Tune policies and alerts anytime.
            </p>
          </CardContent>
        ) : null}
      </Card>
    </div>
  );
}
