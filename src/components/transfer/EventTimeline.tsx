import { Ban, CheckCircle2, Clock, FilePlus2, Send, ShieldCheck, UserCheck } from "lucide-react";
import type { ReactNode } from "react";
import type { TransferEvent } from "@/types";
import { formatDateTime } from "@/lib/format";
import { cn } from "@/lib/utils";

const icons = {
  created: [FilePlus2, "bg-muted text-muted-foreground"],
  verified: [UserCheck, "bg-brand-soft text-brand"],
  risk_assessed: [ShieldCheck, "bg-brand-soft text-brand"],
  confirmed: [Send, "bg-secondary text-foreground"],
  hold_started: [Clock, "bg-warning-soft text-warning"],
  released: [CheckCircle2, "bg-success-soft text-success"],
  cancelled: [Ban, "bg-danger-soft text-danger"],
} as const;

export function EventTimeline({ events, extra }: { events: TransferEvent[]; extra?: (e: TransferEvent) => ReactNode }) {
  return (
    <ol className="relative space-y-4 before:absolute before:top-2 before:bottom-2 before:left-3.5 before:w-px before:bg-border">
      {events.map((e) => {
        const [Icon, cls] = icons[e.type];
        return (
          <li key={e.id} className="relative flex gap-3">
            <span className={cn("z-10 flex size-7 shrink-0 items-center justify-center rounded-full ring-4 ring-card", cls)}>
              <Icon className="size-3.5" />
            </span>
            <div className="min-w-0 pt-0.5">
              <p className="text-sm">{e.message}</p>
              <p className="text-xs text-muted-foreground">{formatDateTime(e.at)}{extra?.(e)}</p>
            </div>
          </li>
        );
      })}
    </ol>
  );
}
