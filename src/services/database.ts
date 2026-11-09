import { getSupabase, isCloudConfigured } from "@/integrations/supabase/client";
import type { RecipientVerification, Transfer, TransferEvent } from "@/types";

export interface DatabaseTransferRow {
  id: string;
  user_id: string;
  recipient_email: string;
  recipient_name: string;
  amount: number | string;
  currency: string;
  note: string | null;
  status: string;
  verification: RecipientVerification;
  risk: any;
  idempotency_key?: string | null;
  payment_rail?: string | null;
  confirmed_at: string | null;
  release_at: string | null;
  completed_at: string | null;
  cancelled_at: string | null;
  is_demo: boolean;
  created_at: string;
  updated_at: string;
  transfer_events?: DatabaseEventRow[];
}

export interface DatabaseEventRow {
  id: string;
  transfer_id: string;
  user_id: string;
  type: string;
  message: string;
  created_at: string;
}

export function toAppTransfer(row: DatabaseTransferRow): Transfer {
  const events: TransferEvent[] = (row.transfer_events ?? [])
    .map((e) => ({
      id: e.id,
      type: e.type as TransferEvent["type"],
      at: e.created_at,
      message: e.message,
    }))
    .sort((a, b) => a.at.localeCompare(b.at));

  return {
    id: row.id,
    userId: row.user_id,
    recipientEmail: row.recipient_email,
    recipientName: row.recipient_name,
    amount: Number(row.amount),
    currency: row.currency as Transfer["currency"],
    note: row.note ?? "",
    status: row.status as Transfer["status"],
    verification: row.verification ?? {
      email: row.recipient_email,
      status: "pending",
      expectedName: row.recipient_name,
    },
    risk: row.risk ?? undefined,
    createdAt: row.created_at,
    confirmedAt: row.confirmed_at ?? undefined,
    releaseAt: row.release_at ?? undefined,
    completedAt: row.completed_at ?? undefined,
    cancelledAt: row.cancelled_at ?? undefined,
    isDemo: Boolean(row.is_demo),
    idempotencyKey: row.idempotency_key ?? undefined,
    paymentRail: row.payment_rail ?? undefined,
    events,
  };
}

export const databaseService = {
  isAvailable(): boolean {
    return typeof window !== "undefined" && isCloudConfigured();
  },

  /**
   * Fetches all transfers and their audit events for the authenticated user.
   * Row Level Security ensures only the user's own rows are returned.
   */
  async fetchTransfers(userId: string): Promise<Transfer[] | null> {
    if (!this.isAvailable()) return null;

    try {
      const supabase = getSupabase();
      const { data, error } = await supabase
        .from("transfers")
        .select("*, transfer_events(*)")
        .eq("user_id", userId)
        .order("created_at", { ascending: false });

      if (error) {
        console.warn("Could not query transfers table from Supabase:", error.message);
        return null;
      }

      if (!data) return [];
      return data.map((row: any) => toAppTransfer(row as DatabaseTransferRow));
    } catch (err) {
      console.warn("Supabase fetchTransfers error:", err);
      return null;
    }
  },

  /**
   * Upserts a transfer to the persistent database.
   */
  async persistTransfer(transfer: Transfer): Promise<boolean> {
    if (!this.isAvailable()) return false;

    try {
      const supabase = getSupabase();
      const payload = {
        id: transfer.id,
        user_id: transfer.userId,
        recipient_email: transfer.recipientEmail,
        recipient_name: transfer.recipientName,
        amount: transfer.amount,
        currency: transfer.currency,
        note: transfer.note,
        status: transfer.status,
        verification: transfer.verification,
        risk: transfer.risk ?? null,
        idempotency_key: transfer.idempotencyKey ?? null,
        payment_rail: transfer.paymentRail ?? "paypal_sandbox_simulated",
        confirmed_at: transfer.confirmedAt ?? null,
        release_at: transfer.releaseAt ?? null,
        completed_at: transfer.completedAt ?? null,
        cancelled_at: transfer.cancelledAt ?? null,
        is_demo: transfer.isDemo,
        created_at: transfer.createdAt,
        updated_at: new Date().toISOString(),
      };

      const { error } = await supabase.from("transfers").upsert(payload);
      if (error) {
        console.warn("Could not persist transfer to Supabase:", error.message);
        return false;
      }
      return true;
    } catch (err) {
      console.warn("Supabase persistTransfer error:", err);
      return false;
    }
  },

  /**
   * Records a transfer audit event in the database.
   */
  async recordEvent(transferId: string, event: TransferEvent, userId: string): Promise<boolean> {
    if (!this.isAvailable()) return false;

    try {
      const supabase = getSupabase();
      const { error } = await supabase.from("transfer_events").insert({
        id: event.id,
        transfer_id: transferId,
        user_id: userId,
        type: event.type,
        message: event.message,
        created_at: event.at,
      });

      if (error) {
        console.warn("Could not insert transfer event in Supabase:", error.message);
        return false;
      }
      return true;
    } catch (err) {
      console.warn("Supabase recordEvent error:", err);
      return false;
    }
  },

  /**
   * Persists recipient details in the database.
   */
  async persistRecipient(
    email: string,
    name: string,
    verification: RecipientVerification,
    userId: string,
  ): Promise<boolean> {
    if (!this.isAvailable()) return false;

    try {
      const supabase = getSupabase();
      const { error } = await supabase.from("recipients").upsert(
        {
          user_id: userId,
          email: email.trim().toLowerCase(),
          name: name.trim(),
          confirmed_name: verification.confirmedName ?? null,
          account_age_days: verification.accountAgeDays ?? null,
          status: verification.status,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "user_id, email" },
      );

      if (error) {
        console.warn("Could not persist recipient in Supabase:", error.message);
        return false;
      }
      return true;
    } catch (err) {
      console.warn("Supabase persistRecipient error:", err);
      return false;
    }
  },
};
