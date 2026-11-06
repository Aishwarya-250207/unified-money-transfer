import { useMemo, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { Search, SearchX } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { EmptyState, PageHeader, Panel } from "@/components/common/ui-blocks";
import { TransferRow } from "@/components/transfer/TransferRow";
import { TransferDetailSheet } from "@/components/transfer/TransferDetailSheet";
import { useTransfers } from "@/lib/store";
import type { TransferStatus } from "@/types";
import { cn } from "@/lib/utils";

const FILTERS: ("all" | TransferStatus)[] = ["all", "pending", "completed", "cancelled", "draft"];

export const Route = createFileRoute("/_shell/history")({
  head: () => ({
    meta: [
      { title: "Transactions — SafeSend" },
      { name: "description", content: "Search and filter every protected transfer." },
      { property: "og:title", content: "Transactions — SafeSend" },
      { property: "og:description", content: "Your SafeSend transaction history." },
    ],
  }),
  component: History,
});

function History() {
  const transfers = useTransfers();
  const [q, setQ] = useState("");
  const [filter, setFilter] = useState<(typeof FILTERS)[number]>("all");
  const [open, setOpen] = useState<string | null>(null);

  const list = useMemo(() => {
    const s = q.trim().toLowerCase();
    return transfers.filter(
      (t) =>
        (filter === "all" || t.status === filter) &&
        (!s || [t.recipientEmail, t.recipientName, t.verification.confirmedName, t.note].some((x) => x?.toLowerCase().includes(s))),
    );
  }, [transfers, q, filter]);

  return (
    <>
      <PageHeader title="Transactions" description="Every transfer, its status and its protection history." actions={<Button asChild variant="brand"><Link to="/send">New transfer</Link></Button>} />
      <Panel className="p-4 sm:p-6">
        <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="relative sm:w-72">
            <Search className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search name, email or note" className="h-10 bg-card pl-9" />
          </div>
          <div className="flex flex-wrap gap-1">
            {FILTERS.map((f) => (
              <button key={f} onClick={() => setFilter(f)} className={cn("rounded-full px-3 py-1 text-xs font-medium capitalize", filter === f ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted")}>
                {f}
              </button>
            ))}
          </div>
        </div>
        {list.length === 0 ? (
          <EmptyState icon={SearchX} title="No matching transfers" description="Try a different search or filter." />
        ) : (
          <div className="-mx-3 divide-y">{list.map((t) => <TransferRow key={t.id} t={t} onClick={() => setOpen(t.id)} />)}</div>
        )}
      </Panel>
      <TransferDetailSheet id={open} onClose={() => setOpen(null)} />
    </>
  );
}
