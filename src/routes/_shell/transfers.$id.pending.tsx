import { createFileRoute, Link } from "@tanstack/react-router";
import { Ban, CheckCircle2, FileQuestion, Info, XCircle } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { EmptyState, PageHeader, Panel, PanelTitle, Row } from "@/components/common/ui-blocks";
import { FlowSteps } from "@/components/transfer/FlowSteps";
import { RiskBadge, StatusBadge } from "@/components/transfer/badges";
import { EventTimeline } from "@/components/transfer/EventTimeline";
import { useTransfer } from "@/lib/store";
import { useNow } from "@/hooks/use-now";
import { formatCountdown, formatMoney } from "@/lib/format";
import { transferService } from "@/services/transfers";

export const Route = createFileRoute("/_shell/transfers/$id/pending")({
  head: () => ({
    meta: [
      { title: "Pending transfer — SafeSend" },
      { name: "description", content: "Your transfer is in its cancellation window." },
      { property: "og:title", content: "Pending transfer — SafeSend" },
      { property: "og:description", content: "Cancel before release." },
    ],
  }),
  component: PendingPage,
});

function PendingPage() {
  const { id } = Route.useParams();
  const t = useTransfer(id);
  const now = useNow(250);

  if (!t)
    return <Panel><EmptyState icon={FileQuestion} title="Transfer not found" action={<Button asChild variant="brand"><Link to="/history">View transactions</Link></Button>} /></Panel>;

  const start = t.confirmedAt ? new Date(t.confirmedAt).getTime() : now;
  const end = t.releaseAt ? new Date(t.releaseAt).getTime() : now;
  const remaining = Math.max(0, end - now);
  const pct = end > start ? (remaining / (end - start)) * 100 : 0;

  return (
    <div className="mx-auto max-w-3xl">
      <FlowSteps current={4} />
      <PageHeader title="Pending transfer" description={<span className="flex items-center gap-2">Current status <StatusBadge status={t.status} /></span>} />

      <Panel className="text-center">
        {t.status === "pending" ? (
          <>
            <p className="text-sm text-muted-foreground">Release in</p>
            <p className="tabular mt-2 text-7xl font-semibold tracking-tight sm:text-8xl">{formatCountdown(remaining)}</p>
            <div className="mx-auto mt-6 h-1.5 max-w-sm overflow-hidden rounded-full bg-muted">
              <div className="h-full rounded-full bg-warning transition-[width] duration-300" style={{ width: `${pct}%` }} />
            </div>
            <Button variant="danger" size="xl" className="mt-8 w-full max-w-sm" onClick={() => { transferService.cancel(t.id, "Cancelled by sender during cancellation window."); toast.success("Transfer cancelled (simulated). Nothing was released."); }}>
              <Ban /> Cancel this transfer
            </Button>
          </>
        ) : t.status === "cancelled" ? (
          <div className="py-6"><XCircle className="mx-auto size-14 text-danger" /><p className="mt-4 text-xl font-semibold">Transfer cancelled</p><p className="mt-1 text-sm text-muted-foreground">It was stopped before release. No money was sent (simulated).</p></div>
        ) : (
          <div className="py-6"><CheckCircle2 className="mx-auto size-14 text-success" /><p className="mt-4 text-xl font-semibold">Transfer released</p><p className="mt-1 text-sm text-muted-foreground">The cancellation window ended. Released to the recipient (simulated).</p></div>
        )}
      </Panel>

      <div className="mt-6 grid gap-6 md:grid-cols-2">
        <Panel>
          <PanelTitle>Transfer</PanelTitle>
          <div className="tabular text-3xl font-semibold">{formatMoney(t.amount, t.currency)}</div>
          <div className="mt-3 divide-y">
            <Row label="Recipient">{t.verification.confirmedName ?? t.recipientName ?? "Unregistered"}</Row>
            <Row label="Email">{t.recipientEmail}</Row>
            <Row label="Risk"><RiskBadge level={t.risk?.level} /></Row>
          </div>
        </Panel>
        <Panel>
          <PanelTitle>Activity</PanelTitle>
          <EventTimeline events={t.events} />
        </Panel>
      </div>

      <div className="mt-6 flex gap-3 rounded-xl border bg-card p-5 text-sm">
        <Info className="size-5 shrink-0 text-brand" />
        <p className="text-muted-foreground">
          <strong className="text-foreground">Why the wait?</strong> Higher-risk transfers get a short cooling-off period. Most scams rely on urgency — this pause gives you time to double-check with the recipient through another channel. In this prototype the hold is simulated; no real funds are held.
        </p>
      </div>
      <div className="mt-6 flex justify-center gap-3">
        <Button asChild variant="outline"><Link to="/dashboard">Back to dashboard</Link></Button>
        <Button asChild variant="ghost"><Link to="/history">All transactions</Link></Button>
      </div>
    </div>
  );
}
