"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { ArrowRight, BarChart3, FileText, TrendingUp, Shield, Mail, Plus, Loader2, Trash2, Clock } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { hasPublicSupabaseUrl } from "@/lib/env";

const useCloud = hasPublicSupabaseUrl();

type ComplianceSummary = {
  framework: string;
  controlsViolated: { control: string; title: string; findings: number }[];
  totalViolations: number;
  coverageScore: number;
};

type ReportSchedule = {
  id: string;
  name: string;
  report_type: string;
  frequency: string;
  delivery_email: string;
  framework: string | null;
  enabled: boolean;
  last_sent_at: string | null;
  next_send_at: string | null;
};

export default function ReportsPage() {
  const [complianceData, setComplianceData] = useState<{ summaries: ComplianceSummary[]; totalScans: number; totalFindings: number } | null>(null);
  const [complianceLoading, setComplianceLoading] = useState(false);
  const [schedules, setSchedules] = useState<ReportSchedule[]>([]);
  const [schedulesLoading, setSchedulesLoading] = useState(false);

  const [showScheduleForm, setShowScheduleForm] = useState(false);
  const [schedName, setSchedName] = useState("");
  const [schedEmail, setSchedEmail] = useState("");
  const [schedFrequency, setSchedFrequency] = useState("weekly");
  const [schedFramework, setSchedFramework] = useState("both");
  const [schedSaving, setSchedSaving] = useState(false);
  const [schedError, setSchedError] = useState<string | null>(null);

  const loadCompliance = useCallback(async () => {
    if (!useCloud) return;
    setComplianceLoading(true);
    try {
      const res = await fetch("/api/compliance/report?days=30", { credentials: "include" });
      if (res.ok) {
        const j = await res.json() as { summaries: ComplianceSummary[]; totalScans: number; totalFindings: number };
        setComplianceData(j);
      }
    } catch { /* */ }
    finally { setComplianceLoading(false); }
  }, []);

  const loadSchedules = useCallback(async () => {
    if (!useCloud) return;
    setSchedulesLoading(true);
    try {
      const res = await fetch("/api/report-schedules", { credentials: "include" });
      if (res.ok) {
        const j = await res.json() as { schedules: ReportSchedule[] };
        setSchedules(j.schedules ?? []);
      }
    } catch { /* */ }
    finally { setSchedulesLoading(false); }
  }, []);

  useEffect(() => {
    void loadCompliance();
    void loadSchedules();
  }, [loadCompliance, loadSchedules]);

  const createSchedule = async () => {
    setSchedSaving(true);
    setSchedError(null);
    try {
      const res = await fetch("/api/report-schedules", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: schedName, deliveryEmail: schedEmail, frequency: schedFrequency, framework: schedFramework, reportType: "compliance" }),
      });
      const j = await res.json() as { ok?: boolean; error?: string };
      if (!res.ok || !j.ok) { setSchedError(j.error ?? "Failed to save"); return; }
      setShowScheduleForm(false);
      setSchedName(""); setSchedEmail("");
      await loadSchedules();
    } catch { setSchedError("Network error"); }
    finally { setSchedSaving(false); }
  };

  const deleteSchedule = async (id: string) => {
    await fetch(`/api/report-schedules/${id}`, { method: "DELETE", credentials: "include" });
    await loadSchedules();
  };

  return (
    <div className="space-y-10 pb-10">
      <div>
        <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Observe</p>
        <h1 className="mt-1 text-2xl font-semibold tracking-tight">Reports</h1>
        <p className="mt-1.5 max-w-xl text-sm text-muted-foreground">
          Risk trends, compliance reports, policy analysis, and scheduled delivery.
        </p>
      </div>

      {/* Core report cards */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        <Card className="border-border/70 shadow-sm hover:shadow-md transition-shadow">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <TrendingUp className="h-4 w-4 text-primary" />
              Insights &amp; Trends
            </CardTitle>
            <CardDescription>
              Risk score trends, policy failure rates, and top finding types over time.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild size="sm" className="gap-1.5">
              <Link href="/insights">
                View insights
                <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </Button>
          </CardContent>
        </Card>

        <Card className="border-border/70 shadow-sm hover:shadow-md transition-shadow">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <FileText className="h-4 w-4 text-primary" />
              Shared Reports
            </CardTitle>
            <CardDescription>
              Public scan report links you&apos;ve created. View, revoke, or create new share links.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild size="sm" variant="outline" className="gap-1.5">
              <Link href="/runs">
                View runs → share
                <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </Button>
          </CardContent>
        </Card>

        <Card className="border-border/70 shadow-sm hover:shadow-md transition-shadow">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <BarChart3 className="h-4 w-4 text-primary" />
              PDF Exports
            </CardTitle>
            <CardDescription>
              Export any scan report or audit log as a formatted PDF.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-2">
            <Button asChild size="sm" variant="outline" className="gap-1.5 w-fit">
              <Link href="/runs">Scan PDFs <ArrowRight className="h-3.5 w-3.5" /></Link>
            </Button>
            <Button asChild size="sm" variant="outline" className="gap-1.5 w-fit">
              <Link href="/audit">Audit PDF <ArrowRight className="h-3.5 w-3.5" /></Link>
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Compliance section */}
      {useCloud && (
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Compliance</p>
            <div className="h-px flex-1 bg-border/40" />
          </div>

          {complianceLoading ? (
            <p className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" /> Generating compliance report…
            </p>
          ) : complianceData ? (
            <div className="space-y-4">
              <p className="text-xs text-muted-foreground">
                Based on {complianceData.totalScans} scans ({complianceData.totalFindings} findings) in the last 30 days.
              </p>
              <div className="grid gap-4 sm:grid-cols-2">
                {complianceData.summaries.map((s) => (
                  <Card key={s.framework} className="border-border/60">
                    <CardHeader className="pb-2">
                      <div className="flex items-center justify-between gap-2">
                        <CardTitle className="flex items-center gap-2 text-sm">
                          <Shield className="h-3.5 w-3.5 text-cyan-400" />
                          {s.framework === "soc2" ? "SOC2 Type II" : "ISO 27001:2022"}
                        </CardTitle>
                        <Badge className={
                          s.coverageScore >= 80 ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-400" :
                          s.coverageScore >= 50 ? "border-amber-500/30 bg-amber-500/10 text-amber-400" :
                          "border-red-500/30 bg-red-500/10 text-red-400"
                        }>
                          {s.coverageScore}% clean
                        </Badge>
                      </div>
                      <CardDescription className="text-xs">
                        {s.controlsViolated.length} control{s.controlsViolated.length !== 1 ? "s" : ""} with violations · {s.totalViolations} total findings
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-1.5">
                      {s.controlsViolated.slice(0, 4).map((c) => (
                        <div key={c.control} className="flex items-center justify-between gap-2 text-xs">
                          <span className="font-mono text-cyan-400">{c.control}</span>
                          <span className="truncate text-muted-foreground flex-1 ml-2">{c.title}</span>
                          <Badge variant="secondary" className="text-[10px] shrink-0">{c.findings}</Badge>
                        </div>
                      ))}
                      {s.controlsViolated.length > 4 && (
                        <p className="text-xs text-muted-foreground">+{s.controlsViolated.length - 4} more controls…</p>
                      )}
                      {s.controlsViolated.length === 0 && (
                        <p className="text-xs text-emerald-400">No control violations detected.</p>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">No scan data for compliance analysis.</p>
          )}
        </div>
      )}

      {/* Scheduled reports */}
      {useCloud && (
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Scheduled delivery</p>
            <div className="h-px flex-1 bg-border/40" />
            <Button size="sm" variant="outline" className="h-7 gap-1.5 text-xs" onClick={() => setShowScheduleForm(true)}>
              <Plus className="h-3 w-3" /> New schedule
            </Button>
          </div>

          {showScheduleForm && (
            <Card className="border-cyan-500/20 bg-cyan-500/[0.02]">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-sm">
                  <Mail className="h-4 w-4 text-cyan-400" />
                  Schedule a compliance report
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-1.5">
                    <Label className="text-xs uppercase tracking-wider text-muted-foreground">Name</Label>
                    <Input value={schedName} onChange={(e) => setSchedName(e.target.value)} placeholder="e.g. Weekly SOC2 Report" />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs uppercase tracking-wider text-muted-foreground">Delivery email</Label>
                    <Input value={schedEmail} onChange={(e) => setSchedEmail(e.target.value)} placeholder="you@company.com" type="email" />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs uppercase tracking-wider text-muted-foreground">Frequency</Label>
                    <select value={schedFrequency} onChange={(e) => setSchedFrequency(e.target.value)} className="w-full h-9 rounded-md border border-input bg-background px-3 text-sm">
                      <option value="daily">Daily</option>
                      <option value="weekly">Weekly</option>
                      <option value="monthly">Monthly</option>
                    </select>
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs uppercase tracking-wider text-muted-foreground">Framework</Label>
                    <select value={schedFramework} onChange={(e) => setSchedFramework(e.target.value)} className="w-full h-9 rounded-md border border-input bg-background px-3 text-sm">
                      <option value="both">Both (SOC2 + ISO 27001)</option>
                      <option value="soc2">SOC2 Type II</option>
                      <option value="iso27001">ISO 27001:2022</option>
                    </select>
                  </div>
                </div>
                {schedError && <p className="text-sm text-destructive">{schedError}</p>}
                <div className="flex gap-2">
                  <Button size="sm" disabled={schedSaving || !schedName || !schedEmail} onClick={() => void createSchedule()} className="gap-1.5">
                    {schedSaving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null}
                    Create schedule
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => setShowScheduleForm(false)}>Cancel</Button>
                </div>
              </CardContent>
            </Card>
          )}

          {schedulesLoading ? (
            <p className="flex items-center gap-2 text-sm text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" /> Loading…</p>
          ) : schedules.length === 0 ? (
            <p className="text-sm text-muted-foreground">No scheduled reports. Click &quot;New schedule&quot; to set up automated delivery.</p>
          ) : (
            <div className="overflow-hidden rounded-xl border border-border/50">
              {schedules.map((s, i) => (
                <div key={s.id} className={`flex flex-wrap items-center justify-between gap-3 bg-card px-5 py-3.5 ${i !== schedules.length - 1 ? "border-b border-border/40" : ""}`}>
                  <div className="flex items-center gap-3">
                    <Mail className="h-4 w-4 shrink-0 text-muted-foreground" />
                    <div>
                      <p className="text-sm font-medium">{s.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {s.delivery_email} · {s.frequency} · {s.framework ?? "all frameworks"}
                        {s.next_send_at ? ` · next: ${new Date(s.next_send_at).toLocaleDateString()}` : ""}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {s.last_sent_at && (
                      <span className="flex items-center gap-1 text-xs text-muted-foreground">
                        <Clock className="h-3 w-3" />
                        {new Date(s.last_sent_at).toLocaleDateString()}
                      </span>
                    )}
                    <Badge className={s.enabled ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-400" : "border-border/50 bg-muted/30 text-muted-foreground"}>
                      {s.enabled ? "Active" : "Paused"}
                    </Badge>
                    <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-destructive hover:text-destructive" onClick={() => void deleteSchedule(s.id)}>
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
