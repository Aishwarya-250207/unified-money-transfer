import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { AlertTriangle, Ban, Flag, ShieldAlert } from "lucide-react";
import { EmptyState, PageHeader, Panel, PanelTitle, StatCard } from "@/components/common/ui-blocks";
import { DemoBadge, RiskBadge } from "@/components/transfer/badges";
import { EventTimeline } from "@/components/transfer/EventTimeline";
import { TransferDetailSheet } from "@/components/transfer/TransferDetailSheet";
import { useTransfers } from "@/lib/store";
import { getStats } from "@/services/stats";
import { formatDate, formatMoney } from "@/lib/format";

export const Route = createFileRoute("/_shell/security")({
  head: () => ({
    meta: [
      { title: "Security center — SafeSend" },
      { name: "description", content: "Flagged transfers, risk events and full audit activity." },
      { property: "og:title", content: "Security center — SafeSend" },
      { property: "og:description", content: "Risk events and audit trail." },
    ],
  }),
  component: Security,
});

function Security() {
  const transfers = useTransfers();
  const stats = useMemo(() => getStats(transfers), [transfers]);
  const [open, setOpen] = useState<string | null>(null);
  const flagged = transfers.filter((t) => t.risk && t.risk.level !== "LOW");
  const audit = useMemo(
    () => transfers.flatMap((t) => t.events.map((e) => ({ ...e, id: `${t.id}:${e.id}` }))).sort((a, b) => b.at.localeCompare(a.at)).slice(0, 15),
    [transfers],
  );
  const riskEvents = audit.filter((e) => ["risk_assessed", "cancelled", "hold_started"].includes(e.type));

  return (
    <>
      <PageHeader title="Security center" description="What SafeSend caught, and why." />
      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard label="Flagged transfers" value={stats.flagged} icon={Flag} tone="warning" />
        <StatCard label="High-risk transactions" value={stats.highRisk} icon={ShieldAlert} tone="danger" />
        <StatCard label="Cancelled transactions" value={stats.cancelled} icon={Ban} tone="brand" />
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-5">
        <Panel className="lg:col-span-3">
          <PanelTitle>Risk assessment explanations</PanelTitle>
          {flagged.length === 0 ? (
            <EmptyState icon={AlertTriangle} title="Nothing flagged" description="Medium and high risk transfers will appear here." />
          ) : (
            <ul className="space-y-3">
              {flagged.map((t) => (
                <li key={t.id}>
                  <button onClick={() => setOpen(t.id)} className="w-full rounded-lg border p-4 text-left transition-colors hover:border-brand/40">
                    <div className="flex items-center justify-between gap-3">
                      <span className="flex items-center gap-2 text-sm font-medium">{t.verification.confirmedName ?? t.recipientEmail} {t.isDemo && <DemoBadge />}</span>
                      <RiskBadge level={t.risk!.level} />
                    </div>
                    <p className="mt-1 text-xs text-muted-foreground">{formatMoney(t.amount, t.currency)} · {formatDate(t.createdAt)} · score {t.risk!.score}</p>
                    <p className="mt-2 text-sm">{t.risk!.explanation}</p>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </Panel>
        <Panel className="lg:col-span-2">
          <PanelTitle>Risk event timeline</PanelTitle>
          <EventTimeline events={riskEvents} />
        </Panel>
      </div>

      <Panel className="mt-6">
        <PanelTitle>Audit activity</PanelTitle>
        <EventTimeline events={audit} />
      </Panel>
      <TransferDetailSheet id={open} onClose={() => setOpen(null)} />
    </>
  );
}
