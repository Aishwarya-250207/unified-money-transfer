import type { RiskLevel, TransferStatus } from "@/types";

/**
 * Single source of truth for transfer lifecycle.
 *   draft -> pending    (confirmed, cancellation window running)
 *   draft -> completed  (confirmed, no window needed)
 *   draft -> cancelled
 *   pending -> completed (window elapsed)
 *   pending -> cancelled (user cancelled inside window)
 * completed and cancelled are terminal.
 */
export const TRANSITIONS: Record<TransferStatus, TransferStatus[]> = {
  draft: ["pending", "completed", "cancelled"],
  pending: ["completed", "cancelled"],
  completed: [],
  cancelled: [],
};

export function canTransition(from: TransferStatus, to: TransferStatus): boolean {
  return TRANSITIONS[from].includes(to);
}

export class InvalidTransitionError extends Error {
  constructor(from: TransferStatus, to: TransferStatus) {
    super(`Transfer cannot move from "${from}" to "${to}".`);
    this.name = "InvalidTransitionError";
  }
}

export function assertTransition(from: TransferStatus, to: TransferStatus) {
  if (!canTransition(from, to)) throw new InvalidTransitionError(from, to);
}

/** Cancellation window (seconds) applied on confirm, by risk level. */
export const HOLD_SECONDS: Record<RiskLevel, number> = {
  LOW: 60,
  MEDIUM: 60,
  HIGH: 60,
};

export function holdSecondsFor(level: RiskLevel | undefined): number {
  return HOLD_SECONDS[level ?? "HIGH"];
}

/** Checkout is allowed only after the saved cancellation deadline. */
export function assertCheckoutEligible(status: string, releaseAt: string | undefined, at = Date.now()) {
  const deadline = releaseAt ? Date.parse(releaseAt) : NaN;
  if (status !== "pending" || !Number.isFinite(deadline) || at < deadline) {
    throw new Error("PayPal checkout requires a pending transfer whose cancellation window has ended.");
  }
}

export function isTerminal(status: TransferStatus) {
  return TRANSITIONS[status].length === 0;
}
