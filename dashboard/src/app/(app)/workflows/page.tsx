import Link from "next/link";
import { ArrowRight, FolderKanban, Library } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export default function WorkflowsPage() {
  return (
    <div className="space-y-8">
      <div>
        <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Manage</p>
        <h1 className="mt-1 text-2xl font-semibold tracking-tight">Workflows</h1>
        <p className="mt-1.5 max-w-xl text-sm text-muted-foreground">
          Browse your workflow library and projects. Connected sources auto-sync workflows for continuous scanning.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Card className="group border-border/70 shadow-sm hover:shadow-md transition-shadow">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Library className="h-4 w-4 text-primary" />
              Workflow Library
            </CardTitle>
            <CardDescription>
              Upload workflow JSON files, manage saved workflows, and run on-demand scans.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild size="sm" className="gap-1.5">
              <Link href="/workflow-library">
                Open library
                <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </Button>
          </CardContent>
        </Card>

        <Card className="group border-border/70 shadow-sm hover:shadow-md transition-shadow">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <FolderKanban className="h-4 w-4 text-primary" />
              Projects
            </CardTitle>
            <CardDescription>
              Group workflows into projects for scoped scanning and team oversight.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild size="sm" variant="outline" className="gap-1.5">
              <Link href="/projects">
                View projects
                <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </Button>
          </CardContent>
        </Card>
      </div>

      <p className="text-xs text-muted-foreground">
        Want to scan a workflow now?{" "}
        <Link href="/advanced/manual-scan" className="text-primary hover:underline">
          Advanced: manual scan
        </Link>
      </p>
    </div>
  );
}
