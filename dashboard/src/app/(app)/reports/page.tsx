import Link from "next/link";
import { ArrowRight, BarChart3, FileText, TrendingUp } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export const metadata = {
  title: "Reports",
  description: "Insights, trends, and exported reports for your automation governance.",
};

export default function ReportsPage() {
  return (
    <div className="space-y-8 pb-10">
      <div>
        <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Observe</p>
        <h1 className="mt-1 text-2xl font-semibold tracking-tight">Reports</h1>
        <p className="mt-1.5 max-w-xl text-sm text-muted-foreground">
          Risk trends, top findings, policy failure trends, and shareable PDF exports.
        </p>
      </div>

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
              Export any scan report as a formatted PDF. Open a run and click &quot;Export PDF&quot;.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild size="sm" variant="outline" className="gap-1.5">
              <Link href="/runs">
                Go to runs
                <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
