"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { cn } from "@/lib/utils";
import { mainNavItems } from "@/lib/nav";

type AppMobileNavProps = {
  orgName: string;
};

export function AppMobileNav({ orgName }: AppMobileNavProps) {
  const pathname = usePathname();

  return (
    <Sheet>
      <SheetTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="lg:hidden"
          aria-label="Open menu"
        >
          <Menu className="h-5 w-5" />
        </Button>
      </SheetTrigger>
      <SheetContent side="left" className="w-64 border-border bg-sidebar p-0 text-sidebar-foreground">
        <SheetHeader className="border-b border-sidebar-border px-5 py-4 text-left">
          <SheetTitle className="flex items-center gap-2.5 text-sidebar-foreground">
            <span className="flex h-7 w-7 items-center justify-center rounded-md bg-sidebar-primary text-xs font-bold text-sidebar-primary-foreground">
              T
            </span>
            <span className="font-semibold tracking-tight">Torqa</span>
          </SheetTitle>
          <p className="text-[11px] text-sidebar-foreground/60">{orgName}</p>
        </SheetHeader>

        <nav className="space-y-0.5 p-3">
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
                  "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium",
                  active
                    ? "bg-sidebar-accent text-sidebar-accent-foreground"
                    : "text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-accent-foreground"
                )}
              >
                <Icon className="h-4 w-4 shrink-0" />
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
      </SheetContent>
    </Sheet>
  );
}
