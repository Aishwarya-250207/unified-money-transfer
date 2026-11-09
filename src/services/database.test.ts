import { describe, expect, it } from "vitest";
import { toAppTransfer, type DatabaseTransferRow } from "./database";

describe("database service mapping", () => {
  it("correctly maps a Supabase row to the app Transfer model", () => {
    const row: DatabaseTransferRow = {
      id: "tr_test123",
      user_id: "usr_alice",
      recipient_email: "bob@example.com",
      recipient_name: "Bob Smith",
      amount: "150.50",
      currency: "USD",
      note: "Dinner share",
      status: "completed",
      verification: {
        email: "bob@example.com",
        status: "verified",
        confirmedName: "Bob Smith",
      },
      risk: {
        score: 10,
        level: "LOW",
        factors: [],
        explanation: "Low risk transfer",
        recommendation: "Safe to proceed",
        assessedAt: "2026-11-09T10:00:00Z",
      },
      idempotency_key: "idem_abc",
      payment_rail: "PayPal Sandbox (Simulated)",
      confirmed_at: "2026-11-09T10:01:00Z",
      release_at: "2026-11-09T10:01:00Z",
      completed_at: "2026-11-09T10:01:00Z",
      cancelled_at: null,
      is_demo: false,
      created_at: "2026-11-09T10:00:00Z",
      updated_at: "2026-11-09T10:01:00Z",
      transfer_events: [
        {
          id: "evt_1",
          transfer_id: "tr_test123",
          user_id: "usr_alice",
          type: "created",
          message: "Transfer draft created.",
          created_at: "2026-11-09T10:00:00Z",
        },
        {
          id: "evt_2",
          transfer_id: "tr_test123",
          user_id: "usr_alice",
          type: "released",
          message: "Released to recipient.",
          created_at: "2026-11-09T10:01:00Z",
        },
      ],
    };

    const transfer = toAppTransfer(row);

    expect(transfer.id).toBe("tr_test123");
    expect(transfer.userId).toBe("usr_alice");
    expect(transfer.amount).toBe(150.5);
    expect(transfer.status).toBe("completed");
    expect(transfer.paymentRail).toBe("PayPal Sandbox (Simulated)");
    expect(transfer.events).toHaveLength(2);
    expect(transfer.events[0].type).toBe("created");
    expect(transfer.events[1].type).toBe("released");
  });
});
