import Link from "next/link";
import { docsUrl, githubUrl } from "@/lib/marketing-content";

const links = [
  { label: "Docs", href: docsUrl, external: true },
  { label: "GitHub", href: githubUrl, external: true },
  { label: "Dashboard", href: "/overview", external: false },
  { label: "Privacy", href: "/policy", external: false },
] as const;

export function LandingFooter() {
  return (
    <footer className="border-t border-border/50 bg-background">
      <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-6 px-6 py-12 sm:flex-row sm:px-8">
        <div className="text-center sm:text-left">
          <p className="text-sm font-semibold tracking-tight text-foreground">Torqa</p>
          <p className="mt-1 max-w-xs text-xs text-muted-foreground">
            Continuous governance for automation workflows.
          </p>
        </div>
        <nav className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2" aria-label="Footer">
          {links.map((l) =>
            l.external ? (
              <a
                key={l.label}
                href={l.href}
                target="_blank"
                rel="noreferrer"
                className="text-xs font-medium text-muted-foreground transition-colors hover:text-foreground"
              >
                {l.label}
              </a>
            ) : (
              <Link
                key={l.label}
                href={l.href}
                className="text-xs font-medium text-muted-foreground transition-colors hover:text-foreground"
              >
                {l.label}
              </Link>
            )
          )}
        </nav>
        <p className="text-[11px] text-muted-foreground">© {new Date().getFullYear()} Torqa</p>
      </div>
    </footer>
  );
}
