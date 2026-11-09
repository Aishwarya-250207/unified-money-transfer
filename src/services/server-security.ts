import type { RiskInput, RiskAssessment, TransferStatus } from "@/types";
import { assertTransition } from "./transfer-machine";
import { assessRisk } from "./risk";

/** In-memory idempotency cache to prevent rapid duplicate operations */
const operationCache = new Map<string, number>();

export class SecurityError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "SecurityError";
  }
}

export const serverSecurity = {
  /**
   * Enforces valid state transitions according to the transfer lifecycle state machine.
   * Completed and cancelled states are strictly terminal.
   */
  assertTransition(from: TransferStatus, to: TransferStatus) {
    assertTransition(from, to);
  },

  /**
   * Server-enforced cancellation deadline check.
   * If a transfer has a releaseAt timestamp and that time has passed, cancellation MUST be rejected.
   */
  assertCancellationEligible(status: TransferStatus, releaseAt?: string, nowMs = Date.now()) {
    if (status !== "draft" && status !== "pending") {
      throw new SecurityError(`Cannot cancel a transfer in "${status}" status.`);
    }

    if (status === "pending" && releaseAt) {
      const releaseTime = new Date(releaseAt).getTime();
      if (nowMs > releaseTime) {
        throw new SecurityError("Cancellation window has expired. The transfer can no longer be cancelled.");
      }
    }
  },

  /**
   * Server-enforced release eligibility check.
   * A pending transfer CANNOT be released before its releaseAt cancellation window expires.
   */
  assertReleaseEligible(status: TransferStatus, releaseAt?: string, nowMs = Date.now()) {
    if (status !== "pending") {
      throw new SecurityError(`Cannot release a transfer in "${status}" status. Status must be "pending".`);
    }

    if (releaseAt) {
      const releaseTime = new Date(releaseAt).getTime();
      if (nowMs < releaseTime) {
        throw new SecurityError("Cancellation window is still active. The transfer cannot be prematurely released.");
      }
    }
  },

  /**
   * Prevents duplicate operations (e.g. double submit, re-confirming, concurrent cancel).
   */
  assertIdempotent(operationKey: string, ttlMs = 5000): void {
    const now = Date.now();
    const lastSeen = operationCache.get(operationKey);

    if (lastSeen && now - lastSeen < ttlMs) {
      throw new SecurityError("Duplicate operation detected. Please wait a moment before trying again.");
    }

    operationCache.set(operationKey, now);

    // Prune stale keys if cache gets large
    if (operationCache.size > 200) {
      for (const [key, timestamp] of operationCache.entries()) {
        if (now - timestamp > ttlMs) {
          operationCache.delete(key);
        }
      }
    }
  },

  /**
   * Server-side risk assessment execution.
   * Guarantees that risk scores, levels, and cancellation windows cannot be forged on the client.
   */
  assessRiskServer(input: RiskInput): RiskAssessment {
    return assessRisk(input);
  },
};
