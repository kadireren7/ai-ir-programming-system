import { isScanApiSuccess } from "@/lib/scan-api-guards";
import { isSupabaseConfigured } from "@/lib/env";
import { createClient } from "@/lib/supabase/server";
import { getActiveOrganizationId } from "@/lib/workspace-scope";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { HomeDashboardData, HomeOnboardingCounts, HomeRecentScan, RiskTrendPoint } from "./types";
import { MOCK_HOME_DASHBOARD } from "./home-mock";

type ScanHistoryRow = {
  id: string;
  workflow_name: string | null;
  source: string;
  result: unknown;
  created_at: string;
};

function utcDayKey(iso: string): string {
  return iso.slice(0, 10);
}

function labelForUtcDay(day: string): string {
  return new Date(`${day}T12:00:00.000Z`).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  });
}

function emptyTrend14(): RiskTrendPoint[] {
  const out: RiskTrendPoint[] = [];
  for (let i = 13; i >= 0; i--) {
    const d = new Date();
    d.setUTCDate(d.getUTCDate() - i);
    const key = d.toISOString().slice(0, 10);
    out.push({ date: labelForUtcDay(key), safe: 0, needsReview: 0, blocked: 0 });
  }
  return out;
}

function buildOutcomeTrend(rows: ScanHistoryRow[], sinceIso: string): RiskTrendPoint[] {
  const keys: string[] = [];
  for (let i = 13; i >= 0; i--) {
    const d = new Date();
    d.setUTCDate(d.getUTCDate() - i);
    keys.push(d.toISOString().slice(0, 10));
  }
  const acc = new Map<string, { safe: number; needsReview: number; blocked: number }>();
  for (const k of keys) {
    acc.set(k, { safe: 0, needsReview: 0, blocked: 0 });
  }

  for (const row of rows) {
    if (row.created_at < sinceIso) continue;
    const day = utcDayKey(row.created_at);
    const bucket = acc.get(day);
    if (!bucket || !isScanApiSuccess(row.result)) continue;
    const st = row.result.status;
    if (st === "PASS") bucket.safe += 1;
    else if (st === "FAIL") bucket.blocked += 1;
    else bucket.needsReview += 1;
  }

  return keys.map((k) => {
    const b = acc.get(k)!;
    return { date: labelForUtcDay(k), safe: b.safe, needsReview: b.needsReview, blocked: b.blocked };
  });
}

function rowToRecent(row: ScanHistoryRow): HomeRecentScan | null {
  if (row.source !== "n8n" && row.source !== "generic") return null;
  if (!isScanApiSuccess(row.result)) return null;
  const r = row.result;
  return {
    id: row.id,
    workflowName: row.workflow_name,
    source: row.source,
    status: r.status,
    riskScore: r.riskScore,
    createdAt: row.created_at,
  };
}

function aggregateRows(rows: ScanHistoryRow[], since14: string) {
  let pass = 0;
  let fail = 0;
  let review = 0;
  let sumRisk = 0;
  let nRisk = 0;

  for (const row of rows) {
    if (!isScanApiSuccess(row.result)) continue;
    const r = row.result;
    if (r.status === "PASS") pass += 1;
    else if (r.status === "FAIL") fail += 1;
    else review += 1;
    sumRisk += r.riskScore;
    nRisk += 1;
  }

  const outcomeTrend = buildOutcomeTrend(rows, since14);

  return {
    passCount: pass,
    failCount: fail,
    reviewCount: review,
    avgTrustScore: nRisk > 0 ? Math.round(sumRisk / nRisk) : null,
    outcomeTrend,
  };
}

function scopedCountQuery(
  supabase: SupabaseClient,
  table: "integrations" | "workflow_templates" | "workspace_policies" | "alert_destinations",
  userId: string,
  orgId: string | null
) {
  let q = supabase.from(table).select("*", { count: "exact", head: true });
  if (orgId) {
    q = q.eq("organization_id", orgId);
  } else {
    q = q.is("organization_id", null).eq("user_id", userId);
  }
  return q;
}

async function fetchOnboardingCounts(
  supabase: SupabaseClient,
  userId: string,
  orgId: string | null
): Promise<HomeOnboardingCounts> {
  try {
    const [intRes, tplRes, polRes, destRes] = await Promise.all([
      scopedCountQuery(supabase, "integrations", userId, orgId),
      scopedCountQuery(supabase, "workflow_templates", userId, orgId),
      scopedCountQuery(supabase, "workspace_policies", userId, orgId),
      scopedCountQuery(supabase, "alert_destinations", userId, orgId),
    ]);
    let organizationMembers = 0;
    if (orgId) {
      const { count } = await supabase
        .from("organization_members")
        .select("*", { count: "exact", head: true })
        .eq("organization_id", orgId);
      organizationMembers = count ?? 0;
    }
    return {
      integrations: intRes.count ?? 0,
      workflowTemplates: tplRes.count ?? 0,
      workspacePolicies: polRes.count ?? 0,
      alertDestinations: destRes.count ?? 0,
      organizationMembers,
    };
  } catch {
    return {
      integrations: 0,
      workflowTemplates: 0,
      workspacePolicies: 0,
      alertDestinations: 0,
      organizationMembers: 0,
    };
  }
}

async function resolvedWorkspaceScope(
  supabase: SupabaseClient,
  userId: string
): Promise<{ value: string } | { value: null }> {
  const activeOrg = await getActiveOrganizationId();
  if (!activeOrg) {
    return { value: null };
  }
  const { data: membership } = await supabase
    .from("organization_members")
    .select("organization_id")
    .eq("organization_id", activeOrg)
    .eq("user_id", userId)
    .maybeSingle();
  if (membership) {
    return { value: activeOrg };
  }
  return { value: null };
}

/**
 * Homepage metrics: live from `scan_history` when Supabase + session exist; otherwise demo mock.
 */
export async function getHomeDashboardData(): Promise<HomeDashboardData> {
  if (!isSupabaseConfigured()) {
    return MOCK_HOME_DASHBOARD;
  }

  const supabase = await createClient();
  if (!supabase) {
    return MOCK_HOME_DASHBOARD;
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return MOCK_HOME_DASHBOARD;
  }

  const thirtyDaysAgo = new Date(Date.now() - 30 * 86_400_000).toISOString();
  const fourteenDaysAgo = new Date(Date.now() - 14 * 86_400_000).toISOString();

  const scope = await resolvedWorkspaceScope(supabase, user.id);

  const headAll =
    scope.value === null
      ? supabase.from("scan_history").select("*", { count: "exact", head: true }).is("organization_id", null)
      : supabase.from("scan_history").select("*", { count: "exact", head: true }).eq("organization_id", scope.value);

  const head30 =
    scope.value === null
      ? supabase
          .from("scan_history")
          .select("*", { count: "exact", head: true })
          .is("organization_id", null)
          .gte("created_at", thirtyDaysAgo)
      : supabase
          .from("scan_history")
          .select("*", { count: "exact", head: true })
          .eq("organization_id", scope.value)
          .gte("created_at", thirtyDaysAgo);

  const rowsBase = supabase.from("scan_history").select("id, workflow_name, source, result, created_at");
  const rowsQuery =
    scope.value === null
      ? rowsBase.is("organization_id", null).order("created_at", { ascending: false }).limit(2000)
      : rowsBase.eq("organization_id", scope.value).order("created_at", { ascending: false }).limit(2000);

  const [allCountRes, d30CountRes, rowsRes, onboarding] = await Promise.all([
    headAll,
    head30,
    rowsQuery,
    fetchOnboardingCounts(supabase, user.id, scope.value),
  ]);

  if (allCountRes.error || d30CountRes.error || rowsRes.error) {
    return { ...MOCK_HOME_DASHBOARD, mode: "mock" };
  }

  const rows = (rowsRes.data ?? []) as ScanHistoryRow[];
  const savedReportsAllTime = allCountRes.count ?? 0;
  const totalScans30d = d30CountRes.count ?? 0;

  if (rows.length === 0) {
    return {
      mode: "supabase",
      totalScans30d,
      savedReportsAllTime,
      avgTrustScore: null,
      passCount: 0,
      failCount: 0,
      reviewCount: 0,
      recentScans: [],
      outcomeTrend: emptyTrend14(),
      onboarding,
    };
  }

  const { passCount, failCount, reviewCount, avgTrustScore, outcomeTrend } = aggregateRows(
    rows,
    fourteenDaysAgo
  );

  const recentScans: HomeRecentScan[] = [];
  for (const row of rows) {
    const r = rowToRecent(row);
    if (r) recentScans.push(r);
    if (recentScans.length >= 5) break;
  }

  return {
    mode: "supabase",
    totalScans30d,
    savedReportsAllTime,
    avgTrustScore,
    passCount,
    failCount,
    reviewCount,
    recentScans,
    outcomeTrend,
    onboarding,
  };
}
