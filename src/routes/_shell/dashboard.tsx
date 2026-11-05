import { useMemo, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight, Ban, Clock, Inbox, Send, ShieldCheck, Wallet } from "lucide-react";
import { Button } from "@/components/ui/button";
import { EmptyState, PageHeader, Panel, PanelTitle, StatCard } from "@/components/common/ui-blocks";
import { TransferRow } from "@/components/transfer/TransferRow";
import { TransferDetailSheet } from "@/components/transfer/TransferDetailSheet";
import { useTransfers, useUser } from "@/lib/store";
import { getStats } from "@/services/stats";

export const Route = createFileRoute("/_shell/dashboard")({
  head: () => ({
    meta: [
      { title: "Dashboard — SafeSend" },
      { name: "description", content: "Overview of your protected transfers, pending holds and security status." },
      { property: "og:title", content: "Dashboard — SafeSend" },
      { property: "og:description", content: "Your SafeSend transfer overview." },
    ],
  }),
  component: Dashboard,
});

function greeting() {
  const h = new Date().getHours();
  return h < 12 ? "Good morning" : h < 18 ? "Good afternoon" : "Good evening";
}

function Dashboard() {
  const user = useUser();
  const transfers = useTransfers();
  const stats = useMemo(() => getStats(transfers), [transfers]);
  const [open, setOpen] = useState<string | null>(null);
  const pending = transfers.filter((t) => t.status === "pending");

  return (
    <>
      <PageHeader
        title={`${greeting()}, ${user?.name.split(" ")[0] ?? "there"}`}
        description="Here's how your transfers are protected today."
        actions={<Button asChild variant="brand" size="lg"><Link to="/send"><Send /> Send money</Link></Button>}
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Total transfers" value={stats.total} icon={Wallet} hint="Excludes drafts" />
        <StatCard label="Protected transfers" value={stats.protected} icon={ShieldCheck} tone="success" hint="Verified + risk assessed" />
        <StatCard label="Pending" value={stats.pending} icon={Clock} tone="warning" hint="In cancellation window" />
        <StatCard label="Cancelled" value={stats.cancelled} icon={Ban} tone="danger" hint="Stopped before release" />
      </div>

      {pending.length > 0 && (
        <div className="mt-6 flex flex-col gap-3 rounded-xl border border-warning/30 bg-warning-soft p-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3 text-sm">
            <Clock className="size-5 text-warning" />
            <span><strong>{pending.length} transfer{pending.length > 1 ? "s" : ""}</strong> can still be cancelled.</span>
          </div>
          <Button asChild size="sm" variant="outline"><Link to="/transfers/$id/pending" params={{ id: pending[0].id }}>Review now <ArrowRight /></Link></Button>
        </div>
      )}

      <div className="mt-6 grid gap-6 lg:grid-cols-3">
        <Panel className="lg:col-span-2 p-4 sm:p-6">
          <PanelTitle action={<Link to="/history" className="text-sm font-medium text-brand hover:underline">View all</Link>}>Recent activity</PanelTitle>
          {transfers.length === 0 ? (
            <EmptyState icon={Inbox} title="No transfers yet" description="Your protected transfers will appear here." action={<Button asChild variant="brand"><Link to="/send">Send your first transfer</Link></Button>} />
          ) : (
            <div className="-mx-3">{transfers.filter((t) => t.status !== "draft").slice(0, 6).map((t) => <TransferRow key={t.id} t={t} onClick={() => setOpen(t.id)} />)}</div>
          )}
        </Panel>

        <Panel className="bg-primary text-primary-foreground">
          <div className="flex items-center gap-2 text-sm font-semibold"><ShieldCheck className="size-4" /> Security overview</div>
          <div className="mt-6 tabular text-5xl font-semibold">{stats.protectionRate}%</div>
          <p className="mt-1 text-sm text-primary-foreground/70">of transfers fully protected</p>
          <dl className="mt-6 space-y-3 text-sm">
            <div className="flex justify-between"><dt className="text-primary-foreground/70">High-risk flagged</dt><dd className="font-semibold">{stats.highRisk}</dd></div>
            <div className="flex justify-between"><dt className="text-primary-foreground/70">Name mismatches caught</dt><dd className="font-semibold">{stats.mismatches}</dd></div>
            <div className="flex justify-between"><dt className="text-primary-foreground/70">Amount kept safe</dt><dd className="font-semibold">{stats.savedLabel}</dd></div>
          </dl>
          <Button asChild variant="inverse" className="mt-6 w-full"><Link to="/security">Open security center</Link></Button>
        </Panel>
      </div>

      <TransferDetailSheet id={open} onClose={() => setOpen(null)} />
    </>
  );
}
