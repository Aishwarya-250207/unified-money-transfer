import type { Currency, RecipientVerification, Transfer, TransferEvent, TransferStatus } from "@/types";
import { getState, setState } from "@/lib/store";
import { assessRisk } from "./risk";
import { assertTransition, holdSecondsFor } from "./transfer-machine";

const uid = (p: string) => `${p}_${Math.random().toString(36).slice(2, 10)}`;
const now = () => new Date().toISOString();

function event(type: TransferEvent["type"], message: string, at = now()): TransferEvent {
  return { id: uid("evt"), type, at, message };
}

function update(id: string, fn: (t: Transfer) => Transfer) {
  const t = getState().transfers.find((x) => x.id === id);
  if (!t) throw new Error("Transfer not found");
  const next = fn(t);
  setState((s) => ({ ...s, transfers: s.transfers.map((x) => (x.id === id ? next : x)) }));
  return next;
}

/** Pure transition helper — enforces the state machine. */
export function applyTransition(
  t: Transfer,
  to: TransferStatus,
  ev: TransferEvent,
  patch: Partial<Transfer> = {},
): Transfer {
  assertTransition(t.status, to);
  return { ...t, ...patch, status: to, events: [...t.events, ev] };
}

function requireDraft(t: Transfer) {
  if (t.status !== "draft") throw new Error("This transfer has already been submitted.");
}

export interface NewTransferInput {
  recipientEmail: string;
  recipientName: string;
  amount: number;
  currency: Currency;
  note: string;
}

export const transferService = {
  createDraft(input: NewTransferInput): Transfer {
    const user = getState().user;
    const email = input.recipientEmail.trim().toLowerCase();
    const t: Transfer = {
      id: uid("tr"),
      userId: user?.id ?? "anonymous",
      recipientEmail: email,
      recipientName: input.recipientName.trim(),
      amount: Math.round(input.amount * 100) / 100,
      currency: input.currency,
      note: input.note.trim(),
      status: "draft",
      verification: { email, status: "pending", expectedName: input.recipientName.trim() },
      createdAt: now(),
      isDemo: false,
      events: [event("created", `Transfer draft created for ${email}.`)],
    };
    setState((s) => ({ ...s, transfers: [t, ...s.transfers] }));
    return t;
  },

  attachVerification(id: string, v: RecipientVerification) {
    return update(id, (t) => {
      requireDraft(t);
      const msg = {
        verified: `Recipient verified as ${v.confirmedName}.`,
        mismatch: `Name mismatch: expected "${v.expectedName}", found "${v.confirmedName}".`,
        not_found: "Recipient not found in directory.",
        pending: "Verification pending.",
      }[v.status];
      // Any change to verification invalidates a previous risk score.
      return { ...t, verification: v, risk: undefined, events: [...t.events, event("verified", msg)] };
    });
  },

  assess(id: string) {
    return update(id, (t) => {
      requireDraft(t);
      const history = getState().transfers.filter((x) => x.id !== id);
      const risk = assessRisk({ ...t, history });
      return {
        ...t,
        risk,
        events: [...t.events, event("risk_assessed", `Risk assessed: ${risk.level} (${risk.score}/100).`)],
      };
    });
  },

  confirm(id: string) {
    return update(id, (t) => {
      requireDraft(t);
      if (t.verification.status === "pending") throw new Error("Verify the recipient first.");
      if (!t.risk) throw new Error("Run the risk assessment first.");
      const hold = holdSecondsFor(t.risk.level);
      const confirmedAt = now();
      if (hold === 0) {
        const c = applyTransition(t, "completed", event("confirmed", "Transfer confirmed."), { confirmedAt });
        return applyTransition({ ...c, status: "draft" }, "completed", event("released", "Released to recipient (simulated)."), {
          completedAt: confirmedAt,
        });
      }
      const releaseAt = new Date(Date.now() + hold * 1000).toISOString();
      const c = { ...t, events: [...t.events, event("confirmed", "Transfer confirmed.")] };
      return applyTransition(c, "pending", event("hold_started", `Cancellation window started (${hold}s).`), {
        confirmedAt,
        releaseAt,
      });
    });
  },

  cancel(id: string, reason = "Cancelled by sender.") {
    return update(id, (t) => applyTransition(t, "cancelled", event("cancelled", reason), { cancelledAt: now() }));
  },

  release(id: string) {
    return update(id, (t) =>
      applyTransition(t, "completed", event("released", "Cancellation window ended. Released (simulated)."), {
        completedAt: now(),
      }),
    );
  },

  /** Release every pending transfer whose window has elapsed. Called by the app shell ticker. */
  releaseDue(at = Date.now()) {
    getState()
      .transfers.filter((t) => t.status === "pending" && t.releaseAt && new Date(t.releaseAt).getTime() <= at)
      .forEach((t) => this.release(t.id));
  },
};
