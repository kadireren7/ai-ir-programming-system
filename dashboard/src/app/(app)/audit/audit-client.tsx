"use client";

import { useCallback, useEffect, useMemo, useState, type ReactElement } from "react";
import {
  AlertTriangle,
  ArrowDownToLine,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Clock,
  Filter as FilterIcon,
  Loader2,
  RefreshCw,
  ScrollText,
  Search,
  Wand2,
  XCircle,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  describeDecision,
  shortSignature,
  DECISION_TYPES_FOR_FILTERS,
  type DecisionTone,
} from "@/lib/audit/decision-format";
import type { GovernanceDecisionRow, GovernanceDecisionType } from "@/lib/governance/types";

type ActorMap = Record<string, { displayName: string | null }>;

type DecisionsResponse = {
  items?: GovernanceDecisionRow[];
  actors?: ActorMap;
  total?: number | null;
  limit?: number;
  offset?: number;
  error?: string;
};

type StatsResponse = {
  rangeDays?: number;
  totals?: {
    decisions?: number;
    fixes?: number;
    acceptedRisks?: number;
    approvals?: number;
    modeChanges?: number;
    interactiveResponses?: number;
  };
  byDay?: { date: string; count: number }[];
  byType?: Record<string, number>;
  byActor?: { actorUserId: string; displayName: string | null; count: number }[];
  error?: string;
};

type EvidenceResponse = {
  signature?: string;
  decisions?: GovernanceDecisionRow[];
  applied_fixes?: Array<{
    id: string;
    rule_id: string;
    target: string;
    fix_type: string;
    mode: string;
    applied_at: string;
    reverted_at: string | null;
    applied_by: string;
  }>;
  accepted_risks?: Array<{
    id: string;
    rule_id: string;
    target: string;
    severity: string;
    rationale: string;
    accepted_at: string;
    expires_at: string | null;
    revoked_at: string | null;
  }>;
  pending_approvals?: Array<{
    id: string;
    rule_id: string;
    target: string;
    severity: string;
    fix_type: string;
    status: string;
    created_at: string;
    decided_at: string | null;
    decided_rationale: string | null;
  }>;
  actors?: ActorMap;
  first_seen_at?: string | null;
  last_decision_at?: string | null;
  error?: string;
};

const PAGE_SIZE = 50;

function toneBadgeClass(tone: DecisionTone): string {
  switch (tone) {
    case "success":
      return "border-emerald-500/40 bg-emerald-500/10 text-emerald-100";
    case "warning":
      return "border-amber-500/40 bg-amber-500/10 text-amber-100";
    case "danger":
      return "border-rose-500/40 bg-rose-500/10 text-rose-100";
    case "info":
      return "border-sky-500/40 bg-sky-500/10 text-sky-100";
    default:
      return "border-slate-500/40 bg-slate-500/10 text-slate-100";
  }
}

function toneIconClass(tone: DecisionTone): string {
  switch (tone) {
    case "success":
      return "text-emerald-300";
    case "warning":
      return "text-amber-300";
    case "danger":
      return "text-rose-300";
    case "info":
      return "text-sky-300";
    default:
      return "text-slate-300";
  }
}

function actorLabel(actorMap: ActorMap | undefined, id: string): string {
  const v = actorMap?.[id];
  if (v?.displayName) return v.displayName;
  if (id.length > 12) return `${id.slice(0, 8)}…`;
  return id;
}

function formatDateTime(value: string | null | undefined): string {
  if (!value) return "—";
  try {
    return new Date(value).toLocaleString();
  } catch {
    return value;
  }
}

function tinyBar(daySeries: { date: string; count: number }[]): ReactElement {
  const max = daySeries.reduce((acc, d) => Math.max(acc, d.count), 0) || 1;
  return (
    <div className="flex items-end gap-[2px]">
      {daySeries.map((d) => {
        const h = Math.max(2, Math.round((d.count / max) * 28));
        return (
          <div
            key={d.date}
            title={`${d.date}: ${d.count}`}
            className="w-[3px] rounded-sm bg-primary/70"
            style={{ height: `${h}px` }}
          />
        );
      })}
    </div>
  );
}

export function AuditClient() {
  const [items, setItems] = useState<GovernanceDecisionRow[]>([]);
  const [actors, setActors] = useState<ActorMap>({});
  const [stats, setStats] = useState<StatsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [offset, setOffset] = useState(0);
  const [total, setTotal] = useState<number | null>(null);

  const [typeFilter, setTypeFilter] = useState<GovernanceDecisionType | "">("");
  const [actorFilter, setActorFilter] = useState("");
  const [signatureFilter, setSignatureFilter] = useState("");
  const [sinceFilter, setSinceFilter] = useState("");
  const [untilFilter, setUntilFilter] = useState("");
  const [search, setSearch] = useState("");

  const [activeId, setActiveId] = useState<string | null>(null);
  const [evidenceCache, setEvidenceCache] = useState<Record<string, EvidenceResponse>>({});
  const [evidenceLoading, setEvidenceLoading] = useState<string | null>(null);

  const buildQuery = useCallback(
    (overrides?: Partial<{ offset: number }>) => {
      const params = new URLSearchParams();
      params.set("limit", String(PAGE_SIZE));
      params.set("offset", String(overrides?.offset ?? offset));
      if (typeFilter) params.set("type", typeFilter);
      if (actorFilter) params.set("actor", actorFilter);
      if (signatureFilter) params.set("signature", signatureFilter);
      if (sinceFilter) params.set("since", new Date(sinceFilter).toISOString());
      if (untilFilter) params.set("until", new Date(untilFilter).toISOString());
      if (search) params.set("q", search);
      return params.toString();
    },
    [actorFilter, offset, search, signatureFilter, sinceFilter, typeFilter, untilFilter]
  );

  const loadDecisions = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/governance/decisions?${buildQuery()}`, {
        credentials: "same-origin",
      });
      const data = (await res.json().catch(() => null)) as DecisionsResponse | null;
      if (!res.ok || !data) {
        setError(data?.error ?? "Could not load decisions");
        return;
      }
      setItems(Array.isArray(data.items) ? data.items : []);
      setActors(data.actors ?? {});
      setTotal(typeof data.total === "number" ? data.total : null);
    } catch {
      setError("Network error while loading audit log");
    } finally {
      setLoading(false);
    }
  }, [buildQuery]);

  const loadStats = useCallback(async () => {
    try {
      const res = await fetch("/api/audit/stats?days=30", { credentials: "same-origin" });
      if (!res.ok) return;
      const data = (await res.json().catch(() => null)) as StatsResponse | null;
      if (data) setStats(data);
    } catch {
      // Stats are best-effort.
    }
  }, []);

  useEffect(() => {
    void loadDecisions();
  }, [loadDecisions]);

  useEffect(() => {
    void loadStats();
  }, [loadStats]);

  const handleResetFilters = useCallback(() => {
    setTypeFilter("");
    setActorFilter("");
    setSignatureFilter("");
    setSinceFilter("");
    setUntilFilter("");
    setSearch("");
    setOffset(0);
  }, []);

  const handleApplyFilters = useCallback(() => {
    setOffset(0);
    void loadDecisions();
  }, [loadDecisions]);

  const loadEvidence = useCallback(
    async (signature: string) => {
      if (evidenceCache[signature]) return;
      setEvidenceLoading(signature);
      try {
        const res = await fetch(`/api/audit/evidence/${encodeURIComponent(signature)}`, {
          credentials: "same-origin",
        });
        const data = (await res.json().catch(() => null)) as EvidenceResponse | null;
        if (res.ok && data) {
          setEvidenceCache((prev) => ({ ...prev, [signature]: data }));
        }
      } finally {
        setEvidenceLoading(null);
      }
    },
    [evidenceCache]
  );

  const toggleActive = useCallback(
    (row: GovernanceDecisionRow) => {
      const next = activeId === row.id ? null : row.id;
      setActiveId(next);
      if (next && row.finding_signature) {
        void loadEvidence(row.finding_signature);
      }
    },
    [activeId, loadEvidence]
  );

  const exportUrl = useMemo(() => {
    const params = new URLSearchParams();
    params.set("format", "csv");
    if (typeFilter) params.set("type", typeFilter);
    if (actorFilter) params.set("actor", actorFilter);
    if (signatureFilter) params.set("signature", signatureFilter);
    if (sinceFilter) params.set("since", new Date(sinceFilter).toISOString());
    if (untilFilter) params.set("until", new Date(untilFilter).toISOString());
    return `/api/audit/export?${params.toString()}`;
  }, [actorFilter, signatureFilter, sinceFilter, typeFilter, untilFilter]);

  const exportJsonUrl = useMemo(() => exportUrl.replace("format=csv", "format=json"), [exportUrl]);
  const exportPdfUrl = useMemo(() => exportUrl.replace("format=csv", "format=pdf"), [exportUrl]);

  const totals = stats?.totals ?? {};
  const byDay = stats?.byDay ?? [];

  const pageEnd = offset + items.length;

  return (
    <div className="space-y-8 pb-10">
      <div>
        <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
          Governance Engine
        </p>
        <h1 className="mt-1 text-2xl font-semibold tracking-tight">Audit timeline</h1>
        <p className="mt-1.5 max-w-2xl text-sm text-muted-foreground">
          Every governance decision in this workspace — fixes applied, risks accepted, approvals,
          interactive responses, mode changes — recorded immutably with a full evidence chain per
          finding. Filter, drill in, and export for compliance reviews.
        </p>
      </div>

      {/* KPI strip */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="border-border/70">
          <CardContent className="flex items-center justify-between gap-3 p-4">
            <div>
              <p className="text-xs uppercase tracking-wider text-muted-foreground">Decisions · 30d</p>
              <p className="mt-1 text-2xl font-semibold tabular-nums">{totals.decisions ?? 0}</p>
            </div>
            {byDay.length > 0 ? tinyBar(byDay) : <ScrollText className="h-6 w-6 text-muted-foreground" />}
          </CardContent>
        </Card>
        <Card className="border-border/70">
          <CardContent className="flex items-center justify-between gap-3 p-4">
            <div>
              <p className="text-xs uppercase tracking-wider text-muted-foreground">Fixes applied</p>
              <p className="mt-1 text-2xl font-semibold tabular-nums">{totals.fixes ?? 0}</p>
            </div>
            <Wand2 className="h-6 w-6 text-emerald-300" />
          </CardContent>
        </Card>
        <Card className="border-border/70">
          <CardContent className="flex items-center justify-between gap-3 p-4">
            <div>
              <p className="text-xs uppercase tracking-wider text-muted-foreground">Risks accepted</p>
              <p className="mt-1 text-2xl font-semibold tabular-nums">{totals.acceptedRisks ?? 0}</p>
            </div>
            <AlertTriangle className="h-6 w-6 text-amber-300" />
          </CardContent>
        </Card>
        <Card className="border-border/70">
          <CardContent className="flex items-center justify-between gap-3 p-4">
            <div>
              <p className="text-xs uppercase tracking-wider text-muted-foreground">Approval calls</p>
              <p className="mt-1 text-2xl font-semibold tabular-nums">{totals.approvals ?? 0}</p>
            </div>
            <CheckCircle2 className="h-6 w-6 text-sky-300" />
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card className="border-border/70">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-sm">
            <FilterIcon className="h-4 w-4" />
            Filters
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid gap-3 md:grid-cols-3 lg:grid-cols-4">
            <div className="space-y-1">
              <Label className="text-xs">Decision type</Label>
              <select
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value as GovernanceDecisionType | "")}
                className="block w-full rounded-md border border-input bg-background px-2 py-1.5 text-xs"
              >
                <option value="">All types</option>
                {DECISION_TYPES_FOR_FILTERS.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Actor user id</Label>
              <Input
                value={actorFilter}
                onChange={(e) => setActorFilter(e.target.value)}
                placeholder="UUID"
                className="h-8 text-xs"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Finding signature</Label>
              <Input
                value={signatureFilter}
                onChange={(e) => setSignatureFilter(e.target.value)}
                placeholder="sha256…"
                className="h-8 text-xs"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Free text</Label>
              <div className="relative">
                <Search className="pointer-events-none absolute left-2 top-1/2 h-3 w-3 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search rationale, signature…"
                  className="h-8 pl-7 text-xs"
                />
              </div>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Since</Label>
              <Input
                type="datetime-local"
                value={sinceFilter}
                onChange={(e) => setSinceFilter(e.target.value)}
                className="h-8 text-xs"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Until</Label>
              <Input
                type="datetime-local"
                value={untilFilter}
                onChange={(e) => setUntilFilter(e.target.value)}
                className="h-8 text-xs"
              />
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Button size="sm" onClick={handleApplyFilters} className="h-8 text-xs">
              <FilterIcon className="mr-1.5 h-3 w-3" />
              Apply
            </Button>
            <Button size="sm" variant="outline" onClick={handleResetFilters} className="h-8 text-xs">
              Reset
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => {
                setOffset(0);
                void loadDecisions();
                void loadStats();
              }}
              className="h-8 text-xs"
            >
              <RefreshCw className="mr-1.5 h-3 w-3" />
              Refresh
            </Button>
            <span className="ml-auto flex items-center gap-2">
              <Button asChild size="sm" variant="outline" className="h-8 text-xs">
                <a href={exportUrl} download>
                  <ArrowDownToLine className="mr-1.5 h-3 w-3" />
                  Export CSV
                </a>
              </Button>
              <Button asChild size="sm" variant="ghost" className="h-8 text-xs">
                <a href={exportJsonUrl} download>
                  JSON
                </a>
              </Button>
              <Button asChild size="sm" variant="ghost" className="h-8 text-xs">
                <a href={exportPdfUrl} download>
                  PDF
                </a>
              </Button>
            </span>
          </div>
        </CardContent>
      </Card>

      {error ? (
        <div className="rounded-md border border-rose-500/40 bg-rose-500/10 px-3 py-2 text-sm text-rose-100">
          {error}
        </div>
      ) : null}

      {/* Timeline */}
      {loading && items.length === 0 ? (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" /> Loading audit log…
        </div>
      ) : items.length === 0 ? (
        <Card className="border-dashed border-border/60">
          <CardContent className="py-12 text-center text-sm text-muted-foreground">
            <Clock className="mx-auto mb-3 h-6 w-6 opacity-60" />
            No decisions match the current filters yet.
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {items.map((row) => {
            const desc = describeDecision(row);
            const isOpen = activeId === row.id;
            const evidence = row.finding_signature ? evidenceCache[row.finding_signature] : undefined;
            const isLoadingEvidence = evidenceLoading === row.finding_signature && !evidence;
            return (
              <Card key={row.id} className="border-border/70">
                <CardHeader className="pb-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge variant="outline" className={toneBadgeClass(desc.tone)}>
                      {desc.label}
                    </Badge>
                    {row.mode ? (
                      <Badge variant="secondary" className="text-[10px] uppercase tracking-wide">
                        {row.mode}
                      </Badge>
                    ) : null}
                    <span className="text-xs text-muted-foreground">
                      {formatDateTime(row.created_at)} · by {actorLabel(actors, row.actor_user_id)}
                    </span>
                    {row.finding_signature ? (
                      <span className="ml-auto rounded-md border border-border/60 bg-muted/30 px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground">
                        {shortSignature(row.finding_signature)}
                      </span>
                    ) : null}
                  </div>
                  <CardTitle className={`mt-1 text-sm font-medium ${toneIconClass(desc.tone)}`}>
                    {desc.title}
                  </CardTitle>
                  <p className="text-xs leading-relaxed text-muted-foreground">{desc.summary}</p>
                </CardHeader>
                <CardContent className="space-y-3">
                  <button
                    type="button"
                    onClick={() => toggleActive(row)}
                    className="flex items-center gap-1 text-xs font-medium text-primary hover:underline"
                  >
                    {isOpen ? (
                      <>
                        <ChevronUp className="h-3 w-3" />
                        Hide evidence chain
                      </>
                    ) : (
                      <>
                        <ChevronDown className="h-3 w-3" />
                        View evidence chain
                      </>
                    )}
                  </button>

                  {isOpen ? (
                    <div className="space-y-3 rounded-md border border-border/60 bg-muted/20 p-3">
                      {/* Decision details */}
                      <div className="grid gap-1.5 sm:grid-cols-2">
                        {desc.details.map((d) => (
                          <div key={`${row.id}-${d.key}`} className="flex gap-2 text-[11px]">
                            <span className="w-32 shrink-0 truncate font-mono text-muted-foreground">
                              {d.key}
                            </span>
                            <span className="break-words font-mono">{d.value}</span>
                          </div>
                        ))}
                      </div>

                      {/* Evidence chain */}
                      {row.finding_signature ? (
                        isLoadingEvidence ? (
                          <div className="flex items-center gap-2 text-xs text-muted-foreground">
                            <Loader2 className="h-3 w-3 animate-spin" />
                            Loading evidence chain…
                          </div>
                        ) : evidence ? (
                          <EvidencePanel evidence={evidence} />
                        ) : null
                      ) : (
                        <p className="text-[11px] italic text-muted-foreground">
                          This decision is not tied to a specific finding signature.
                        </p>
                      )}
                    </div>
                  ) : null}
                </CardContent>
              </Card>
            );
          })}

          {/* Pagination */}
          <div className="flex items-center justify-between gap-3 pt-2 text-xs text-muted-foreground">
            <span>
              Showing {offset + 1}–{pageEnd}
              {typeof total === "number" ? ` of ${total}` : ""}
            </span>
            <div className="flex gap-2">
              <Button
                size="sm"
                variant="outline"
                disabled={offset === 0 || loading}
                onClick={() => setOffset(Math.max(0, offset - PAGE_SIZE))}
                className="h-8 text-xs"
              >
                Previous
              </Button>
              <Button
                size="sm"
                variant="outline"
                disabled={loading || items.length < PAGE_SIZE || (typeof total === "number" && pageEnd >= total)}
                onClick={() => setOffset(offset + PAGE_SIZE)}
                className="h-8 text-xs"
              >
                Next
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function EvidencePanel({ evidence }: { evidence: EvidenceResponse }) {
  const fixes = evidence.applied_fixes ?? [];
  const risks = evidence.accepted_risks ?? [];
  const approvals = evidence.pending_approvals ?? [];
  const decisions = evidence.decisions ?? [];

  return (
    <div className="space-y-2">
      <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
        Evidence chain
      </p>
      {decisions.length > 1 ? (
        <div>
          <p className="text-[11px] font-medium text-foreground">Related decisions</p>
          <ul className="mt-1 space-y-1 text-[11px]">
            {decisions.map((d) => (
              <li key={d.id} className="flex items-center gap-2 font-mono">
                <span className="text-muted-foreground">{formatDateTime(d.created_at)}</span>
                <span>{d.decision_type}</span>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
      {fixes.length > 0 ? (
        <div>
          <p className="text-[11px] font-medium text-foreground">Applied fixes</p>
          <ul className="mt-1 space-y-1 text-[11px]">
            {fixes.map((f) => (
              <li key={f.id} className="flex flex-wrap items-center gap-2">
                <Wand2 className="h-3 w-3 text-emerald-300" />
                <span className="font-mono">{f.rule_id}</span>
                <span className="text-muted-foreground">on</span>
                <span className="font-mono">{f.target}</span>
                <span className="text-muted-foreground">· {f.fix_type}</span>
                <span className="text-muted-foreground">· {formatDateTime(f.applied_at)}</span>
                {f.reverted_at ? (
                  <Badge variant="outline" className="border-amber-500/40 bg-amber-500/10 text-amber-100">
                    reverted
                  </Badge>
                ) : null}
              </li>
            ))}
          </ul>
        </div>
      ) : null}
      {risks.length > 0 ? (
        <div>
          <p className="text-[11px] font-medium text-foreground">Accepted risks</p>
          <ul className="mt-1 space-y-1 text-[11px]">
            {risks.map((r) => (
              <li key={r.id} className="flex flex-wrap items-center gap-2">
                <AlertTriangle className="h-3 w-3 text-amber-300" />
                <span className="font-mono">{r.rule_id}</span>
                <span className="text-muted-foreground">on</span>
                <span className="font-mono">{r.target}</span>
                <span className="text-muted-foreground">· accepted {formatDateTime(r.accepted_at)}</span>
                {r.expires_at ? (
                  <span className="text-muted-foreground">· expires {formatDateTime(r.expires_at)}</span>
                ) : null}
                {r.revoked_at ? (
                  <Badge variant="outline" className="border-slate-500/40 bg-slate-500/10 text-slate-100">
                    revoked
                  </Badge>
                ) : null}
              </li>
            ))}
          </ul>
        </div>
      ) : null}
      {approvals.length > 0 ? (
        <div>
          <p className="text-[11px] font-medium text-foreground">Pending approvals</p>
          <ul className="mt-1 space-y-1 text-[11px]">
            {approvals.map((a) => (
              <li key={a.id} className="flex flex-wrap items-center gap-2">
                {a.status === "approved" ? (
                  <CheckCircle2 className="h-3 w-3 text-emerald-300" />
                ) : a.status === "rejected" ? (
                  <XCircle className="h-3 w-3 text-rose-300" />
                ) : (
                  <Clock className="h-3 w-3 text-sky-300" />
                )}
                <span className="font-mono">{a.rule_id}</span>
                <span className="text-muted-foreground">on</span>
                <span className="font-mono">{a.target}</span>
                <span className="text-muted-foreground">· {a.fix_type}</span>
                <span className="text-muted-foreground">· {a.status}</span>
                {a.decided_at ? (
                  <span className="text-muted-foreground">· {formatDateTime(a.decided_at)}</span>
                ) : null}
              </li>
            ))}
          </ul>
        </div>
      ) : null}
      {fixes.length === 0 && risks.length === 0 && approvals.length === 0 && decisions.length <= 1 ? (
        <p className="text-[11px] italic text-muted-foreground">
          No additional records linked to this signature yet.
        </p>
      ) : null}
    </div>
  );
}
