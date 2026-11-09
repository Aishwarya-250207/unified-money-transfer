import { Link } from "@tanstack/react-router";
import { toast } from "sonner";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Row } from "@/components/common/ui-blocks";
import { useTransfer } from "@/lib/store";
import { transferService } from "@/services/transfers";
import { formatDateTime, formatMoney } from "@/lib/format";
import { DemoBadge, RiskBadge, StatusBadge, VerificationBadge } from "./badges";
import { EventTimeline } from "./EventTimeline";

export function TransferDetailSheet({ id, onClose }: { id: string | null; onClose: () => void }) {
  const t = useTransfer(id ?? "");
  return (
    <Sheet open={!!id} onOpenChange={(o) => !o && onClose()}>
      <SheetContent className="w-full overflow-y-auto sm:max-w-md">
        {t && (
          <>
            <SheetHeader>
              <SheetTitle className="flex items-center gap-2">Transfer details {t.isDemo && <DemoBadge />}</SheetTitle>
              <SheetDescription className="font-mono text-xs">{t.id}</SheetDescription>
            </SheetHeader>
            <div className="space-y-6 px-4 pb-6">
              <div>
                <div className="tabular text-3xl font-semibold">{formatMoney(t.amount, t.currency)}</div>
                <div className="mt-2 flex flex-wrap gap-2">
                  <StatusBadge status={t.status} />
                  <RiskBadge level={t.risk?.level} />
                  <VerificationBadge status={t.verification.status} />
                </div>
              </div>
              <div className="divide-y">
                <Row label="Recipient">{t.verification.confirmedName ?? t.recipientName}</Row>
                <Row label="Email">{t.recipientEmail}</Row>
                <Row label="Payment rail">{t.paymentRail ?? "PayPal Sandbox (Simulated)"}</Row>
                <Row label="Note">{t.note || "—"}</Row>
                <Row label="Created">{formatDateTime(t.createdAt)}</Row>
                {t.risk && <Row label="Risk score">{t.risk.score}/100</Row>}
              </div>
              {t.risk && <p className="rounded-lg bg-muted p-3 text-sm text-muted-foreground">{t.risk.explanation}</p>}
              <div>
                <h3 className="mb-3 text-sm font-semibold">Activity</h3>
                <EventTimeline events={t.events} />
              </div>
              {t.status === "pending" && (
                <div className="flex gap-2">
                  <Button asChild variant="outline" className="flex-1">
                    <Link to="/transfers/$id/pending" params={{ id: t.id }}>View countdown</Link>
                  </Button>
                  <Button variant="danger" className="flex-1" onClick={() => { transferService.cancel(t.id).then(() => toast.success("Transfer cancelled (simulated)."), (e) => toast.error((e as Error).message)); }}>
                    Cancel transfer
                  </Button>
                </div>
              )}
              {t.status === "draft" && (
                <Button asChild variant="brand" className="w-full">
                  <Link to="/transfers/$id/verify" params={{ id: t.id }}>Continue setup</Link>
                </Button>
              )}
            </div>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}
