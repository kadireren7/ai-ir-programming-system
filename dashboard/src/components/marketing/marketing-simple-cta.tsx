"use client";

import Link from "next/link";
import { motion, useReducedMotion } from "framer-motion";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";

export function MarketingSimpleCta() {
  const reduce = useReducedMotion();
  return (
    <motion.div
      className="relative mx-auto max-w-3xl overflow-hidden rounded-3xl border border-border/50 bg-gradient-to-br from-card/90 via-card/50 to-primary/[0.08] px-8 py-16 text-center shadow-2xl shadow-black/30 ring-1 ring-white/[0.05] sm:px-12 sm:py-20"
      initial={reduce ? false : { opacity: 0, y: 16 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-60px" }}
      transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
    >
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_50%_0%,hsl(var(--primary)/0.12),transparent_55%)]" />
      <p className="relative text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
        Start with a scan.
        <br className="hidden sm:block" />
        <span className="text-muted-foreground"> Grow into continuous governance.</span>
      </p>
      <div className="relative mt-10 flex flex-wrap justify-center gap-3">
        <Button asChild size="lg" className="gap-2 shadow-lg shadow-primary/15">
          <Link href="/scan">
            Run a scan
            <ArrowRight className="h-4 w-4" />
          </Link>
        </Button>
        <Button asChild size="lg" variant="outline" className="border-border/70 bg-background/50 backdrop-blur">
          <Link href="/integrations">Connect integrations</Link>
        </Button>
      </div>
    </motion.div>
  );
}
