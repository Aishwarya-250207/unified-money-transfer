// Review page for a transfer – real PayPal Sandbox integration
import { useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { Clock, Loader2, ShieldAlert } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { PageHeader, Panel, PanelTitle, Row } from "@/components/common/ui-blocks";
import { FlowSteps } from "@/components/transfer/FlowSteps";
import { StepGuard } from "@/components/transfer/StepGuard";
import { RiskBadge, VerificationBadge } from "@/components/transfer/badges";
import { useTransfer } from "@/lib/store";
import { formatMoney } from "@/lib/format";

import { transferService } from "@/services/transfers";
import { holdSecondsFor } from "@/services/transfer-machine";
import type { Transfer } from "@/types";


export const Route = createFileRoute("/_shell/transfers/$id/review")({
  head: () => ({
    meta: [
      { title: "Review payment — SafeSend" },
      { name: "description", content: "Review recipient, verification and risk before confirming." },
      { property: "og:title", content: "Review payment — SafeSend" },
      { property: "og:description", content: "Final review before a protected transfer." },
    ],
  }),
  component: () => {
    const { id } = Route.useParams();
    const t = useTransfer(id);
    return (
      <div className="mx-auto max-w-3xl">
        <FlowSteps current={3} />
        <PageHeader title="Review payment" description="Nothing is sent until you confirm." />
        <StepGuard t={t}>{(t) => <Review t={t} />}</StepGuard>
      </div>
    );
  },
});

function Review({ t }: { t: Transfer }) {
  const navigate = useNavigate();
  const [ack, setAck] = useState(false);
  const [busy, setBusy] = useState(false);
  const v = t.verification;
  const risky = t.risk?.level !== "LOW" || v.status !== "verified";
  const hold = holdSecondsFor(t.risk?.level);
  const ready = v.status !== "pending" && !!t.risk;

  async function confirm() {
    setBusy(true);
    try {
      const resp = await fetch("/paypal/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          transferId: t.id,
          amount: t.amount,
          currency: t.currency,
          recipientEmail: t.recipientEmail,
        }),
      });
      if (!resp.ok) {
        const err = await resp.text();
        throw new Error(`PayPal order creation failed: ${resp.status} ${err}`);
      }
      const data = await resp.json();
      if (!data.approveUrl) throw new Error("PayPal approval URL missing");
      window.location.href = data.approveUrl;
    } catch (e) {
      toast.error((e as Error).message);
      setBusy(false);
    }
  }

  async function cancel() {
    try {
      await transferService.cancel(t.id, "Cancelled by sender at review.");
    } catch (e) {
      toast.error((e as Error).message);
      return;
    }
    toast("Transfer cancelled. Nothing was sent.");
    navigate({ to: "/dashboard" });
  }

  return (
    <div className="grid gap-6 lg:grid-cols-5">
      <div className="space-y-6 lg:col-span-3">
        <Panel>
          <PanelTitle>Recipient</PanelTitle>
          <div className="flex items-center gap-3">
            <span className="flex size-11 items-center justify-center rounded-full bg-secondary font-semibold">
              {(v.confirmedName ?? t.recipientEmail).charAt(0).toUpperCase()}
            </span>
            <div className="min-w-0 flex-1">
              <p className="font-medium">{v.confirmedName ?? "Unregistered recipient"}</p>
              <p className="truncate text-sm text-muted-foreground">{t.recipientEmail}</p>
            </div>
            <VerificationBadge status={v.status} />
          </div>
          {!ready && (
            <Link to="/transfers/$id/verify" params={{ id: t.id }} className="mt-3 inline-block text-sm text-brand hover:underline">
              Complete verification
            </Link>
          )}
        </Panel>
        <Panel>
          <PanelTitle action={<Link to="/transfers/$id/risk" params={{ id: t.id }} className="text-sm text-brand hover:underline">Details</Link>}>
            Risk assessment
          </PanelTitle>
          {t.risk ? (
            <div className="flex items-center gap-4">
              <span className="tabular text-3xl font-semibold">{t.risk.score}</span>
              <div>
                <RiskBadge level={t.risk.level} />
                <p className="mt-1 text-sm text-muted-foreground">{t.risk.factors.length} risk factor(s)</p>
              </div>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">Not assessed yet.</p>
          )}
        </Panel>
      </div>

      <Panel className="h-fit lg:col-span-2">
        <PanelTitle>Payment summary</PanelTitle>
        <div className="tabular text-4xl font-semibold">{formatMoney(t.amount, t.currency)}</div>
        <div className="mt-4 divide-y">
          <Row label="Payment rail">{t.paymentRail ?? "PayPal Sandbox (Simulated)"}</Row>
          <Row label="Note">{t.note || "—"}</Row>
          <Row label="Fee">{formatMoney(0, t.currency)}</Row>
          <Row label="Cancellation window">{hold ? `${hold / 60} min` : "None"}</Row>
        </div>
        {hold > 0 && (
          <p className="mt-4 flex gap-2 rounded-lg bg-warning-soft p-3 text-xs text-warning">
            <Clock className="size-4 shrink-0" /> You'll be able to cancel for {hold / 60} minutes after confirming.
          </p>
        )}
        {risky && ready && (
          <label className="mt-4 flex cursor-pointer gap-3 rounded-lg border p-3 text-sm">
            <Checkbox checked={ack} onCheckedChange={(c) => setAck(!!c)} className="mt-0.5" />
            <span>
              <ShieldAlert className="mr-1 inline size-4 text-danger" />I've reviewed the warnings and know this recipient personally.
            </span>
          </label>
        )}
        <div className="mt-6 space-y-2">
          <Button variant="brand" size="xl" className="w-full" disabled={!ready || busy || (risky && !ack)} onClick={confirm}>
            {busy && <Loader2 className="animate-spin" />} Confirm transfer
          </Button>
          <Button variant="danger-outline" size="lg" className="w-full" onClick={cancel} disabled={busy}>
            Cancel transfer
          </Button>
        </div>
        {/* Note: real PayPal Sandbox flow – no simulated fallback */}
      </Panel>
    </div>
  );
}
