"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { mainNavItems } from "@/lib/nav";
import { TorqaLogoMark } from "@/components/torqa-logo";

type AppSidebarProps = {
  orgName: string;
};

export function AppSidebar({ orgName }: AppSidebarProps) {
  const pathname = usePathname();

  return (
    <aside className="hidden w-56 shrink-0 flex-col border-r border-sidebar-border bg-sidebar text-sidebar-foreground lg:flex">
      <div className="flex h-14 items-center gap-2.5 px-5">
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md border border-sidebar-border bg-sidebar-accent/80">
          <TorqaLogoMark size={22} />
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold tracking-tight">Torqa</p>
          <p className="truncate text-[11px] text-sidebar-foreground/60">{orgName}</p>
        </div>
      </div>

      <nav className="flex-1 space-y-0.5 px-3 py-4">
        {mainNavItems.map((item) => {
          const active =
            pathname === item.href ||
            (item.href !== "/overview" && pathname.startsWith(item.href + "/")) ||
            (item.href === "/overview" && pathname === "/overview");
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                active
                  ? "bg-sidebar-accent text-sidebar-accent-foreground"
                  : "text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-accent-foreground"
              )}
            >
              <Icon className="h-4 w-4 shrink-0" aria-hidden />
              <span className="flex-1">{item.title}</span>
              {item.badge ? (
                <span className="rounded border border-primary/30 bg-primary/10 px-1 py-0.5 text-[10px] uppercase tracking-wide text-primary">
                  {item.badge}
                </span>
              ) : null}
            </Link>
          );
        })}
      </nav>

      <div className="border-t border-sidebar-border px-5 py-3">
        <p className="text-[11px] text-sidebar-foreground/70 uppercase tracking-wider">Workflow governance</p>
        <Link
          href="/"
          className="mt-2 inline-flex text-xs font-medium text-sidebar-foreground/80 transition-colors hover:text-sidebar-foreground"
        >
          ← Torqa home
        </Link>
      </div>
    </aside>
  );
}
