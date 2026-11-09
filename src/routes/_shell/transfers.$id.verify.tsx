import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { AlertTriangle, ArrowRight, BadgeCheck, Loader2, RefreshCw, UserX } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PageHeader, Panel, Row } from "@/components/common/ui-blocks";
import { FlowSteps } from "@/components/transfer/FlowSteps";
import { StepGuard } from "@/components/transfer/StepGuard";
import { VerificationBadge } from "@/components/transfer/badges";
import { useTransfer } from "@/lib/store";
import { verifyRecipient } from "@/services/verification";
import { transferService } from "@/services/transfers";
import type { Transfer } from "@/types";

export const Route = createFileRoute("/_shell/transfers/$id/verify")({
  head: () => ({
    meta: [
      { title: "Verify recipient — SafeSend" },
      { name: "description", content: "Confirm who you're paying before any money moves." },
      { property: "og:title", content: "Verify recipient — SafeSend" },
      { property: "og:description", content: "Recipient identity verification." },
    ],
  }),
  component: () => {
    const { id } = Route.useParams();
    const t = useTransfer(id);
    return (
      <div className="mx-auto max-w-2xl">
        <FlowSteps current={1} />
        <PageHeader title="Recipient verification" description="We check the recipient directory to confirm who owns this account." />
        <StepGuard t={t}>{(t) => <Verify t={t} />}</StepGuard>
      </div>
    );
  },
});

function Verify({ t }: { t: Transfer }) {
  const navigate = useNavigate();
  const v = t.verification;
  const [checking, setChecking] = useState(false);
  const [name, setName] = useState(t.recipientName);
  const started = useRef(false);

  async function run(expected: string) {
    setChecking(true);
    const result = await verifyRecipient(t.recipientEmail, expected);
    try { await transferService.attachVerification(t.id, result); } catch (e) { toast.error((e as Error).message); }
    setChecking(false);
  }

  useEffect(() => {
    if (v.status === "pending" && !started.current) {
      started.current = true;
      void run(t.recipientName);
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const isPending = checking || v.status === "pending";

  return (
    <div className="space-y-6">
      <Panel>
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-wider text-muted-foreground">Recipient email</p>
            <p className="mt-1 font-medium">{t.recipientEmail}</p>
          </div>
          <VerificationBadge status={isPending ? "pending" : v.status} />
        </div>

        <div className="mt-6 rounded-xl border p-5">
          {isPending ? (
            <div className="flex items-center gap-4">
              <Loader2 className="size-8 animate-spin text-brand" />
              <div>
                <p className="font-medium">Verifying recipient…</p>
                <p className="text-sm text-muted-foreground">Checking account ownership and history.</p>
              </div>
            </div>
          ) : v.status === "verified" ? (
            <div className="flex items-center gap-4">
              <BadgeCheck className="size-10 text-success" />
              <div>
                <p className="text-xs text-muted-foreground">Confirmed account holder</p>
                <p className="text-xl font-semibold">{v.confirmedName}</p>
              </div>
            </div>
          ) : v.status === "mismatch" ? (
            <div className="flex gap-4">
              <AlertTriangle className="size-10 shrink-0 text-warning" />
              <div>
                <p className="font-semibold">The name doesn't match</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  You expected <strong className="text-foreground">{v.expectedName}</strong>, but this account belongs to{" "}
                  <strong className="text-foreground">{v.confirmedName}</strong>. Scammers often use look-alike emails.
                </p>
              </div>
            </div>
          ) : (
            <div className="flex gap-4">
              <UserX className="size-10 shrink-0 text-danger" />
              <div>
                <p className="font-semibold">No registered account found</p>
                <p className="mt-1 text-sm text-muted-foreground">Check the email for typos. Payments to unknown accounts receive the highest risk weighting.</p>
              </div>
            </div>
          )}
        </div>

        {!isPending && v.accountAgeDays !== undefined && (
          <div className="mt-4 divide-y">
            <Row label="Account age">{v.accountAgeDays} days</Row>
            <Row label="Name you entered">{v.expectedName || "—"}</Row>
          </div>
        )}
      </Panel>

      {!isPending && v.status !== "verified" && (
        <Panel>
          <p className="text-sm font-medium">Re-check with a different name</p>
          <div className="mt-3 flex gap-2">
            <Input value={name} onChange={(e) => setName(e.target.value)} className="h-10 bg-card" placeholder="Recipient name" />
            <Button variant="outline" size="lg" onClick={() => run(name)}><RefreshCw /> Re-check</Button>
          </div>
        </Panel>
      )}

      <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-between">
        <Button variant="ghost" asChild><Link to="/send">Start over</Link></Button>
        <Button variant="brand" size="lg" disabled={isPending} onClick={() => navigate({ to: "/transfers/$id/risk", params: { id: t.id } })}>
          Continue to risk assessment <ArrowRight />
        </Button>
      </div>
    </div>
  );
}
