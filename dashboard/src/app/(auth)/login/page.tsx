import Link from "next/link";
import { Suspense } from "react";
import { ShieldCheck } from "lucide-react";
import { LoginForm } from "@/components/auth/login-form";
import { isSupabaseConfigured } from "@/lib/env";

export default function LoginPage() {
  const configured = isSupabaseConfigured();

  return (
    <div className="flex min-h-[calc(100vh-4rem)] flex-col items-center justify-center gap-6 p-4">
      {!configured && (
        <div className="max-w-md rounded-lg border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-950 dark:text-amber-100">
          Set <code className="rounded bg-muted px-1 font-mono text-xs">NEXT_PUBLIC_SUPABASE_URL</code> and{" "}
          <code className="rounded bg-muted px-1 font-mono text-xs">NEXT_PUBLIC_SUPABASE_ANON_KEY</code> in{" "}
          <code className="font-mono text-xs">.env</code> to enable auth. Until then, the dashboard runs without a login
          gate.
        </div>
      )}
      <div className="flex items-center gap-2 text-primary">
        <ShieldCheck className="h-5 w-5" />
        <span className="text-sm font-medium">Torqa Cloud</span>
      </div>
      <Suspense fallback={<div className="h-64 w-full max-w-md animate-pulse rounded-lg bg-muted/40" />}>
        <LoginForm disabled={!configured} />
      </Suspense>
      <p className="text-center text-xs text-muted-foreground">
        After sign in you will return to the app.{" "}
        <Link className="text-primary hover:underline" href="/">
          Home
        </Link>
      </p>
    </div>
  );
}
