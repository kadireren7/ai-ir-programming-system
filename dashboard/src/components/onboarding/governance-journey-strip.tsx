import { Bell, Gavel, LineChart, Plug } from "lucide-react";

const steps = [
  { key: "connect", label: "Connect", Icon: Plug },
  { key: "monitor", label: "Monitor", Icon: LineChart },
  { key: "govern", label: "Govern", Icon: Gavel },
  { key: "alert", label: "Alert", Icon: Bell },
] as const;

export function GovernanceJourneyStrip() {
  return (
    <div className="rounded-2xl border border-border/60 bg-card/60 px-4 py-5 shadow-sm ring-1 ring-black/[0.03] dark:ring-white/[0.04] sm:px-6">
      <p className="text-center text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
        Connected governance journey
      </p>
      <div className="mt-4 flex flex-wrap items-center justify-center gap-y-2 sm:gap-x-1">
        {steps.map((s, i) => (
          <div key={s.key} className="flex items-center">
            <div className="flex items-center gap-2 rounded-full border border-border/70 bg-background/90 px-3 py-1.5 text-sm shadow-sm">
              <s.Icon className="h-3.5 w-3.5 shrink-0 text-primary" aria-hidden />
              <span className="font-medium text-foreground">{s.label}</span>
            </div>
            {i < steps.length - 1 ? (
              <span className="hidden px-1.5 text-xs text-muted-foreground/50 sm:inline" aria-hidden>
                →
              </span>
            ) : null}
          </div>
        ))}
      </div>
      <p className="mt-3 text-center text-xs text-muted-foreground">Connect → Monitor → Govern → Alert</p>
    </div>
  );
}
