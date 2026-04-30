import { cn } from "@/lib/utils";
import { GlowCard } from "./glow-card";

interface SparklineProps {
  points: string;
  color?: string;
}

function Sparkline({ points, color = "#22d3ee" }: SparklineProps) {
  return (
    <svg width="100%" height="22" viewBox="0 0 100 22" preserveAspectRatio="none" aria-hidden>
      <polyline points={points} fill="none" stroke={color} strokeWidth="1.4" />
    </svg>
  );
}

interface MetricCardProps {
  label: string;
  value: string | number;
  unit?: string;
  delta?: string;
  deltaUp?: boolean;
  sparkPoints?: string;
  sparkColor?: string;
  valueColor?: "cyan" | "amber" | "red" | "default";
  live?: boolean;
  glowColor?: "cyan" | "red" | "amber" | "none";
  className?: string;
}

export function MetricCard({
  label,
  value,
  unit,
  delta,
  deltaUp,
  sparkPoints,
  sparkColor,
  valueColor = "default",
  live,
  glowColor = "none",
  className,
}: MetricCardProps) {
  const valClass =
    valueColor === "cyan"
      ? "bg-gradient-to-b from-white to-[#67e8f9] bg-clip-text text-transparent"
      : valueColor === "amber"
        ? "text-[#fbbf24]"
        : valueColor === "red"
          ? "text-[#fb7185]"
          : "text-[#f0f3f7]";

  return (
    <GlowCard glowColor={glowColor} className={cn("p-[18px]", className)}>
      <div className="mb-3 flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.12em] text-[#5a6470]">
        {live && (
          <span
            className="h-[5px] w-[5px] rounded-full bg-[#22d3ee]"
            style={{ boxShadow: "0 0 8px #22d3ee", animation: "tr-pulse 1.6s ease-in-out infinite" }}
          />
        )}
        {label}
      </div>
      <div
        className={cn(
          "text-[36px] font-semibold leading-none tracking-[-0.035em] tabular-nums",
          valClass,
        )}
      >
        {value}
        {unit && (
          <span className="ml-1 text-[18px] text-[#5a6470]">{unit}</span>
        )}
      </div>
      {delta && (
        <div className="mt-2.5 font-mono text-[11px] text-[#5a6470]">
          <span className={deltaUp ? "text-[#67e8f9]" : "text-[#fb7185]"}>
            {deltaUp ? "▲" : "▼"} {delta}
          </span>{" "}
          vs prev
        </div>
      )}
      {sparkPoints && (
        <div className="mt-2">
          <Sparkline points={sparkPoints} color={sparkColor} />
        </div>
      )}
    </GlowCard>
  );
}
