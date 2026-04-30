import { cn } from "@/lib/utils";

interface SectionHeaderProps {
  eyebrow: string;
  title: string;
  subtitle?: string;
  className?: string;
}

export function SectionHeader({ eyebrow, title, subtitle, className }: SectionHeaderProps) {
  return (
    <div className={cn("mb-16", className)}>
      <div className="mb-4 flex items-center gap-2.5 font-mono text-[11px] uppercase tracking-[0.18em] text-[#67e8f9]">
        <span className="h-px w-6 bg-[#22d3ee]" />
        {eyebrow}
      </div>
      <h2 className="mb-4 text-[clamp(32px,4.5vw,56px)] font-semibold leading-[1.05] tracking-[-0.035em] text-[#f0f3f7]">
        {title}
      </h2>
      {subtitle && (
        <p className="max-w-[620px] text-[17px] leading-[1.55] text-[#a8b1bd]">{subtitle}</p>
      )}
    </div>
  );
}
