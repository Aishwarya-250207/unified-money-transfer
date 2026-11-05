import type { ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import { FileQuestion, Lock } from "lucide-react";
import type { Transfer } from "@/types";
import { Button } from "@/components/ui/button";
import { EmptyState, Panel } from "@/components/common/ui-blocks";

/** Ensures a draft-only step page is only usable while the transfer is still a draft. */
export function StepGuard({ t, children }: { t: Transfer | undefined; children: (t: Transfer) => ReactNode }) {
  if (!t)
    return (
      <Panel>
        <EmptyState icon={FileQuestion} title="Transfer not found" description="It may have been removed or the link is incorrect."
          action={<Button asChild variant="brand"><Link to="/send">Start a new transfer</Link></Button>} />
      </Panel>
    );
  if (t.status !== "draft")
    return (
      <Panel>
        <EmptyState icon={Lock} title="This transfer was already submitted" description={`Its current status is ${t.status}. Details can no longer be changed.`}
          action={t.status === "pending"
            ? <Button asChild variant="brand"><Link to="/transfers/$id/pending" params={{ id: t.id }}>View cancellation window</Link></Button>
            : <Button asChild variant="outline"><Link to="/history">View transactions</Link></Button>} />
      </Panel>
    );
  return <>{children(t)}</>;
}
