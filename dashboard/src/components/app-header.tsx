"use client";

import { usePathname, useRouter } from "next/navigation";
import { titleForPath } from "@/lib/nav";
import { AppMobileNav } from "@/components/app-mobile-nav";
import Link from "next/link";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { getBrowserSupabase } from "@/lib/supabase/client";
import { NotificationBell } from "@/components/notification-bell";
import { ThemeToggle } from "@/components/theme-toggle";
import { hasPublicSupabaseUrl } from "@/lib/env";

export type AppHeaderUser = {
  email: string;
  displayName: string | null;
} | null;

type AppHeaderProps = {
  orgName: string;
  user: AppHeaderUser;
};

function initialsFrom(email: string, displayName: string | null): string {
  if (displayName?.trim()) {
    const parts = displayName.trim().split(/\s+/);
    if (parts.length >= 2) return (parts[0][0]! + parts[1][0]!).toUpperCase();
    return parts[0]!.slice(0, 2).toUpperCase();
  }
  const local = email.split("@")[0] ?? "?";
  return local.slice(0, 2).toUpperCase();
}

const hasSupabaseEnv = hasPublicSupabaseUrl();

export function AppHeader({ orgName, user }: AppHeaderProps) {
  const pathname = usePathname();
  const router = useRouter();
  const title = titleForPath(pathname);
  const notificationsEnabled = !hasSupabaseEnv || Boolean(user);

  const scanDetailMatch = pathname.match(/^\/scan\/([^/]+)$/);
  const scanDetailId = scanDetailMatch && scanDetailMatch[1] !== "history" ? scanDetailMatch[1] : null;

  async function signOut() {
    const supabase = getBrowserSupabase();
    await supabase?.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  const pageLabel = scanDetailId ? "Scan report" : title;

  const initials = user ? initialsFrom(user.email, user.displayName) : "?";
  const displayName = user?.displayName || user?.email?.split("@")[0] || "Guest";

  return (
    <header
      className="sticky top-0 z-30 flex h-[56px] shrink-0 items-center gap-4 px-5"
      style={{
        background: "rgba(9,9,13,0.85)",
        backdropFilter: "blur(16px)",
        WebkitBackdropFilter: "blur(16px)",
        borderBottom: "1px solid var(--line)",
      }}
    >
      <AppMobileNav orgName={orgName} />

      {/* Page title */}
      <div className="flex min-w-0 flex-1 items-center gap-2">
        {scanDetailId ? (
          <div className="flex items-center gap-2 text-[13px]">
            <Link href="/scan" className="text-[var(--fg-3)] transition-colors hover:text-[var(--fg-2)]">
              Scan
            </Link>
            <span className="text-[var(--fg-4)]">/</span>
            <span className="font-mono text-[11px] text-[var(--fg-2)] opacity-70">{scanDetailId.slice(0, 8)}…</span>
          </div>
        ) : (
          <h1 className="text-[13px] font-medium text-[var(--fg-2)]">{pageLabel}</h1>
        )}
      </div>

      {/* Right actions */}
      <div className="flex items-center gap-1.5">
        <ThemeToggle />
        <NotificationBell enabled={notificationsEnabled} />

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              className="flex h-8 w-8 items-center justify-center rounded-full text-[12px] font-semibold transition-all hover:ring-2 hover:ring-white/10 focus:outline-none"
              style={{
                background: "rgba(249,115,22,0.12)",
                color: "var(--accent)",
                border: "1px solid rgba(249,115,22,0.2)",
              }}
            >
              {initials}
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            align="end"
            className="w-52 border-[var(--line)]"
            style={{ background: "var(--surface-1)" }}
          >
            <div className="px-3 py-2">
              <p className="text-[13px] font-medium text-[var(--fg-1)]">{displayName}</p>
              {user?.email && (
                <p className="truncate text-[11px] text-[var(--fg-3)]">{user.email}</p>
              )}
            </div>
            <DropdownMenuSeparator style={{ background: "var(--line)" }} />
            <DropdownMenuItem asChild>
              <Link href="/settings" className="cursor-pointer text-[13px] text-[var(--fg-2)]">
                Settings
              </Link>
            </DropdownMenuItem>
            <DropdownMenuSeparator style={{ background: "var(--line)" }} />
            {user ? (
              <DropdownMenuItem
                onClick={() => void signOut()}
                className="cursor-pointer text-[13px] text-[var(--fg-3)]"
              >
                Sign out
              </DropdownMenuItem>
            ) : (
              <DropdownMenuItem asChild>
                <Link href="/login" className="cursor-pointer text-[13px]">
                  Sign in
                </Link>
              </DropdownMenuItem>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
