import Link from "next/link";
import { Play } from "lucide-react";
import { EmptyStateCta } from "@/components/onboarding/empty-state-cta";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { isSupabaseConfigured } from "@/lib/env";
import { createClient } from "@/lib/supabase/server";
import { getActiveOrganizationId } from "@/lib/workspace-scope";
import { ScanOutcomeBadge } from "@/components/scan-outcome-badge";
import { FadeUp } from "@/components/motion/fade-up";

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

function triggerType(source: string): string {
  if (source === "schedule") return "Schedule";
  if (source === "webhook" || source === "github") return "Webhook";
  if (source === "api") return "API";
  if (source === "pr") return "PR";
  return "Manual";
}

export default async function RunsPage() {
  if (!isSupabaseConfigured()) {
    return (
      <div className="space-y-8 pb-10">
        <FadeUp>
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-foreground/50">Monitor</p>
            <h1 className="mt-1 text-3xl font-bold tracking-tight">Runs</h1>
            <p className="mt-1.5 max-w-xl text-sm text-foreground/60">
              Every scan run — manual, scheduled, webhook, PR, or API triggered.
            </p>
          </div>
        </FadeUp>
        <EmptyStateCta
          icon={Play}
          title="Cloud storage not configured"
          description="Set Supabase env vars to persist run history per user."
          primary={{ href: "/overview", label: "Overview" }}
          secondary={{ href: "/advanced/manual-scan", label: "Manual scan" }}
        />
      </div>
    );
  }

  const supabase = await createClient();
  if (!supabase) return null;

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const activeOrg = await getActiveOrganizationId();
  let query = supabase
    .from("scan_history")
    .select("id, user_id, source, workflow_name, organization_id, created_at, result");

  if (activeOrg) {
    query = query.eq("organization_id", activeOrg);
  } else {
    query = query.is("organization_id", null).eq("user_id", user.id);
  }

  const { data: rows, error } = await query.order("created_at", { ascending: false }).limit(100);

  if (error) {
    return (
      <div className="space-y-4">
        <h1 className="text-3xl font-bold tracking-tight">Runs</h1>
        <p className="text-sm text-destructive">Could not load runs: {error.message}</p>
      </div>
    );
  }

  const list = (rows ?? []) as ScanRow[];

  return (
    <div className="space-y-8 pb-10">
      <FadeUp>
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-foreground/50">Monitor</p>
            <h1 className="mt-1 text-3xl font-bold tracking-tight">Runs</h1>
            <p className="mt-1.5 max-w-xl text-sm text-foreground/60">
              Every scan run — manual, scheduled, webhook, PR, or API triggered.
            </p>
          </div>
          <Button asChild size="sm">
            <Link href="/advanced/manual-scan">Manual scan</Link>
          </Button>
        </div>
      </FadeUp>

      {list.length === 0 ? (
        <FadeUp delay={0.1}>
          <EmptyStateCta
            icon={Play}
            title="No runs yet"
            description="Connect a source or run a manual scan to start."
            primary={{ href: "/sources", label: "Connect a source" }}
            secondary={{ href: "/advanced/manual-scan", label: "Manual scan" }}
            className="border-border/60 bg-muted/20"
          />
        </FadeUp>
      ) : (
        <FadeUp delay={0.1}>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {list.map((row) => {
              const r = row.result as { status?: string; riskScore?: number } | null;
              return (
                <Card
                  key={row.id}
                  className="border-border/70 bg-card/60 shadow-sm transition-all hover:shadow-md hover:-translate-y-0.5"
                >
                  <CardContent className="space-y-3 pt-4">
                    <div className="flex items-center justify-between gap-2">
                      <Badge variant="secondary" className="font-normal capitalize">
                        {row.source}
                      </Badge>
                      <ScanOutcomeBadge status={r?.status ?? "unknown"} />
                    </div>

                    <p className="truncate text-sm font-medium">
                      {row.workflow_name ?? "Untitled workflow"}
                    </p>

                    <div className="flex items-center justify-between text-xs text-foreground/50">
                      <span>{triggerType(row.source)} · Risk {r?.riskScore ?? "—"}</span>
                      <span>{new Date(row.created_at).toLocaleString()}</span>
                    </div>

                    <Link
                      href={`/scan/${row.id}`}
                      className="block text-xs font-medium text-primary underline-offset-4 hover:underline"
                    >
                      View report →
                    </Link>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </FadeUp>
      )}
    </div>
  );
}
