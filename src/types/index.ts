// Centralized domain types shared by services, store and UI.
// Shapes mirror the planned database tables (users, recipients, transfers, risk assessments, transfer_events).

export type Currency = "USD" | "EUR" | "GBP" | "INR";
export const CURRENCIES: Currency[] = ["USD", "EUR", "GBP", "INR"];

export interface User {
  id: string;
  name: string;
  email: string;
  createdAt: string;
}

export type VerificationStatus = "pending" | "verified" | "mismatch" | "not_found";

export interface RecipientVerification {
  email: string;
  status: VerificationStatus;
  /** Name the sender says they expect. */
  expectedName?: string;
  /** Name on file in the (simulated) recipient directory. */
  confirmedName?: string;
  accountAgeDays?: number;
  checkedAt?: string;
}

export type RiskLevel = "LOW" | "MEDIUM" | "HIGH";

export interface RiskFactor {
  id: string;
  label: string;
  detail: string;
  weight: number;
}

export interface RiskAssessment {
  score: number;
  level: RiskLevel;
  factors: RiskFactor[];
  explanation: string;
  recommendation: string;
  assessedAt: string;
}

/** See services/transfer-machine.ts for allowed transitions. */
export type TransferStatus = "draft" | "pending" | "completed" | "cancelled";

export type TransferEventType =
  | "created"
  | "verified"
  | "risk_assessed"
  | "confirmed"
  | "hold_started"
  | "released"
  | "cancelled";

export interface TransferEvent {
  id: string;
  type: TransferEventType;
  at: string;
  message: string;
}

export interface Transfer {
  id: string;
  userId: string;
  recipientEmail: string;
  recipientName: string;
  amount: number;
  currency: Currency;
  note: string;
  status: TransferStatus;
  verification: RecipientVerification;
  risk?: RiskAssessment;
  createdAt: string;
  confirmedAt?: string;
  releaseAt?: string;
  completedAt?: string;
  cancelledAt?: string;
  isDemo: boolean;
  events: TransferEvent[];
}
