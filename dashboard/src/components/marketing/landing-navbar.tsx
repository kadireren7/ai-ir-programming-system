"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Menu, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { docsUrl, githubUrl } from "@/lib/marketing-content";
import { cn } from "@/lib/utils";

const navLinks: Array<{ label: string; href: string; external?: boolean }> = [
  { label: "Product", href: "#product" },
  { label: "Journey", href: "#journey" },
  { label: "Platform", href: "#platform" },
  { label: "Demo", href: "#demo" },
  { label: "Docs", href: docsUrl, external: true },
  { label: "GitHub", href: githubUrl, external: true },
];

function scrollToHash(href: string) {
  if (!href.startsWith("#")) return;
  const id = href.slice(1);
  const el = document.getElementById(id);
  el?.scrollIntoView({ behavior: "smooth", block: "start" });
}

export function LandingNavbar() {
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);

  const onScroll = useCallback(() => {
    setScrolled(window.scrollY > 24);
  }, []);

  useEffect(() => {
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [onScroll]);

  useEffect(() => {
    if (open) document.body.style.overflow = "hidden";
    else document.body.style.overflow = "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  return (
    <header
      className={cn(
        "fixed inset-x-0 top-0 z-50 transition-[background-color,box-shadow,border-color,backdrop-filter] duration-300",
        scrolled
          ? "border-b border-border/60 bg-background/85 shadow-lg shadow-black/20 backdrop-blur-xl"
          : "border-b border-transparent bg-transparent"
      )}
    >
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
        <Link
          href="/"
          className="shrink-0 text-lg font-semibold tracking-tight text-foreground transition-opacity hover:opacity-90"
        >
          Torqa
        </Link>

        <nav className="hidden items-center gap-1 lg:flex" aria-label="Primary">
          {navLinks.map((item) =>
            item.external ? (
              <a
                key={item.label}
                href={item.href}
                target="_blank"
                rel="noreferrer"
                className="rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-white/[0.04] hover:text-foreground"
              >
                {item.label}
              </a>
            ) : (
              <a
                key={item.label}
                href={item.href}
                className="rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-white/[0.04] hover:text-foreground"
                onClick={(e) => {
                  e.preventDefault();
                  scrollToHash(item.href);
                  setOpen(false);
                }}
              >
                {item.label}
              </a>
            )
          )}
        </nav>

        <div className="hidden items-center gap-2 lg:flex">
          <Button asChild variant="ghost" size="sm" className="text-muted-foreground hover:text-foreground">
            <Link href="/login">Sign in</Link>
          </Button>
          <Button asChild size="sm" className="shadow-md shadow-primary/20">
            <Link href="/integrations">Connect</Link>
          </Button>
        </div>

        <div className="flex items-center gap-2 lg:hidden">
          <Button asChild size="sm" variant="ghost" className="px-2 text-muted-foreground">
            <Link href="/login">Sign in</Link>
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="shrink-0 text-foreground"
            aria-expanded={open}
            aria-controls="mobile-nav"
            aria-label={open ? "Close menu" : "Open menu"}
            onClick={() => setOpen((o) => !o)}
          >
            {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </Button>
        </div>
      </div>

      <div
        id="mobile-nav"
        className={cn(
          "grid border-border/60 bg-background/95 backdrop-blur-xl transition-[grid-template-rows] duration-300 ease-out lg:hidden",
          open ? "grid-rows-[1fr] border-b" : "grid-rows-[0fr] border-b-0"
        )}
        aria-hidden={!open}
      >
        <div className="overflow-hidden" inert={!open}>
          <nav className="flex flex-col gap-1 px-4 py-4" aria-label="Mobile">
            {navLinks.map((item) =>
              item.external ? (
                <a
                  key={item.label}
                  href={item.href}
                  target="_blank"
                  rel="noreferrer"
                  className="rounded-lg px-3 py-3 text-sm font-medium text-foreground"
                  onClick={() => setOpen(false)}
                >
                  {item.label}
                </a>
              ) : (
                <a
                  key={item.label}
                  href={item.href}
                  className="rounded-lg px-3 py-3 text-sm font-medium text-foreground"
                  onClick={(e) => {
                    e.preventDefault();
                    scrollToHash(item.href);
                    setOpen(false);
                  }}
                >
                  {item.label}
                </a>
              )
            )}
            <Button asChild className="mt-2 w-full">
              <Link href="/integrations" onClick={() => setOpen(false)}>
                Connect a source
              </Link>
            </Button>
          </nav>
        </div>
      </div>
    </header>
  );
}
