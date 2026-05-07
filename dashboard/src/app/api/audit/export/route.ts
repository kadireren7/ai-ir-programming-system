import { NextResponse } from "next/server";
import { createClient, isSupabaseConfigured } from "@/lib/supabase/server";
import { resolveGovernanceScope } from "@/lib/governance/scope";
import {
  attachRequestIdHeader,
  jsonDatabaseErrorResponse,
  jsonErrorResponse,
} from "@/lib/api-json-error";
import { getOrCreateRequestId } from "@/lib/api-request-id";
import { buildAuditCsv, type ExportRowInput } from "@/lib/audit/export-csv";
import type { GovernanceDecisionRow, GovernanceDecisionType } from "@/lib/governance/types";
import { generateAuditReportPdfBuffer } from "@/lib/pdf/audit-report-pdf";

export const runtime = "nodejs";

const MAX_EXPORT_ROWS = 5000;

function parseIso(raw: string | null): string | null {
  if (!raw) return null;
  const t = Date.parse(raw);
  if (!Number.isFinite(t)) return null;
  return new Date(t).toISOString();
}

/**
 * Compliance export — returns the active scope's audit log as CSV (default)
 * or JSON. Honours the same filters as the decisions API. Useful for
 * exporting evidence for an external audit, board review, or SOC2 control.
 */
export async function GET(request: Request) {
  const requestId = getOrCreateRequestId(request);
  if (!isSupabaseConfigured()) {
    return jsonErrorResponse(503, "Audit export requires Supabase", requestId, "service_unavailable");
  }
  const supabase = await createClient();
  if (!supabase) return jsonDatabaseErrorResponse(requestId);

  const scope = await resolveGovernanceScope(supabase);
  if (!scope.userId) return jsonErrorResponse(401, "Sign in required", requestId);

  const url = new URL(request.url);
  const format = (url.searchParams.get("format") ?? "csv").toLowerCase();
  if (format !== "csv" && format !== "json" && format !== "pdf") {
    return jsonErrorResponse(400, "format must be 'csv', 'json', or 'pdf'", requestId);
  }
  const since = parseIso(url.searchParams.get("since"));
  const until = parseIso(url.searchParams.get("until"));
  const decisionType = url.searchParams.get("type") as GovernanceDecisionType | null;
  const actor = url.searchParams.get("actor");
  const signature = url.searchParams.get("signature");

  let query = supabase
    .from("governance_decisions")
    .select(
      "id, scan_id, finding_signature, decision_type, mode, actor_user_id, rationale, payload, created_at, organization_id"
    )
    .order("created_at", { ascending: false })
    .limit(MAX_EXPORT_ROWS);

  if (scope.organizationId) {
    query = query.eq("organization_id", scope.organizationId);
  } else {
    query = query.is("organization_id", null).eq("user_id", scope.userId);
  }
  if (decisionType) query = query.eq("decision_type", decisionType);
  if (actor) query = query.eq("actor_user_id", actor);
  if (signature) query = query.eq("finding_signature", signature);
  if (since) query = query.gte("created_at", since);
  if (until) query = query.lte("created_at", until);

  const { data, error } = await query;
  if (error) return jsonDatabaseErrorResponse(requestId);

  const rows = (data ?? []) as Array<
    GovernanceDecisionRow & { organization_id: string | null }
  >;

  // Resolve actor display names.
  const actorIds = Array.from(new Set(rows.map((r) => r.actor_user_id).filter(Boolean)));
  const actors: Record<string, string | null> = {};
  if (actorIds.length > 0) {
    const { data: profiles } = await supabase
      .from("profiles")
      .select("id, display_name")
      .in("id", actorIds);
    if (Array.isArray(profiles)) {
      for (const p of profiles as Array<{ id: string; display_name: string | null }>) {
        actors[p.id] = p.display_name;
      }
    }
  }

  const today = new Date().toISOString().slice(0, 10);
  const scopeShape = scope.organizationId
    ? ({ type: "organization" as const, id: scope.organizationId })
    : ({ type: "personal" as const, userId: scope.userId! });

  if (format === "json") {
    const payload = {
      generated_at: new Date().toISOString(),
      scope: scopeShape,
      filters: { since, until, decisionType, actor, signature },
      total: rows.length,
      capped: rows.length === MAX_EXPORT_ROWS,
      rows: rows.map((r) => ({
        ...r,
        actor_display_name: actors[r.actor_user_id] ?? null,
      })),
    };
    const res = NextResponse.json(payload);
    res.headers.set("content-disposition", `attachment; filename="torqa-audit-${today}.json"`);
    return attachRequestIdHeader(res, requestId);
  }

  if (format === "pdf") {
    try {
      const buf = await generateAuditReportPdfBuffer({
        generated_at: new Date().toISOString(),
        scope: scopeShape,
        filters: { since, until, decisionType, actor },
        rows: rows.map((r) => ({
          id: r.id,
          decision_type: r.decision_type,
          finding_signature: r.finding_signature ?? null,
          mode: r.mode ?? null,
          actor_user_id: r.actor_user_id,
          actor_display_name: actors[r.actor_user_id] ?? null,
          rationale: r.rationale ?? null,
          created_at: r.created_at,
        })),
        capped: rows.length === MAX_EXPORT_ROWS,
      });
      return new NextResponse(new Uint8Array(buf), {
        status: 200,
        headers: {
          "content-type": "application/pdf",
          "content-disposition": `attachment; filename="torqa-audit-${today}.pdf"`,
          "cache-control": "private, no-store",
          "x-request-id": requestId,
        },
      });
    } catch (e) {
      console.error("[audit/export] PDF generation failed:", e);
      return jsonErrorResponse(500, "PDF generation failed", requestId);
    }
  }

  const inputs: ExportRowInput[] = rows.map((r) => ({
    row: r,
    actorDisplayName: actors[r.actor_user_id] ?? null,
  }));
  const csv = buildAuditCsv(inputs);
  const res = new NextResponse(csv, {
    status: 200,
    headers: {
      "content-type": "text/csv; charset=utf-8",
      "content-disposition": `attachment; filename="torqa-audit-${today}.csv"`,
      "x-request-id": requestId,
    },
  });
  return res;
}
