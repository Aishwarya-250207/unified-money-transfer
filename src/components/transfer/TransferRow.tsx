import type { Transfer } from "@/types";
import { formatDate, formatMoney } from "@/lib/format";
import { DemoBadge, RiskBadge, StatusBadge } from "./badges";

export function TransferRow({ t, onClick }: { t: Transfer; onClick?: () => void }) {
  const name = t.verification.confirmedName ?? t.recipientName ?? t.recipientEmail;
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex w-full items-center gap-4 rounded-lg px-3 py-3 text-left transition-colors hover:bg-muted"
    >
      <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-secondary text-sm font-semibold">
        {name.charAt(0).toUpperCase()}
      </span>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="truncate text-sm font-medium">{name}</span>
          {t.isDemo && <DemoBadge />}
        </div>
        <div className="truncate text-xs text-muted-foreground">
          {t.recipientEmail} · {formatDate(t.createdAt)}
        </div>
      </div>
      <div className="hidden sm:block"><RiskBadge level={t.risk?.level} /></div>
      <div className="flex flex-col items-end gap-1">
        <span className="tabular text-sm font-semibold">{formatMoney(t.amount, t.currency)}</span>
        <StatusBadge status={t.status} />
      </div>
    </button>
  );
}
