import { describe, expect, it } from "vitest";
import { serverSecurity, SecurityError } from "./server-security";
import type { RiskInput } from "@/types";

describe("serverSecurity backend rules", () => {
  it("enforces valid transitions and rejects invalid ones", () => {
    expect(() => serverSecurity.assertTransition("draft", "pending")).not.toThrow();
    expect(() => serverSecurity.assertTransition("draft", "completed")).not.toThrow();
    expect(() => serverSecurity.assertTransition("pending", "cancelled")).not.toThrow();

    // Terminal states cannot transition
    expect(() => serverSecurity.assertTransition("completed", "pending")).toThrow();
    expect(() => serverSecurity.assertTransition("cancelled", "draft")).toThrow();
  });

  it("enforces cancellation deadline during pending hold", () => {
    const futureTime = new Date(Date.now() + 60000).toISOString();
    const pastTime = new Date(Date.now() - 5000).toISOString();

    // Draft is always cancellable
    expect(() => serverSecurity.assertCancellationEligible("draft")).not.toThrow();

    // Pending with active window is cancellable
    expect(() => serverSecurity.assertCancellationEligible("pending", futureTime)).not.toThrow();

    // Pending with EXPIRED window CANNOT be cancelled
    expect(() => serverSecurity.assertCancellationEligible("pending", pastTime)).toThrow(SecurityError);
    expect(() => serverSecurity.assertCancellationEligible("pending", pastTime)).toThrow(
      /Cancellation window has expired/i,
    );

    // Completed or cancelled transfers cannot be cancelled
    expect(() => serverSecurity.assertCancellationEligible("completed", futureTime)).toThrow(SecurityError);
    expect(() => serverSecurity.assertCancellationEligible("cancelled", futureTime)).toThrow(SecurityError);
  });

  it("enforces release eligibility only after cancellation window has expired", () => {
    const futureTime = new Date(Date.now() + 60000).toISOString();
    const pastTime = new Date(Date.now() - 5000).toISOString();

    // Cannot release if window is still active
    expect(() => serverSecurity.assertReleaseEligible("pending", futureTime)).toThrow(SecurityError);
    expect(() => serverSecurity.assertReleaseEligible("pending", futureTime)).toThrow(
      /Cancellation window is still active/i,
    );

    // Can release when window is expired
    expect(() => serverSecurity.assertReleaseEligible("pending", pastTime)).not.toThrow();

    // Cannot release non-pending transfers
    expect(() => serverSecurity.assertReleaseEligible("draft", pastTime)).toThrow(SecurityError);
    expect(() => serverSecurity.assertReleaseEligible("completed", pastTime)).toThrow(SecurityError);
  });

  it("prevents duplicate operations within ttl window", () => {
    const uniqueKey = `op_${Date.now()}_${Math.random()}`;

    // First operation succeeds
    expect(() => serverSecurity.assertIdempotent(uniqueKey, 2000)).not.toThrow();

    // Immediate duplicate operation is rejected
    expect(() => serverSecurity.assertIdempotent(uniqueKey, 2000)).toThrow(SecurityError);
    expect(() => serverSecurity.assertIdempotent(uniqueKey, 2000)).toThrow(/Duplicate operation detected/i);
  });

  it("computes server-side risk assessment", () => {
    const input: RiskInput = {
      recipientEmail: "urgent.prizes@unknown.com",
      amount: 1500,
      currency: "USD",
      note: "urgent refund deposit",
      verification: {
        email: "urgent.prizes@unknown.com",
        status: "not_found",
      },
      history: [],
    };

    const assessment = serverSecurity.assessRiskServer(input);
    expect(assessment.level).toBe("HIGH");
    expect(assessment.score).toBeGreaterThanOrEqual(60);
    expect(assessment.factors.some((f) => f.id === "not_found")).toBe(true);
    expect(assessment.factors.some((f) => f.id === "large_amount")).toBe(true);
  });
});
