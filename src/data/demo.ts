import type { Currency, Transfer, TransferEvent, TransferStatus } from "@/types";
import { lookupRecipient } from "@/services/verification";
import { assessRisk } from "@/services/risk";

/** DEMO DATA — sample transfers shown on first load. Flagged isDemo: true. */
interface Seed {
  email: string;
  name: string;
  amount: number;
  currency: Currency;
  note: string;
  status: Exclude<TransferStatus, "draft" | "pending">;
  daysAgo: number;
}

const SEEDS: Seed[] = [
  { email: "sunita.kapoor@yahoo.com", name: "Sunita Kapoor", amount: 150, currency: "USD", note: "Groceries this month", status: "completed", daysAgo: 21 },
  { email: "priya.sharma@gmail.com", name: "Priya Sharma", amount: 42.5, currency: "USD", note: "Dinner split", status: "completed", daysAgo: 14 },
  { email: "james.carter@outlook.com", name: "James Carter", amount: 80, currency: "USD", note: "Concert tickets", status: "completed", daysAgo: 9 },
  { email: "northside.rentals@mail.com", name: "Northside Property", amount: 1200, currency: "USD", note: "Urgent deposit to hold apartment", status: "cancelled", daysAgo: 6 },
  { email: "sofia.lopez@gmail.com", name: "Sofia Lopez", amount: 60, currency: "EUR", note: "Birthday gift", status: "completed", daysAgo: 3 },
  { email: "alex.morgan@protonmail.com", name: "Alex Morgan", amount: 2500, currency: "USD", note: "Crypto investment opportunity", status: "cancelled", daysAgo: 1 },
];

export function seedDemoTransfers(): Transfer[] {
  const history: Transfer[] = [];
  for (const s of SEEDS) {
    const created = new Date(Date.now() - s.daysAgo * 86400000);
    const at = (min: number) => new Date(created.getTime() + min * 60000).toISOString();
    const verification = { ...lookupRecipient(s.email, s.name), checkedAt: at(1) };
    const risk = { ...assessRisk({ recipientEmail: s.email, amount: s.amount, currency: s.currency, note: s.note, verification, history }), assessedAt: at(2) };
    const id = `demo_${history.length + 1}`;
    const ev = (type: TransferEvent["type"], message: string, m: number): TransferEvent => ({ id: `${id}_${type}`, type, message, at: at(m) });
    const events: TransferEvent[] = [
      ev("created", `Transfer draft created for ${s.email}.`, 0),
      ev("verified", verification.status === "verified" ? `Recipient verified as ${verification.confirmedName}.` : `Name mismatch: expected "${s.name}", found "${verification.confirmedName}".`, 1),
      ev("risk_assessed", `Risk assessed: ${risk.level} (${risk.score}/100).`, 2),
      ev("confirmed", "Transfer confirmed.", 3),
    ];
    if (s.status === "completed") events.push(ev("released", "Released to recipient (simulated).", 4));
    else {
      events.push(ev("hold_started", "Cancellation window started.", 3));
      events.push(ev("cancelled", "Cancelled by sender during cancellation window.", 5));
    }
    history.push({
      id,
      userId: "demo",
      recipientEmail: s.email,
      recipientName: s.name,
      amount: s.amount,
      currency: s.currency,
      note: s.note,
      status: s.status,
      verification,
      risk,
      createdAt: at(0),
      confirmedAt: at(3),
      completedAt: s.status === "completed" ? at(4) : undefined,
      cancelledAt: s.status === "cancelled" ? at(5) : undefined,
      isDemo: true,
      events,
    });
  }
  return history.reverse();
}
