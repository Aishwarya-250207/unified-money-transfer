import { AlertTriangle, CheckCircle2, Clock, HelpCircle, Loader2, ShieldAlert, ShieldCheck, ShieldQuestion, XCircle } from "lucide-react";
import type { RiskLevel, TransferStatus, VerificationStatus } from "@/types";
import { cn } from "@/lib/utils";

const tone = {
  success: "bg-success-soft text-success",
  warning: "bg-warning-soft text-warning",
  danger: "bg-danger-soft text-danger",
  brand: "bg-brand-soft text-brand",
  muted: "bg-muted text-muted-foreground",
};

function Pill({ t, icon: Icon, children, className }: { t: keyof typeof tone; icon?: typeof Clock; children: React.ReactNode; className?: string }) {
  return (
    <span className={cn("inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium", tone[t], className)}>
      {Icon && <Icon className="size-3.5" />}
      {children}
    </span>
  );
}

export function StatusBadge({ status }: { status: TransferStatus }) {
  const map = {
    draft: { t: "muted", icon: HelpCircle, label: "Draft" },
    pending: { t: "warning", icon: Clock, label: "Pending" },
    completed: { t: "success", icon: CheckCircle2, label: "Completed" },
    cancelled: { t: "danger", icon: XCircle, label: "Cancelled" },
  } as const;
  const m = map[status];
  return <Pill t={m.t} icon={m.icon}>{m.label}</Pill>;
}

export function RiskBadge({ level }: { level?: RiskLevel }) {
  if (!level) return <Pill t="muted">Not assessed</Pill>;
  const map = { LOW: ["success", ShieldCheck], MEDIUM: ["warning", ShieldQuestion], HIGH: ["danger", ShieldAlert] } as const;
  const [t, icon] = map[level];
  return <Pill t={t} icon={icon}>{level} risk</Pill>;
}

export function VerificationBadge({ status }: { status: VerificationStatus }) {
  const map = {
    pending: { t: "brand", icon: Loader2, label: "Verification pending" },
    verified: { t: "success", icon: CheckCircle2, label: "Verified" },
    mismatch: { t: "warning", icon: AlertTriangle, label: "Name mismatch" },
    not_found: { t: "danger", icon: XCircle, label: "Not registered" },
  } as const;
  const m = map[status];
  return <Pill t={m.t} icon={m.icon}>{m.label}</Pill>;
}

export function DemoBadge({ className }: { className?: string }) {
  return (
    <span className={cn("rounded border border-dashed border-muted-foreground/40 px-1.5 py-px text-[10px] font-semibold uppercase tracking-wider text-muted-foreground", className)}>
      Demo data
    </span>
  );
}
