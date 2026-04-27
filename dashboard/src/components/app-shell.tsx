import { AppSidebar } from "@/components/app-sidebar";
import { AppHeader } from "@/components/app-header";
import { getOrganization } from "@/data/queries";
import { createClient } from "@/lib/supabase/server";

export async function AppShell({ children }: { children: React.ReactNode }) {
  const org = await getOrganization();
  const supabase = await createClient();

  let user: { email: string; displayName: string | null } | null = null;
  if (supabase) {
    const {
      data: { user: u },
    } = await supabase.auth.getUser();
    if (u?.email) {
      const meta = u.user_metadata as Record<string, unknown> | undefined;
      const dn =
        (typeof meta?.full_name === "string" && meta.full_name) ||
        (typeof meta?.name === "string" && meta.name) ||
        null;
      user = { email: u.email, displayName: dn };
    }
  }

  return (
    <div className="relative flex min-h-screen bg-background">
      <div
        className="pointer-events-none fixed inset-0 -z-10 bg-[radial-gradient(ellipse_120%_80%_at_50%_-20%,hsl(var(--primary)/0.08),transparent_50%),radial-gradient(ellipse_80%_50%_at_100%_0%,hsl(var(--chart-2)/0.06),transparent_45%)]"
        aria-hidden
      />
      <AppSidebar orgName={org.name} />
      <div className="flex min-w-0 flex-1 flex-col">
        <AppHeader orgName={org.name} user={user} />
        <main className="flex-1 overflow-auto">
          <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6 lg:px-8 lg:py-8">{children}</div>
        </main>
      </div>
    </div>
  );
}
