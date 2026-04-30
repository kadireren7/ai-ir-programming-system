import Link from "next/link";
import { ArrowRight, Bell, CalendarClock } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export const metadata = {
  title: "Automations",
  description: "Schedules and notifications — configure recurring scans and alert routes.",
};

export default function AutomationsPage() {
  return (
    <div className="space-y-8 pb-10">
      <div>
        <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Automate</p>
        <h1 className="mt-1 text-2xl font-semibold tracking-tight">Automations</h1>
        <p className="mt-1.5 max-w-xl text-sm text-muted-foreground">
          Configure recurring scans and notification routes. Torqa runs governance continuously so you don&apos;t have to.
        </p>
      </div>

      <Tabs defaultValue="schedules">
        <TabsList className="mb-4">
          <TabsTrigger value="schedules" className="gap-2">
            <CalendarClock className="h-4 w-4" />
            Schedules
          </TabsTrigger>
          <TabsTrigger value="notifications" className="gap-2">
            <Bell className="h-4 w-4" />
            Notifications
          </TabsTrigger>
        </TabsList>

        <TabsContent value="schedules" className="space-y-4">
          <Card className="border-border/70 shadow-sm">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <CalendarClock className="h-4 w-4 text-primary" />
                Scheduled Scans
              </CardTitle>
              <CardDescription>
                Set up recurring scans on a workflow, source, or project. Choose frequency, policy, and whether to run immediately.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button asChild size="sm" className="gap-1.5">
                <Link href="/schedules">
                  Manage schedules
                  <ArrowRight className="h-3.5 w-3.5" />
                </Link>
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="notifications" className="space-y-4">
          <Card className="border-border/70 shadow-sm">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Bell className="h-4 w-4 text-primary" />
                Alert Destinations &amp; Rules
              </CardTitle>
              <CardDescription>
                Route scan FAIL, high-risk, and policy failure outcomes to Slack, Discord, in-app, or email. Set rules per trigger type.
              </CardDescription>
            </CardHeader>
            <CardContent className="flex flex-wrap gap-2">
              <Button asChild size="sm" className="gap-1.5">
                <Link href="/alerts">
                  Manage team alerts
                  <ArrowRight className="h-3.5 w-3.5" />
                </Link>
              </Button>
              <Button asChild size="sm" variant="outline" className="gap-1.5">
                <Link href="/settings/notifications">
                  Personal preferences
                  <ArrowRight className="h-3.5 w-3.5" />
                </Link>
              </Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
