import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export type EmptyStateCtaProps = {
  icon: LucideIcon;
  title: string;
  description: string;
  primary: { href: string; label: string };
  secondary?: { href: string; label: string };
  className?: string;
  compact?: boolean;
};

export function EmptyStateCta({
  icon: Icon,
  title,
  description,
  primary,
  secondary,
  className,
  compact,
}: EmptyStateCtaProps) {
  return (
    <div
      className={cn(
        "rounded-2xl border border-dashed border-border/70 bg-gradient-to-b from-muted/35 to-muted/5 text-center",
        compact ? "px-4 py-8" : "px-6 py-12",
        className
      )}
    >
      <div
        className={cn(
          "mx-auto mb-3 flex items-center justify-center rounded-full bg-primary/10 text-primary",
          compact ? "h-9 w-9" : "h-11 w-11"
        )}
      >
        <Icon className={compact ? "h-4 w-4" : "h-5 w-5"} strokeWidth={1.75} aria-hidden />
      </div>
      <h3 className={cn("font-semibold tracking-tight text-foreground", compact ? "text-sm" : "text-base")}>
        {title}
      </h3>
      <p className={cn("mx-auto mt-2 max-w-md text-muted-foreground", compact ? "text-xs" : "text-sm")}>
        {description}
      </p>
      <div className={cn("flex flex-wrap justify-center gap-2", compact ? "mt-4" : "mt-6")}>
        <Button asChild size={compact ? "sm" : "default"}>
          <Link href={primary.href}>{primary.label}</Link>
        </Button>
        {secondary ? (
          <Button variant="outline" asChild size={compact ? "sm" : "default"}>
            <Link href={secondary.href}>{secondary.label}</Link>
          </Button>
        ) : null}
      </div>
    </div>
  );
}
