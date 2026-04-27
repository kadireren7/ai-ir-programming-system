"use client";

import Link from "next/link";
import { Check, ChevronDown } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { RevealSection } from "@/components/marketing/marketing-reveal";

const tiers = [
  {
    name: "Starter",
    price: "Free",
    detail: "For individuals and proofs of concept",
    features: ["Workflow scan (UI)", "Local history without cloud", "Community support"],
    cta: "Try Demo",
    href: "/scan",
    highlight: false,
  },
  {
    name: "Team",
    price: "Custom",
    detail: "Workspaces, shared scans, and governance",
    features: [
      "Shared scan history & library",
      "Policy templates & insights",
      "Alerts & API keys",
      "Role-based workspace access",
    ],
    cta: "Sign in to explore",
    href: "/login",
    highlight: true,
  },
  {
    name: "Enterprise",
    price: "Let’s talk",
    detail: "Security review, SLAs, and deployment options",
    features: ["Dedicated support", "Advanced deployment", "Custom integrations roadmap"],
    cta: "Contact us",
    href: "mailto:hello@torqa.dev",
    highlight: false,
  },
];

const faqItems = [
  {
    q: "What does Torqa scan?",
    a: "n8n-style and generic workflow JSON. The engine flags secrets, transport and webhook risk, and other deterministic heuristics — no random scoring.",
  },
  {
    q: "Do I need Supabase?",
    a: "You can run scans from the dashboard without cloud persistence. Connect Supabase when you want auth, team workspaces, saved history, and API keys.",
  },
  {
    q: "Is this a replacement for a full pentest?",
    a: "No. Torqa is built for fast, repeatable automation hygiene — ideal before CI, handoff, or client delivery — not a substitute for manual security assessment.",
  },
  {
    q: "Where is my data processed?",
    a: "Scans run server-side in your Torqa deployment. When you use Supabase, history and workspace data follow your project’s region and RLS policies.",
  },
];

export function LandingPricingSection() {
  return (
    <RevealSection
      id="pricing"
      className="scroll-mt-28 mx-auto max-w-6xl px-6 py-14 sm:px-8 sm:py-16 lg:py-20"
    >
      <div className="mx-auto max-w-2xl text-center">
        <h2 className="text-2xl font-semibold tracking-tight sm:text-3xl">Pricing</h2>
        <p className="mt-3 text-sm leading-relaxed text-muted-foreground sm:text-base">
          Start free, scale with your team. Payment flows can be wired when you are ready — today Torqa focuses on
          value in the product, not checkout friction.
        </p>
      </div>
      <div className="mt-10 grid gap-6 md:grid-cols-3">
        {tiers.map((t) => (
          <Card
            key={t.name}
            className={
              t.highlight
                ? "relative border-primary/40 bg-gradient-to-b from-primary/[0.12] to-card/90 shadow-xl shadow-primary/10 ring-1 ring-primary/25"
                : "border-border/60 bg-card/50"
            }
          >
            {t.highlight ? (
              <Badge className="absolute -top-3 left-1/2 -translate-x-1/2 border-primary/40 bg-primary/90 text-primary-foreground">
                Popular
              </Badge>
            ) : null}
            <CardHeader>
              <CardTitle className="text-lg">{t.name}</CardTitle>
              <p className="text-3xl font-semibold tracking-tight">{t.price}</p>
              <CardDescription className="text-xs sm:text-sm">{t.detail}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {t.features.map((f) => (
                <div key={f} className="flex gap-2 text-sm text-muted-foreground">
                  <Check className="mt-0.5 h-4 w-4 shrink-0 text-primary" aria-hidden />
                  <span>{f}</span>
                </div>
              ))}
            </CardContent>
            <CardFooter>
              {t.href.startsWith("mailto:") ? (
                <Button asChild className="w-full" variant={t.highlight ? "default" : "outline"}>
                  <a href={t.href}>{t.cta}</a>
                </Button>
              ) : (
                <Button asChild className="w-full" variant={t.highlight ? "default" : "outline"}>
                  <Link href={t.href}>{t.cta}</Link>
                </Button>
              )}
            </CardFooter>
          </Card>
        ))}
      </div>
    </RevealSection>
  );
}

export function LandingFaqSection() {
  return (
    <RevealSection id="faq" className="scroll-mt-28 mx-auto max-w-6xl px-6 py-14 sm:px-8 sm:py-16 lg:py-20">
      <div className="mx-auto max-w-2xl text-center">
        <h2 className="text-2xl font-semibold tracking-tight sm:text-3xl">FAQ</h2>
        <p className="mt-3 text-sm text-muted-foreground">Straight answers for teams evaluating Torqa.</p>
      </div>
      <div className="mx-auto mt-10 max-w-3xl divide-y divide-border/60 rounded-2xl border border-border/60 bg-card/40 px-1 shadow-inner">
        {faqItems.map((item) => (
          <details key={item.q} className="group px-4 py-1">
            <summary className="cursor-pointer list-none py-4 text-left text-sm font-medium text-foreground transition-colors marker:content-none [&::-webkit-details-marker]:hidden">
              <span className="flex items-center justify-between gap-3">
                {item.q}
                <ChevronDown
                  className="h-4 w-4 shrink-0 text-muted-foreground transition-transform duration-200 group-open:rotate-180"
                  aria-hidden
                />
              </span>
            </summary>
            <p className="pb-4 text-sm leading-relaxed text-muted-foreground">{item.a}</p>
          </details>
        ))}
      </div>
    </RevealSection>
  );
}
