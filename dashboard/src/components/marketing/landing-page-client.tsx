"use client";

import Link from "next/link";
import type { ComponentType } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { CheckCircle2, FileSearch2, Network } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  docsUrl,
  featureItems,
  githubUrl,
  socialProof,
  trustItems,
  useCases,
} from "@/lib/marketing-content";
import { MarketingCinematicCta } from "@/components/marketing/marketing-cta";
import { MarketingFeatureCard } from "@/components/marketing/marketing-feature-card";
import { MarketingHero } from "@/components/marketing/marketing-hero";
import { MarketingProductDemo } from "@/components/marketing/marketing-product-demo";
import { RevealSection, StaggerGrid, StaggerItem } from "@/components/marketing/marketing-reveal";

const steps: Array<{
  step: string;
  title: string;
  copy: string;
  icon: ComponentType<{ className?: string }>;
}> = [
  {
    step: "01",
    title: "Upload",
    copy: "Import n8n or generic workflow JSON from your automation stack.",
    icon: Network,
  },
  {
    step: "02",
    title: "Scan",
    copy: "Run deterministic analysis to detect secrets, webhook risk, and transport issues.",
    icon: FileSearch2,
  },
  {
    step: "03",
    title: "Fix",
    copy: "Use actionable findings and shareable reports to remediate quickly.",
    icon: CheckCircle2,
  },
];

export function LandingPageClient() {
  const reduce = useReducedMotion();
  return (
    <main className="bg-background text-foreground">
      <MarketingHero />

      <RevealSection className="mx-auto max-w-6xl px-6 py-10 sm:px-8">
        <StaggerGrid className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {socialProof.map((item) => (
            <StaggerItem key={item.title}>
              <motion.div
                whileHover={reduce ? {} : { y: -3 }}
                transition={{ type: "spring", stiffness: 400, damping: 24 }}
              >
                <Card className="border-border/60 bg-card/60 shadow-md shadow-black/20 ring-1 ring-white/[0.04] transition-shadow duration-300 hover:shadow-lg hover:shadow-primary/5">
                  <CardContent className="p-5">
                    <p className="text-sm font-semibold text-foreground">{item.title}</p>
                    <p className="mt-1 text-xs text-muted-foreground">{item.value}</p>
                  </CardContent>
                </Card>
              </motion.div>
            </StaggerItem>
          ))}
        </StaggerGrid>
      </RevealSection>

      <RevealSection className="mx-auto max-w-6xl px-6 py-12 sm:px-8 lg:py-16">
        <div className="mb-8 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h2 className="text-2xl font-semibold tracking-tight sm:text-3xl">See Torqa in action</h2>
            <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
              A live-feeling preview of trust scoring, outcomes, and findings — motion-staged like a production dashboard.
            </p>
          </div>
        </div>
        <MarketingProductDemo />
      </RevealSection>

      <RevealSection className="mx-auto max-w-6xl px-6 py-12 sm:px-8 lg:py-16">
        <div className="mb-6 flex items-end justify-between gap-3">
          <div>
            <h2 className="text-2xl font-semibold tracking-tight sm:text-3xl">Product capabilities</h2>
            <p className="mt-2 text-sm text-muted-foreground">Everything teams need to scan, review, and ship securely.</p>
          </div>
          <Link href="/overview" className="text-sm font-medium text-primary hover:underline">
            Open dashboard
          </Link>
        </div>
        <StaggerGrid className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {featureItems.map((feature) => (
            <StaggerItem key={feature.title}>
              <MarketingFeatureCard title={feature.title} copy={feature.copy} icon={feature.icon} />
            </StaggerItem>
          ))}
        </StaggerGrid>
      </RevealSection>

      <RevealSection className="mx-auto max-w-6xl px-6 py-12 sm:px-8 lg:py-16">
        <h2 className="text-2xl font-semibold tracking-tight sm:text-3xl">How it works</h2>
        <StaggerGrid className="mt-6 grid gap-4 md:grid-cols-3">
          {steps.map((s) => {
            const Icon = s.icon;
            return (
              <StaggerItem key={s.step}>
                <motion.div whileHover={reduce ? {} : { y: -4 }} transition={{ type: "spring", stiffness: 350, damping: 22 }}>
                  <Card className="h-full border-border/60 bg-card/55 shadow-md ring-1 ring-white/[0.04] transition-shadow hover:shadow-lg hover:shadow-primary/5">
                    <CardHeader className="space-y-3">
                      <div className="flex items-center justify-between">
                        <Badge variant="secondary" className="font-semibold">
                          {s.step}
                        </Badge>
                        <Icon className="h-4 w-4 text-primary" />
                      </div>
                      <CardTitle className="text-lg">{s.title}</CardTitle>
                    </CardHeader>
                    <CardContent className="text-sm text-muted-foreground">{s.copy}</CardContent>
                  </Card>
                </motion.div>
              </StaggerItem>
            );
          })}
        </StaggerGrid>
      </RevealSection>

      <RevealSection className="mx-auto max-w-6xl px-6 py-12 sm:px-8">
        <h2 className="text-2xl font-semibold tracking-tight sm:text-3xl">Use cases</h2>
        <StaggerGrid className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-5">
          {useCases.map((item) => (
            <StaggerItem key={item}>
              <Card className="border-border/60 bg-card/50 shadow-sm ring-1 ring-white/[0.03] transition-all hover:border-border hover:shadow-md">
                <CardContent className="p-4 text-sm leading-relaxed text-muted-foreground">{item}</CardContent>
              </Card>
            </StaggerItem>
          ))}
        </StaggerGrid>
      </RevealSection>

      <RevealSection className="mx-auto max-w-6xl px-6 py-12 sm:px-8 lg:py-16">
        <div className="mb-6">
          <h2 className="text-2xl font-semibold tracking-tight sm:text-3xl">Trust and credibility</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Built for teams that need reliable, explainable security checks before shipping.
          </p>
        </div>
        <StaggerGrid className="grid gap-4 md:grid-cols-2">
          {trustItems.map((item) => (
            <StaggerItem key={item.title}>
              <Card className="border-border/60 bg-card/55 shadow-md ring-1 ring-white/[0.03] transition-shadow hover:shadow-lg">
                <CardHeader>
                  <CardTitle className="text-base">{item.title}</CardTitle>
                </CardHeader>
                <CardContent className="text-sm text-muted-foreground">{item.copy}</CardContent>
              </Card>
            </StaggerItem>
          ))}
        </StaggerGrid>
      </RevealSection>

      <RevealSection className="mx-auto max-w-6xl px-6 pb-16 pt-6 sm:px-8">
        <MarketingCinematicCta />
      </RevealSection>

      <footer className="border-t border-border/60 py-9">
        <motion.div
          className="mx-auto flex max-w-6xl flex-col gap-5 px-6 text-sm text-muted-foreground sm:px-8 lg:flex-row lg:items-center lg:justify-between"
          initial={reduce ? false : { opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
        >
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
        </motion.div>
      </footer>
    </main>
  );
}
