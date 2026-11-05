import type { RiskLevel } from "@/types";
import { cn } from "@/lib/utils";

const stroke = { LOW: "stroke-success", MEDIUM: "stroke-warning", HIGH: "stroke-danger" };
const text = { LOW: "text-success", MEDIUM: "text-warning", HIGH: "text-danger" };

export function RiskGauge({ score, level, size = 168 }: { score: number; level: RiskLevel; size?: number }) {
  const r = 70;
  const c = 2 * Math.PI * r;
  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg viewBox="0 0 160 160" className="-rotate-90" width={size} height={size}>
        <circle cx="80" cy="80" r={r} fill="none" strokeWidth="10" className="stroke-muted" />
        <circle
          cx="80" cy="80" r={r} fill="none" strokeWidth="10" strokeLinecap="round"
          className={cn(stroke[level], "transition-[stroke-dashoffset] duration-700")}
          strokeDasharray={c} strokeDashoffset={c * (1 - score / 100)}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="tabular text-4xl font-semibold">{score}</span>
        <span className="text-xs text-muted-foreground">out of 100</span>
        <span className={cn("mt-1 text-xs font-semibold tracking-wider", text[level])}>{level}</span>
      </div>
    </div>
  );
}
