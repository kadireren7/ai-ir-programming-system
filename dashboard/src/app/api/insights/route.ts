import { NextResponse } from "next/server";
import { isSupabaseConfigured } from "@/lib/env";
import { aggregateInsights, type RawScanHistoryRow } from "@/lib/insights-aggregate";
import { getDemoInsightsPayload } from "@/lib/insights-mock";
import type { InsightsDays, InsightsScanStatus, InsightsScope } from "@/lib/insights-types";
import { getActiveOrganizationId, resolveListOrganizationId } from "@/lib/workspace-scope";
import { createClient } from "@/lib/supabase/server";
import type { PolicyGateStatus } from "@/lib/policy-types";

export const runtime = "nodejs";

function parseDays(v: string | null): InsightsDays {
  if (v === "7" || v === "30" || v === "90") return Number(v) as InsightsDays;
  return 30;
}

function parseStatus(v: string | null): InsightsScanStatus {
  if (v === "PASS" || v === "NEEDS REVIEW" || v === "FAIL") return v;
  return "all";
}

function parsePolicyGate(v: string | null): "all" | PolicyGateStatus {
  if (v === "PASS" || v === "WARN" || v === "FAIL") return v;
  return "all";
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const scope: InsightsScope = url.searchParams.get("scope") === "personal" ? "personal" : "workspace";
  const days = parseDays(url.searchParams.get("days"));
  const status = parseStatus(url.searchParams.get("status"));
  const policyGate = parsePolicyGate(url.searchParams.get("policyGate"));
  const policyNameRaw = url.searchParams.get("policyName");
  const policyName = policyNameRaw && policyNameRaw.trim() && policyNameRaw !== "all" ? policyNameRaw.trim() : null;

  const demo = () =>
    NextResponse.json(
      getDemoInsightsPayload({
        scope,
        days,
        status,
        policyGate,
        policyName,
      })
    );

  if (!isSupabaseConfigured()) {
    return demo();
  }

  const supabase = await createClient();
  if (!supabase) {
    return demo();
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return demo();
  }

  const sinceIso = new Date(Date.now() - days * 86_400_000).toISOString();

  if (scope === "workspace") {
    const orgId = await resolveListOrganizationId(supabase, user.id);
    if (!orgId) {
      return NextResponse.json(
        aggregateInsights([], {
          scope,
          days,
          status,
          policyGate,
          policyName,
          sinceIso,
          mode: "live",
          workspaceRequired: true,
          emailByUserId: {},
        })
      );
    }

    const { data, error } = await supabase
      .from("scan_history")
      .select("user_id, workflow_name, result, created_at")
      .eq("organization_id", orgId)
      .gte("created_at", sinceIso)
      .order("created_at", { ascending: false })
      .limit(3500);
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const emailByUserId: Record<string, string | null> = {};
    const activeOrg = await getActiveOrganizationId();
    if (activeOrg) {
      const { data: m } = await supabase.rpc("workspace_members", { p_organization_id: activeOrg });
      for (const row of (m as { user_id?: string; email?: string }[]) ?? []) {
        if (typeof row.user_id === "string") {
          emailByUserId[row.user_id] = typeof row.email === "string" ? row.email : null;
        }
      }
    }

    const payload = aggregateInsights((data ?? []) as RawScanHistoryRow[], {
      scope,
      days,
      status,
      policyGate,
      policyName,
      sinceIso,
      mode: "live",
      workspaceRequired: false,
      emailByUserId,
    });
    return NextResponse.json(payload);
  }

  const { data, error } = await supabase
    .from("scan_history")
    .select("user_id, workflow_name, result, created_at")
    .is("organization_id", null)
    .gte("created_at", sinceIso)
    .order("created_at", { ascending: false })
    .limit(3500);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const payload = aggregateInsights((data ?? []) as RawScanHistoryRow[], {
    scope,
    days,
    status,
    policyGate,
    policyName,
    sinceIso,
    mode: "live",
    workspaceRequired: false,
    emailByUserId: { [user.id]: user.email ?? null },
  });
  return NextResponse.json(payload);
}
