"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import { TorqaLogoMark } from "@/components/torqa-logo";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { getBrowserSupabase } from "@/lib/supabase/client";

export type LandingNavbarUser = {
  email: string;
  displayName: string | null;
} | null;

const navLinks = [
  { label: "Platform", href: "#pillars" },
  { label: "How it works", href: "#flow" },
  { label: "Metrics", href: "#metrics" },
  { label: "Docs", href: "#" },
];

function initialsFrom(email: string, displayName: string | null): string {
  if (displayName?.trim()) {
    const parts = displayName.trim().split(/\s+/);
    if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
    return parts[0].slice(0, 2).toUpperCase();
  }
  const local = email.split("@")[0] ?? "?";
  return local.slice(0, 2).toUpperCase();
}

type LandingNavbarProps = {
  user: LandingNavbarUser;
};

export function LandingNavbar({ user }: LandingNavbarProps) {
  const router = useRouter();
  const [scrolled, setScrolled] = useState(false);

  const onScroll = useCallback(() => setScrolled(window.scrollY > 20), []);

  useEffect(() => {
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [onScroll]);

  async function signOut() {
    const supabase = getBrowserSupabase();
    await supabase?.auth.signOut();
    router.push("/");
    router.refresh();
  }

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
        <TorqaLogoMark size={22} />
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
        {user ? (
          <>
            <Link
              href="/overview"
              className="rounded-md bg-[#22d3ee] px-3.5 py-2 text-[13px] font-semibold text-[#06080b] transition-[box-shadow,transform] hover:-translate-y-px hover:shadow-[0_0_24px_rgba(34,211,238,0.4)]"
            >
              Dashboard
            </Link>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  className="h-9 gap-2 rounded-full border border-[#1f2630] bg-[rgba(6,8,11,0.4)] px-1.5 text-[#f0f3f7] hover:bg-[rgba(255,255,255,0.06)] hover:text-[#f0f3f7]"
                >
                  <span className="hidden max-w-[120px] truncate text-xs text-[#a8b1bd] sm:inline">
                    {user.displayName || user.email}
                  </span>
                  <Avatar className="h-8 w-8 border border-[#1f2630]">
                    <AvatarFallback className="bg-[#22d3ee]/15 text-xs font-medium text-[#67e8f9]">
                      {initialsFrom(user.email, user.displayName)}
                    </AvatarFallback>
                  </Avatar>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel className="font-normal">
                  <p className="text-sm font-medium">{user.displayName || "Signed in"}</p>
                  <p className="truncate text-xs text-muted-foreground">{user.email}</p>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                  <Link href="/overview">Open dashboard</Link>
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => void signOut()}>Sign out</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </>
        ) : (
          <>
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
          </>
        )}
      </div>
    </nav>
  );
}
