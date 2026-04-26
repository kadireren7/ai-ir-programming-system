import Link from "next/link";
import { History } from "lucide-react";
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

export const dynamic = "force-dynamic";

type ScanRow = {
  id: string;
  source: string;
  workflow_name: string | null;
  created_at: string;
  result: unknown;
};

export default async function ScanHistoryPage() {
  if (!isSupabaseConfigured()) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-semibold tracking-tight">Scan history</h1>
        <p className="max-w-xl text-sm text-muted-foreground">
          Configure Supabase environment variables to persist scans per user. See the dashboard README.
        </p>
      </div>
    );
  }

  const supabase = await createClient();
  if (!supabase) {
    return null;
  }

  const { data: rows, error } = await supabase
    .from("scan_history")
    .select("id, source, workflow_name, created_at, result")
    .order("created_at", { ascending: false })
    .limit(100);

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
    <div className="space-y-8">
      <div className="flex flex-col gap-2 border-b border-border/60 pb-8 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Workflow</p>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight sm:text-3xl">Scan history</h1>
          <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
            Open a past report to review the same summary and findings stored when you ran a scan.
          </p>
        </div>
        <Link
          href="/scan"
          className="inline-flex items-center gap-2 text-sm font-medium text-primary hover:underline"
        >
          <History className="h-4 w-4" />
          New scan
        </Link>
      </div>

      <Card className="border-border/80 shadow-sm">
        <CardHeader>
          <CardTitle className="text-lg">Saved scans</CardTitle>
          <CardDescription>Most recent first. Rows are scoped to your account (RLS).</CardDescription>
        </CardHeader>
        <CardContent className="px-0 pb-2">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead className="pl-6">When</TableHead>
                  <TableHead>Source</TableHead>
                  <TableHead>Workflow</TableHead>
                  <TableHead>Outcome</TableHead>
                  <TableHead className="pr-6 text-right">Open</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {list.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="px-6 py-10 text-center text-sm text-muted-foreground">
                      No saved scans yet. Run a scan from <Link href="/scan" className="text-primary underline">/scan</Link>
                      .
                    </TableCell>
                  </TableRow>
                ) : (
                  list.map((row) => {
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
                  })
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
