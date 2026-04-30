"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { cn } from "@/lib/utils";

const TorqaLogo = () => (
  <svg width="22" height="22" viewBox="0 0 64 64" aria-hidden>
    <path d="M8 18 L48 18 L56 26 L16 26 Z M8 38 L40 38 L48 46 L16 46 Z" fill="#22d3ee" />
    <circle cx="56" cy="46" r="2" fill="#67e8f9" />
  </svg>
);

const navLinks = [
  { label: "Platform", href: "#pillars" },
  { label: "How it works", href: "#flow" },
  { label: "Metrics", href: "#metrics" },
  { label: "Docs", href: "#" },
];

export function LandingNavbar() {
  const [scrolled, setScrolled] = useState(false);

  const onScroll = useCallback(() => setScrolled(window.scrollY > 20), []);

  useEffect(() => {
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [onScroll]);

  return (
    <nav
      className={cn(
        "fixed inset-x-0 top-0 z-50 flex items-center justify-between px-10 py-[18px]",
        "backdrop-blur-xl transition-[border-color,background] duration-300",
        scrolled
          ? "border-b border-[#161b22] bg-[rgba(6,8,11,0.85)]"
          : "border-b border-transparent bg-[rgba(6,8,11,0.6)]",
      )}
    >
      <Link
        href="/"
        className="flex items-center gap-2.5 text-[16px] font-semibold tracking-[-0.01em] text-[#f0f3f7]"
      >
        <TorqaLogo />
        Torqa
      </Link>

      <div className="hidden items-center gap-7 md:flex">
        {navLinks.map((l) => (
          <a
            key={l.label}
            href={l.href}
            className="text-[13px] text-[#a8b1bd] transition-colors hover:text-[#f0f3f7]"
          >
            {l.label}
          </a>
        ))}
      </div>

      <div className="flex items-center gap-2.5">
        <Link
          href="/login"
          className="rounded-md px-3.5 py-2 text-[13px] text-[#a8b1bd] transition-colors hover:text-[#f0f3f7]"
        >
          Sign in
        </Link>
        <Link
          href="/login"
          className="rounded-md bg-[#22d3ee] px-3.5 py-2 text-[13px] font-semibold text-[#06080b] transition-[box-shadow,transform] hover:-translate-y-px hover:shadow-[0_0_24px_rgba(34,211,238,0.4)]"
        >
          Get started
        </Link>
      </div>
    </nav>
  );
}
