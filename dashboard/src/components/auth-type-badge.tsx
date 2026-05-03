import { KeyRound, GitBranch, Webhook, Cpu } from "lucide-react";
import type { ConnectorAuthType } from "@/lib/connectors/types";

const AUTH_MAP: Record<ConnectorAuthType, { label: string; Icon: React.ComponentType<{ className?: string }> }> = {
  apikey: { label: "API Key", Icon: KeyRound },
  oauth: { label: "OAuth", Icon: GitBranch },
  webhook: { label: "Webhook", Icon: Webhook },
  none: { label: "N/A", Icon: Cpu },
};

export function AuthTypeBadge({ authType }: { authType: ConnectorAuthType }) {
  const { label, Icon } = AUTH_MAP[authType];
  return (
    <span className="flex items-center gap-1 text-[11px] text-muted-foreground">
      <Icon className="h-3 w-3" />
      {label}
    </span>
  );
}
