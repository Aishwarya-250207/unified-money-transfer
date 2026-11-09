import type { Currency, RecipientVerification, Transfer, TransferEvent, TransferStatus } from "@/types";
import { getState, setState } from "@/lib/store";
import { supabase } from "@/integrations/supabase/client";
import { assessRisk } from "./risk";
import { assertTransition, holdSecondsFor } from "./transfer-machine";

/**
 * Transfer persistence lives in Lovable Cloud (tables: transfers, transfer_events, recipients).
 * Every write hits the database first; the shared store is updated only after the write succeeds,
 * so the UI never reports a save/cancel/complete that the database rejected. RLS isolates users.
 */
const now = () => new Date().toISOString();
const newId = () => crypto.randomUUID();

function event(type: TransferEvent["type"], message: string, at = now()): TransferEvent {
  return { id: newId(), type, at, message };
}

type Row = {
  id: string; user_id: string; recipient_email: string; recipient_name: string; amount: number | string;
  currency: string; note: string; status: string; verification: unknown; risk: unknown; is_demo: boolean;
  created_at: string; confirmed_at: string | null; release_at: string | null; completed_at: string | null;
  cancelled_at: string | null;
  transfer_events?: { id: string; type: string; message: string; at: string }[];
};

function fromRow(r: Row): Transfer {
  return {
    id: r.id, userId: r.user_id, recipientEmail: r.recipient_email, recipientName: r.recipient_name,
    amount: Number(r.amount), currency: r.currency as Currency, note: r.note, status: r.status as TransferStatus,
    verification: r.verification as RecipientVerification, risk: (r.risk ?? undefined) as Transfer["risk"],
    createdAt: r.created_at, confirmedAt: r.confirmed_at ?? undefined, releaseAt: r.release_at ?? undefined,
    completedAt: r.completed_at ?? undefined, cancelledAt: r.cancelled_at ?? undefined, isDemo: r.is_demo,
    events: (r.transfer_events ?? [])
      .map((e) => ({ id: e.id, type: e.type as TransferEvent["type"], message: e.message, at: e.at }))
      .sort((a, b) => a.at.localeCompare(b.at)),
  };
}

function requireUser() {
  const u = getState().user;
  if (!u) throw new Error("You are signed out. Log in again to save transfers.");
  return u;
}

function dbError(action: string, e: { message: string } | null): never {
  throw new Error(`Could not ${action}: ${e?.message ?? "database rejected the change"}. Nothing was changed.`);
}

async function saveEvents(transferId: string, evs: TransferEvent[]) {
  const userId = requireUser().id;
  const { error } = await supabase.from("transfer_events").insert(
    evs.map((e) => ({ id: e.id, transfer_id: transferId, user_id: userId, type: e.type, message: e.message, at: e.at })),
  );
  if (error) dbError("record the transfer event", error);
}

/** Persist changes (guarded by the expected current status), then events, then update the store. */
async function persist(t: Transfer, next: Transfer, newEvents: TransferEvent[], action: string) {
  const { data, error } = await supabase
    .from("transfers")
    .update({
      status: next.status,
      verification: next.verification as never,
      risk: (next.risk ?? null) as never,
      confirmed_at: next.confirmedAt ?? null,
      release_at: next.releaseAt ?? null,
      completed_at: next.completedAt ?? null,
      cancelled_at: next.cancelledAt ?? null,
    })
    .eq("id", t.id)
    .eq("status", t.status)
    .select("id")
    .maybeSingle();
  if (error) dbError(action, error);
  if (!data) {
    await transferService.loadAll();
    throw new Error(`Could not ${action}: the transfer changed elsewhere. Latest status reloaded.`);
  }
  await saveEvents(t.id, newEvents);
  setState((s) => ({ ...s, transfers: s.transfers.map((x) => (x.id === t.id ? next : x)) }));
  return next;
}

function find(id: string) {
  const t = getState().transfers.find((x) => x.id === id);
  if (!t) throw new Error("Transfer not found");
  return t;
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

let creating = false;
const inFlight = new Set<string>();

export const transferService = {
  /** Fetch the signed-in user's transfers (with events) from the database. */
  async loadAll() {
    if (!getState().user) return setState((s) => ({ ...s, transfers: [] }));
    const { data, error } = await supabase
      .from("transfers")
      .select("*, transfer_events(id,type,message,at)")
      .order("created_at", { ascending: false });
    if (error) dbError("load your transfers", error);
    setState((s) => ({ ...s, transfers: (data as Row[]).map(fromRow) }));
  },

  async createDraft(input: NewTransferInput): Promise<Transfer> {
    if (creating) throw new Error("A transfer is already being saved.");
    creating = true;
    try {
      const user = requireUser();
      const email = input.recipientEmail.trim().toLowerCase();
      const name = input.recipientName.trim();
      const { data: rec, error: recErr } = await supabase
        .from("recipients")
        .upsert({ user_id: user.id, email, name }, { onConflict: "user_id,email" })
        .select("id")
        .single();
      if (recErr) dbError("save the recipient", recErr);
      const ev = event("created", `Transfer draft created for ${email}.`);
      const t: Transfer = {
        id: newId(), userId: user.id, recipientEmail: email, recipientName: name,
        amount: Math.round(input.amount * 100) / 100, currency: input.currency, note: input.note.trim(),
        status: "draft", verification: { email, status: "pending", expectedName: name },
        createdAt: now(), isDemo: false, events: [ev],
      };
      const { error } = await supabase.from("transfers").insert({
        id: t.id, user_id: user.id, recipient_id: rec.id, recipient_email: email, recipient_name: name,
        amount: t.amount, currency: t.currency, note: t.note, status: "draft",
        verification: t.verification as never, created_at: t.createdAt,
      });
      if (error) dbError("save the transfer", error);
      await saveEvents(t.id, [ev]);
      setState((s) => ({ ...s, transfers: [t, ...s.transfers] }));
      return t;
    } finally {
      creating = false;
    }
  },

  async attachVerification(id: string, v: RecipientVerification) {
    const t = find(id);
    requireDraft(t);
    const msg = {
      verified: `Recipient verified as ${v.confirmedName}.`,
      mismatch: `Name mismatch: expected "${v.expectedName}", found "${v.confirmedName}".`,
      not_found: "Recipient not found in directory.",
      pending: "Verification pending.",
    }[v.status];
    const ev = event("verified", msg);
    // Any change to verification invalidates a previous risk score.
    return persist(t, { ...t, verification: v, risk: undefined, events: [...t.events, ev] }, [ev], "save verification");
  },

  async assess(id: string) {
    const t = find(id);
    requireDraft(t);
    if (inFlight.has(id)) return t;
    inFlight.add(id);
    try {
      const history = getState().transfers.filter((x) => x.id !== id);
      const risk = assessRisk({ ...t, history });
      const ev = event("risk_assessed", `Risk assessed: ${risk.level} (${risk.score}/100).`);
      return await persist(t, { ...t, risk, events: [...t.events, ev] }, [ev], "save the risk assessment");
    } finally {
      inFlight.delete(id);
    }
  },

  async confirm(id: string) {
    const t = find(id);
    requireDraft(t);
    if (t.verification.status === "pending") throw new Error("Verify the recipient first.");
    if (!t.risk) throw new Error("Run the risk assessment first.");
    const hold = holdSecondsFor(t.risk.level);
    const confirmedAt = now();
    const c = event("confirmed", "Transfer confirmed.");
    const base = { ...t, events: [...t.events, c] };
    if (hold === 0) {
      const r = event("released", "Marked complete (simulated — no real money moved).");
      return persist(t, applyTransition(base, "completed", r, { confirmedAt, completedAt: confirmedAt }), [c, r], "confirm the transfer");
    }
    const releaseAt = new Date(Date.now() + hold * 1000).toISOString();
    const h = event("hold_started", `Cancellation window started (${hold}s).`);
    return persist(t, applyTransition(base, "pending", h, { confirmedAt, releaseAt }), [c, h], "confirm the transfer");
  },

  async cancel(id: string, reason = "Cancelled by sender.") {
    const t = find(id);
    const ev = event("cancelled", reason);
    return persist(t, applyTransition(t, "cancelled", ev, { cancelledAt: now() }), [ev], "cancel the transfer");
  },

  async release(id: string) {
    const t = find(id);
    const ev = event("released", "Cancellation window ended. Marked complete (simulated — no real money moved).");
    return persist(t, applyTransition(t, "completed", ev, { completedAt: now() }), [ev], "complete the transfer");
  },

  /** Complete every pending transfer whose window has elapsed. Called by the app shell ticker. */
  async releaseDue(at = Date.now()) {
    const due = getState().transfers.filter(
      (t) => t.status === "pending" && t.releaseAt && new Date(t.releaseAt).getTime() <= at && !inFlight.has(t.id),
    );
    for (const t of due) {
      inFlight.add(t.id);
      try {
        await this.release(t.id);
      } finally {
        inFlight.delete(t.id);
      }
    }
  },
};
