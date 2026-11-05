import { Check } from "lucide-react";
import { cn } from "@/lib/utils";

const STEPS = ["Details", "Verify", "Risk", "Review", "Protection"] as const;

export function FlowSteps({ current }: { current: number }) {
  return (
    <ol className="mb-8 flex items-center gap-2 overflow-x-auto text-xs">
      {STEPS.map((s, i) => (
        <li key={s} className="flex shrink-0 items-center gap-2">
          <span
            className={cn(
              "flex size-6 items-center justify-center rounded-full border font-semibold",
              i < current && "border-brand bg-brand text-brand-foreground",
              i === current && "border-brand text-brand",
              i > current && "text-muted-foreground",
            )}
          >
            {i < current ? <Check className="size-3.5" /> : i + 1}
          </span>
          <span className={cn("font-medium", i === current ? "text-foreground" : "text-muted-foreground")}>{s}</span>
          {i < STEPS.length - 1 && <span className="mx-1 h-px w-6 bg-border sm:w-10" />}
        </li>
      ))}
    </ol>
  );
}
