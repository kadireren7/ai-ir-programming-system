import Link from "next/link";
import { History } from "lucide-react";
import { EmptyStateCta } from "@/components/onboarding/empty-state-cta";
import { GovernanceJourneyStrip } from "@/components/onboarding/governance-journey-strip";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { isSupabaseConfigured } from "@/lib/env";
import { createClient } from "@/lib/supabase/server";
import { getActiveOrganizationId } from "@/lib/workspace-scope";

export const dynamic = "force-dynamic";

type ScanRow = {
  id: string;
  user_id: string;
  source: string;
  workflow_name: string | null;
  organization_id: string | null;
  created_at: string;
  result: unknown;
};

export default async function ScanHistoryPage({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  if (!isSupabaseConfigured()) {
    return (
      <div className="space-y-8 pb-10">
        <div className="space-y-4 border-b border-border/60 pb-8">
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Monitor</p>
            <h1 className="mt-1 text-2xl font-semibold tracking-tight sm:text-3xl">Scan history</h1>
            <p className="mt-2 max-w-xl text-sm text-muted-foreground">
              Saved reports from each run — needs Supabase to persist.
            </p>
          </div>
          <GovernanceJourneyStrip />
        </div>
        <EmptyStateCta
          icon={History}
          title="Cloud storage not configured"
          description="Set Supabase env vars on the dashboard so scans save per user and appear here."
          primary={{ href: "/overview", label: "Overview" }}
          secondary={{ href: "/scan", label: "Try scan" }}
        />
      </div>
    );
  }

  const supabase = await createClient();
  if (!supabase) {
    return null;
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return null;
  }

  const params = (await searchParams) ?? {};
  const scopeRaw = Array.isArray(params.scope) ? params.scope[0] : params.scope;
  const memberRaw = Array.isArray(params.member) ? params.member[0] : params.member;
  const scope = scopeRaw === "workspace" || scopeRaw === "all" || scopeRaw === "mine" ? scopeRaw : "workspace";

  const activeOrg = await getActiveOrganizationId();
  let historyQuery = supabase
    .from("scan_history")
    .select("id, user_id, source, workflow_name, organization_id, created_at, result");
  let members: Array<{ user_id: string; email: string }> = [];
  if (activeOrg) {
    const { data: membership } = await supabase
      .from("organization_members")
      .select("organization_id")
      .eq("organization_id", activeOrg)
      .eq("user_id", user.id)
      .maybeSingle();
    if (membership) {
      if (scope === "mine") {
        historyQuery = historyQuery.eq("user_id", user.id);
      } else if (scope === "all") {
        historyQuery = historyQuery.or(`organization_id.eq.${activeOrg},and(user_id.eq.${user.id},organization_id.is.null)`);
      } else {
        historyQuery = historyQuery.eq("organization_id", activeOrg);
      }
      if (memberRaw && /^[0-9a-f-]{36}$/i.test(memberRaw)) {
        historyQuery = historyQuery.eq("organization_id", activeOrg).eq("user_id", memberRaw);
      }
      const { data: m } = await supabase.rpc("workspace_members", { p_organization_id: activeOrg });
      members =
        (m as Array<{ user_id: string; email: string }> | null)?.filter(
          (row) => typeof row.user_id === "string" && typeof row.email === "string"
        ) ?? [];
    } else {
      historyQuery = historyQuery.is("organization_id", null).eq("user_id", user.id);
    }
  } else {
    historyQuery = historyQuery.is("organization_id", null).eq("user_id", user.id);
  }

  const { data: rows, error } = await historyQuery.order("created_at", { ascending: false }).limit(100);

  if (error) {
    return (
      <div className="space-y-4">
        <h1 className="text-2xl font-semibold tracking-tight">Scan history</h1>
        <p className="text-sm text-destructive">Could not load history: {error.message}</p>
        <p className="text-xs text-muted-foreground">
          Apply the migration that creates <code className="font-mono">scan_history</code> (see{" "}
          <code className="font-mono">supabase/migrations/</code>).
        </p>
      </div>
    );
  }

  const list = (rows ?? []) as ScanRow[];

  return (
    <div className="space-y-8 pb-10">
      <div className="space-y-5 border-b border-border/60 pb-8">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Monitor</p>
            <h1 className="mt-1 text-2xl font-semibold tracking-tight sm:text-3xl">Scan history</h1>
            <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
              Reopen any saved report — same summary and findings as when you ran it.
            </p>
          </div>
          <Link
            href="/scan"
            className="inline-flex shrink-0 items-center gap-2 text-sm font-medium text-primary hover:underline"
          >
            <History className="h-4 w-4" />
            New scan
          </Link>
        </div>
        <GovernanceJourneyStrip />
      </div>

      <Card className="border-border/80 shadow-sm">
        <CardHeader>
          <CardTitle className="text-base">Visibility filters</CardTitle>
          <CardDescription>Mine, workspace, or all — filter by member in team scope.</CardDescription>
        </CardHeader>
        <CardContent>
          <form method="get" className="grid gap-3 sm:grid-cols-3">
            <div className="space-y-1">
              <label htmlFor="scope" className="text-xs font-medium text-muted-foreground">
                Scope
              </label>
              <select
                id="scope"
                name="scope"
                defaultValue={scope}
                className="flex h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
              >
                <option value="mine">Mine</option>
                <option value="workspace">Workspace</option>
                <option value="all">All</option>
              </select>
            </div>
            <div className="space-y-1">
              <label htmlFor="member" className="text-xs font-medium text-muted-foreground">
                Member
              </label>
              <select
                id="member"
                name="member"
                defaultValue={typeof memberRaw === "string" ? memberRaw : ""}
                className="flex h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
              >
                <option value="">Any member</option>
                {members.map((m) => (
                  <option key={m.user_id} value={m.user_id}>
                    {m.email}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex items-end gap-2">
              <button
                type="submit"
                className="inline-flex h-9 items-center justify-center rounded-md bg-primary px-3 text-sm font-medium text-primary-foreground"
              >
                Apply
              </button>
              <Link
                href="/scan/history"
                className="inline-flex h-9 items-center justify-center rounded-md border border-input px-3 text-sm"
              >
                Reset
              </Link>
            </div>
          </form>
        </CardContent>
      </Card>

      <Card className="border-border/80 shadow-sm">
        <CardHeader>
          <CardTitle className="text-lg">Saved scans</CardTitle>
          <CardDescription>
            Newest first — respects your{" "}
            <Link href="/workspace" className="text-primary underline-offset-2 hover:underline">
              active workspace
            </Link>
            .
          </CardDescription>
        </CardHeader>
        <CardContent className="px-0 pb-2">
          {list.length === 0 ? (
            <div className="px-4 pb-6 pt-2 sm:px-6">
              <EmptyStateCta
                icon={History}
                title="No saved scans yet"
                description="Run a scan to store a report you can reopen anytime."
                primary={{ href: "/scan", label: "Run scan" }}
                secondary={{ href: "/workflow-library", label: "Workflow library" }}
                className="border-border/60 bg-muted/20"
              />
            </div>
          ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead className="pl-6">When</TableHead>
                        <TableHead>Source</TableHead>
                        <TableHead>Member</TableHead>
                  <TableHead>Workflow</TableHead>
                  <TableHead>Outcome</TableHead>
                  <TableHead className="pr-6 text-right">Open</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {list.map((row) => {
                  const r = row.result as { status?: string; riskScore?: number } | null;
                  const status = r?.status ?? "—";
                  return (
                    <TableRow key={row.id} className="border-border/60">
                      <TableCell className="pl-6 text-xs text-muted-foreground">
                        {new Date(row.created_at).toLocaleString()}
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary" className="font-normal capitalize">
                          {row.source}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {row.user_id === user.id ? "Me" : members.find((m) => m.user_id === row.user_id)?.email ?? "Member"}
                      </TableCell>
                      <TableCell className="max-w-[200px] truncate text-sm">
                        {row.workflow_name ?? "—"}
                      </TableCell>
                      <TableCell className="text-sm">{status}</TableCell>
                      <TableCell className="pr-6 text-right">
                        <Link
                          href={`/scan/${row.id}`}
                          className="font-mono text-xs text-primary hover:underline"
                        >
                          View
                        </Link>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
