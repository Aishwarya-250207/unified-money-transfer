import type { Currency, RecipientVerification, RiskAssessment, RiskFactor, RiskLevel, Transfer } from "@/types";

export const SCAM_KEYWORDS = [
  "urgent",
  "gift card",
  "crypto",
  "bitcoin",
  "investment",
  "deposit",
  "fee",
  "refund",
  "prize",
  "customs",
];

export interface RiskInput {
  recipientEmail: string;
  amount: number;
  currency: Currency;
  note: string;
  verification: RecipientVerification;
  /** Previous transfers by this user, used for behavioural signals. */
  history: Transfer[];
}

export function levelFor(score: number): RiskLevel {
  if (score >= 60) return "HIGH";
  if (score >= 30) return "MEDIUM";
  return "LOW";
}

/** Rule-based, explainable risk scoring (0–100). Pure function. */
export function assessRisk(input: RiskInput): RiskAssessment {
  const f: RiskFactor[] = [];
  const v = input.verification;

  if (v.status === "not_found")
    f.push({ id: "not_found", label: "Recipient not registered", detail: "No account matches this email in the recipient directory.", weight: 40 });
  if (v.status === "mismatch")
    f.push({ id: "mismatch", label: "Name mismatch", detail: `You expected "${v.expectedName}", but the account belongs to "${v.confirmedName}".`, weight: 35 });
  if (v.status === "pending")
    f.push({ id: "unverified", label: "Verification incomplete", detail: "The recipient has not been verified yet.", weight: 15 });

  if (v.accountAgeDays !== undefined && v.accountAgeDays < 30)
    f.push({ id: "new_account", label: "Recently created account", detail: `Recipient account is only ${v.accountAgeDays} days old.`, weight: 15 });

  const email = input.recipientEmail.trim().toLowerCase();
  const past = input.history.filter((t) => t.status === "completed");
  if (!past.some((t) => t.recipientEmail === email))
    f.push({ id: "new_recipient", label: "First payment to this recipient", detail: "You have never completed a transfer to this person.", weight: 15 });

  if (input.amount >= 1000)
    f.push({ id: "large_amount", label: "Large amount", detail: "Transfers of 1,000 or more are common in scam losses.", weight: 20 });
  else if (input.amount >= 500)
    f.push({ id: "elevated_amount", label: "Elevated amount", detail: "Amount is above your typical everyday transfer.", weight: 10 });

  if (past.length >= 2) {
    const avg = past.reduce((s, t) => s + t.amount, 0) / past.length;
    if (input.amount > avg * 3)
      f.push({ id: "unusual_amount", label: "Unusual for you", detail: `More than 3× your average transfer of ${avg.toFixed(0)}.`, weight: 10 });
  }

  const note = input.note.toLowerCase();
  const hits = SCAM_KEYWORDS.filter((k) => note.includes(k));
  if (hits.length)
    f.push({ id: "keywords", label: "Scam-pattern language", detail: `Payment note mentions: ${hits.join(", ")}.`, weight: 20 });

  const score = Math.min(100, f.reduce((s, x) => s + x.weight, 0));
  const level = levelFor(score);

  const explanation =
    f.length === 0
      ? "Verified recipient you've paid before, with an ordinary amount and note. No risk signals detected."
      : `Score driven by ${f.length} signal${f.length > 1 ? "s" : ""}: ${[...f].sort((a, b) => b.weight - a.weight).map((x) => x.label.toLowerCase()).join(", ")}.`;

  const recommendation = {
    LOW: "Safe to proceed. The transfer will be released immediately after confirmation.",
    MEDIUM: "Double-check the recipient through another channel. A short cancellation window will apply.",
    HIGH: "Pause and contact the recipient directly before sending. If you continue, an extended cancellation window will apply.",
  }[level];

  return { score, level, factors: f, explanation, recommendation, assessedAt: new Date().toISOString() };
}
