import { useEffect } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { ArrowRight, Lightbulb, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PageHeader, Panel, PanelTitle } from "@/components/common/ui-blocks";
import { FlowSteps } from "@/components/transfer/FlowSteps";
import { StepGuard } from "@/components/transfer/StepGuard";
import { RiskBadge } from "@/components/transfer/badges";
import { RiskGauge } from "@/components/transfer/RiskGauge";
import { useTransfer } from "@/lib/store";
import { transferService } from "@/services/transfers";
import type { Transfer } from "@/types";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_shell/transfers/$id/risk")({
  head: () => ({
    meta: [
      { title: "Risk assessment — SafeSend" },
      { name: "description", content: "Explainable, rule-based risk score for your transfer." },
      { property: "og:title", content: "Risk assessment — SafeSend" },
      { property: "og:description", content: "See why your payment received its risk score." },
    ],
  }),
  component: () => {
    const { id } = Route.useParams();
    const t = useTransfer(id);
    return (
      <div className="mx-auto max-w-3xl">
        <FlowSteps current={2} />
        <PageHeader title="Risk assessment" description="Every signal is shown so you understand exactly why." />
        <StepGuard t={t}>{(t) => <Risk t={t} />}</StepGuard>
      </div>
    );
  },
});

function Risk({ t }: { t: Transfer }) {
  const navigate = useNavigate();
  const verificationDone = t.verification.status !== "pending";

  useEffect(() => {
    if (verificationDone && !t.risk) transferService.assess(t.id);
  }, [verificationDone, t.risk, t.id]);

  if (!verificationDone)
    return (
      <Panel className="text-center">
        <p className="font-medium">Verify the recipient first</p>
        <Button asChild variant="brand" className="mt-4"><Link to="/transfers/$id/verify" params={{ id: t.id }}>Go to verification</Link></Button>
      </Panel>
    );
  if (!t.risk) return <Panel className="h-64 animate-pulse" />;
  const r = t.risk;
  const tone = { LOW: "border-success/30 bg-success-soft", MEDIUM: "border-warning/30 bg-warning-soft", HIGH: "border-danger/30 bg-danger-soft" }[r.level];

  return (
    <div className="space-y-6">
      <Panel className="flex flex-col items-center gap-8 sm:flex-row">
        <RiskGauge score={r.score} level={r.level} />
        <div className="flex-1">
          <RiskBadge level={r.level} />
          <p className="mt-3 text-lg font-medium leading-snug">{r.explanation}</p>
        </div>
      </Panel>

      <Panel>
        <PanelTitle>Risk factors</PanelTitle>
        {r.factors.length === 0 ? (
          <div className="flex items-center gap-3 text-sm text-muted-foreground"><ShieldCheck className="size-5 text-success" /> No risk factors detected.</div>
        ) : (
          <ul className="divide-y">
            {r.factors.map((f) => (
              <li key={f.id} className="flex items-start justify-between gap-4 py-3">
                <div>
                  <p className="text-sm font-medium">{f.label}</p>
                  <p className="text-sm text-muted-foreground">{f.detail}</p>
                </div>
                <span className={cn("tabular shrink-0 rounded-md px-2 py-0.5 text-xs font-semibold", f.weight >= 30 ? "bg-danger-soft text-danger" : f.weight >= 15 ? "bg-warning-soft text-warning" : "bg-muted text-muted-foreground")}>+{f.weight}</span>
              </li>
            ))}
          </ul>
        )}
      </Panel>

      <div className={cn("flex gap-3 rounded-xl border p-5", tone)}>
        <Lightbulb className="size-5 shrink-0" />
        <div>
          <p className="text-sm font-semibold">Recommended next action</p>
          <p className="mt-1 text-sm">{r.recommendation}</p>
        </div>
      </div>

      <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-between">
        <Button variant="ghost" asChild><Link to="/transfers/$id/verify" params={{ id: t.id }}>Back</Link></Button>
        <Button variant="brand" size="lg" onClick={() => navigate({ to: "/transfers/$id/review", params: { id: t.id } })}>Review payment <ArrowRight /></Button>
      </div>
    </div>
  );
}
