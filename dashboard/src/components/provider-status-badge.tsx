import { Badge } from "@/components/ui/badge";
import type { ConnectorStatus } from "@/lib/connectors/types";

export function ProviderStatusBadge({ status }: { status: ConnectorStatus }) {
  if (status === "available") {
    return (
      <Badge className="h-5 rounded-sm border-emerald-500/30 bg-emerald-500/10 px-1.5 text-[10px] font-medium text-emerald-400">
        Active
      </Badge>
    );
  }
  if (status === "beta") {
    return (
      <Badge className="h-5 rounded-sm border-amber-500/30 bg-amber-500/10 px-1.5 text-[10px] font-medium text-amber-400">
        Beta
      </Badge>
    );
  }
  return (
    <Badge className="h-5 rounded-sm border-border/50 bg-muted/40 px-1.5 text-[10px] font-medium text-muted-foreground">
      Soon
    </Badge>
  );
}
