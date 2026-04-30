import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

export function ScanOutcomeBadge({ status }: { status: string }) {
  const normalized = status.trim().toUpperCase();
  const variant =
    normalized === "PASS"
      ? "border-emerald-600/40 bg-emerald-500/10 text-emerald-800 dark:text-emerald-300"
      : normalized === "FAIL"
        ? "border-destructive bg-destructive text-destructive-foreground"
        : "border-amber-600/40 bg-amber-500/10 text-amber-900 dark:text-amber-300";

  return (
    <Badge variant="outline" className={cn("font-semibold tabular-nums", variant)}>
      {status}
    </Badge>
  );
}
