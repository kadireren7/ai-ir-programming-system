import Link from "next/link";
import { ArrowRight, Bell, KeyRound, Users } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export const metadata = {
  title: "Settings",
};

export default function SettingsPage() {
  return (
    <div className="space-y-8 pb-10">
      <div>
        <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Configure</p>
        <h1 className="mt-1 text-2xl font-semibold tracking-tight">Settings</h1>
        <p className="mt-1.5 max-w-xl text-sm text-muted-foreground">
          API keys, workspace, team, and notification preferences.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        <Card className="border-border/70 shadow-sm hover:shadow-md transition-shadow">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <KeyRound className="h-4 w-4 text-primary" />
              API Keys
            </CardTitle>
            <CardDescription>
              Create, revoke, and manage API keys. Use with cURL, GitHub Actions, n8n, or any CI.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild size="sm" className="gap-1.5">
              <Link href="/settings/api">
                Manage API keys
                <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </Button>
          </CardContent>
        </Card>

        <Card className="border-border/70 shadow-sm hover:shadow-md transition-shadow">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Bell className="h-4 w-4 text-primary" />
              Notifications
            </CardTitle>
            <CardDescription>
              Personal scan alert preferences — email, in-app thresholds, and mute rules.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild size="sm" variant="outline" className="gap-1.5">
              <Link href="/settings/notifications">
                Notification prefs
                <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </Button>
          </CardContent>
        </Card>

        <Card className="border-border/70 shadow-sm hover:shadow-md transition-shadow">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Users className="h-4 w-4 text-primary" />
              Workspace &amp; Team
            </CardTitle>
            <CardDescription>
              Manage your workspace, team members, and organization settings.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild size="sm" variant="outline" className="gap-1.5">
              <Link href="/workspace">
                Workspace settings
                <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
