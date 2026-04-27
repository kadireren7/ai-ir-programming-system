import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Shared report",
  description: "A Torqa workflow scan shared with you.",
  robots: { index: false, follow: false },
};

export default function ShareLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border/80 bg-background/90 backdrop-blur-md">
        <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4 sm:px-6">
          <Link href="/" className="text-sm font-semibold tracking-tight text-foreground hover:text-primary">
            Torqa
          </Link>
          <span className="text-xs text-muted-foreground">Shared report</span>
        </div>
      </header>
      <div id="main-content" className="mx-auto max-w-6xl px-4 py-8 sm:px-6 sm:py-10">
        {children}
      </div>
    </div>
  );
}
