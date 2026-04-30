"use client";

import Link from "next/link";
import { useState } from "react";
import { ArrowRight, Check, Sparkles, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";

const STEPS = [
  {
    id: "source",
    title: "Choose your source",
    body: "Connect n8n, GitHub, or another automation platform. Torqa will scan workflows automatically from there.",
    href: "/sources",
    actionLabel: "Connect a source",
  },
  {
    id: "workflows",
    title: "Select workflows",
    body: "Browse synced workflows from your connected source. Pick the ones you want Torqa to monitor.",
    href: "/workflows",
    actionLabel: "View workflows",
  },
  {
    id: "policy",
    title: "Pick a policy",
    body: "Choose a governance policy template. Policies define pass/fail/review thresholds for each scan.",
    href: "/policies",
    actionLabel: "Browse policies",
  },
  {
    id: "automate",
    title: "Turn on automation",
    body: "Set up a recurring schedule and alert routes. Torqa will scan on every change and notify your team on failures.",
    href: "/automations",
    actionLabel: "Set up automations",
  },
  {
    id: "review",
    title: "Review your first run",
    body: "Check the Runs page after your first automated scan. Review findings, export PDF, or share the report.",
    href: "/runs",
    actionLabel: "View runs",
  },
] as const;

type Props = {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onCompleted: () => void;
};

export function OnboardingWizard({ open, onOpenChange, onCompleted }: Props) {
  const [idx, setIdx] = useState(0);
  const [saving, setSaving] = useState(false);
  const step = STEPS[idx];
  const isLast = idx === STEPS.length - 1;

  if (!open) return null;

  const complete = async () => {
    setSaving(true);
    try {
      await fetch("/api/onboarding/progress", {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ wizardCompleted: true }),
      });
      onOpenChange(false);
      onCompleted();
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm"
      role="presentation"
      onClick={() => onOpenChange(false)}
    >
      <Card
        className="relative max-h-[90vh] w-full max-w-lg overflow-hidden shadow-2xl"
        role="dialog"
        aria-modal="true"
        aria-labelledby="onboarding-wizard-title"
        aria-describedby="onboarding-wizard-desc"
        onClick={(e) => e.stopPropagation()}
      >
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="absolute right-2 top-2 z-10"
          aria-label="Close"
          onClick={() => onOpenChange(false)}
        >
          <X className="h-4 w-4" />
        </Button>
        <CardHeader className="border-b border-border/60 bg-muted/30 pr-12">
          <div className="flex items-center gap-2 text-primary">
            <Sparkles className="h-4 w-4" aria-hidden />
            <span className="text-xs font-semibold uppercase tracking-widest">Get started</span>
          </div>
          <CardTitle id="onboarding-wizard-title" className="text-xl">
            Connect → Monitor → Enforce
          </CardTitle>
          <CardDescription id="onboarding-wizard-desc">
            Step {idx + 1} of {STEPS.length} — set up continuous automation governance in minutes.
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-4 pt-5">
          <div className="flex gap-1 pb-1">
            {STEPS.map((s, i) => (
              <div
                key={s.id}
                className={`h-1 flex-1 rounded-full transition-colors ${i <= idx ? "bg-primary" : "bg-muted"}`}
              />
            ))}
          </div>
          <p className="text-base font-semibold text-foreground">{step.title}</p>
          <p className="text-sm leading-relaxed text-muted-foreground">{step.body}</p>
          <Button asChild variant="outline" size="sm" className="w-full sm:w-auto">
            <Link href={step.href} onClick={() => onOpenChange(false)}>
              {step.actionLabel}
              <ArrowRight className="ml-2 h-4 w-4" aria-hidden />
            </Link>
          </Button>
        </CardContent>

        <CardFooter className="flex flex-wrap items-center justify-between gap-2 border-t border-border/60 bg-muted/20">
          <div className="flex items-center gap-2">
            <Button type="button" variant="ghost" size="sm" onClick={() => onOpenChange(false)}>
              Dismiss
            </Button>
            <Link
              href="/advanced/manual-scan"
              onClick={() => onOpenChange(false)}
              className="text-xs text-muted-foreground hover:text-foreground hover:underline"
            >
              Skip → manual scan
            </Link>
          </div>
          <div className="flex flex-wrap justify-end gap-2">
            {idx > 0 ? (
              <Button type="button" variant="outline" size="sm" onClick={() => setIdx((i) => i - 1)}>
                Back
              </Button>
            ) : null}
            {!isLast ? (
              <Button type="button" size="sm" onClick={() => setIdx((i) => i + 1)}>
                Next
                <ArrowRight className="ml-1 h-4 w-4" aria-hidden />
              </Button>
            ) : (
              <Button type="button" size="sm" disabled={saving} onClick={() => void complete()}>
                <Check className="mr-1 h-4 w-4" aria-hidden />
                {saving ? "Saving…" : "Done"}
              </Button>
            )}
          </div>
        </CardFooter>
      </Card>
    </div>
  );
}
