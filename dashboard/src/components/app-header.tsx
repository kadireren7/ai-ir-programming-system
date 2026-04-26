"use client";

import { usePathname, useRouter } from "next/navigation";
import { titleForPath } from "@/lib/nav";
import { AppMobileNav } from "@/components/app-mobile-nav";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import Link from "next/link";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { getBrowserSupabase } from "@/lib/supabase/client";

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
    if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
    return parts[0].slice(0, 2).toUpperCase();
  }
  const local = email.split("@")[0] ?? "?";
  return local.slice(0, 2).toUpperCase();
}

export function AppHeader({ orgName, user }: AppHeaderProps) {
  const pathname = usePathname();
  const router = useRouter();
  const title = titleForPath(pathname);
  const runMatch = pathname.match(/^\/validation\/([^/]+)$/);
  const runId = runMatch?.[1];

  const scanHistory = pathname.startsWith("/scan/history");
  const scanDetailMatch = pathname.match(/^\/scan\/([^/]+)$/);
  const scanDetailId =
    scanDetailMatch && scanDetailMatch[1] !== "history" ? scanDetailMatch[1] : null;
  const onScanSection = pathname.startsWith("/scan");

  async function signOut() {
    const supabase = getBrowserSupabase();
    await supabase?.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  return (
    <header className="sticky top-0 z-30 flex h-14 shrink-0 items-center gap-3 border-b border-border bg-background/80 px-4 backdrop-blur-md supports-[backdrop-filter]:bg-background/70">
      <AppMobileNav orgName={orgName} />
      <Breadcrumb className="hidden min-w-0 sm:flex">
        <BreadcrumbList className="flex-wrap">
          <BreadcrumbItem>
            <BreadcrumbLink asChild>
              <Link href="/" className="text-muted-foreground hover:text-foreground">
                Dashboard
              </Link>
            </BreadcrumbLink>
          </BreadcrumbItem>
          {pathname !== "/" && (
            <>
              <BreadcrumbSeparator />
              {runId ? (
                <>
                  <BreadcrumbItem>
                    <BreadcrumbLink asChild>
                      <Link href="/validation" className="text-muted-foreground hover:text-foreground">
                        Validation
                      </Link>
                    </BreadcrumbLink>
                  </BreadcrumbItem>
                  <BreadcrumbSeparator />
                  <BreadcrumbItem>
                    <BreadcrumbPage className="max-w-[160px] truncate font-medium">{runId}</BreadcrumbPage>
                  </BreadcrumbItem>
                </>
              ) : scanHistory ? (
                <BreadcrumbItem>
                  <BreadcrumbPage className="font-medium">Scan history</BreadcrumbPage>
                </BreadcrumbItem>
              ) : scanDetailId ? (
                <>
                  <BreadcrumbItem>
                    <BreadcrumbLink asChild>
                      <Link href="/scan" className="text-muted-foreground hover:text-foreground">
                        Scan
                      </Link>
                    </BreadcrumbLink>
                  </BreadcrumbItem>
                  <BreadcrumbSeparator />
                  <BreadcrumbItem>
                    <BreadcrumbPage className="max-w-[140px] truncate font-mono text-xs font-medium">
                      {scanDetailId}
                    </BreadcrumbPage>
                  </BreadcrumbItem>
                </>
              ) : onScanSection ? (
                <BreadcrumbItem>
                  <BreadcrumbPage className="font-medium">{title}</BreadcrumbPage>
                </BreadcrumbItem>
              ) : (
                <BreadcrumbItem>
                  <BreadcrumbPage className="font-medium">{title}</BreadcrumbPage>
                </BreadcrumbItem>
              )}
            </>
          )}
        </BreadcrumbList>
      </Breadcrumb>
      <div className="min-w-0 flex-1 sm:hidden">
        <h1 className="truncate text-sm font-semibold">
          {runId ? `Run ${runId}` : scanDetailId ? "Scan report" : title}
        </h1>
      </div>
      <div className="ml-auto flex items-center gap-2">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="relative h-9 gap-2 rounded-full pl-2 pr-1">
              <span className="hidden max-w-[120px] truncate text-xs text-muted-foreground sm:inline">
                {user?.displayName || user?.email || "Guest"}
              </span>
              <Avatar className="h-8 w-8 border border-border">
                <AvatarFallback className="bg-primary/10 text-xs font-medium text-primary">
                  {user ? initialsFrom(user.email, user.displayName) : "?"}
                </AvatarFallback>
              </Avatar>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuLabel className="font-normal">
              {user ? (
                <>
                  <p className="text-sm font-medium">{user.displayName || "Signed in"}</p>
                  <p className="truncate text-xs text-muted-foreground">{user.email}</p>
                </>
              ) : (
                <p className="text-xs text-muted-foreground">Not signed in (Supabase off or bypass)</p>
              )}
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            {user ? (
              <DropdownMenuItem onClick={() => void signOut()}>Sign out</DropdownMenuItem>
            ) : (
              <DropdownMenuItem asChild>
                <Link href="/login">Sign in</Link>
              </DropdownMenuItem>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
