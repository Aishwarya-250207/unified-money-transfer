import { describe, expect, it } from "vitest";
import { assessRisk, levelFor } from "./risk";
import type { RecipientVerification, Transfer } from "@/types";

const verified: RecipientVerification = {
  email: "ana@example.com",
  status: "verified",
  expectedName: "Ana Rao",
  confirmedName: "Ana Rao",
  accountAgeDays: 400,
};

const base = {
  recipientEmail: "ana@example.com",
  amount: 100,
  currency: "USD" as const,
  note: "rent",
  verification: verified,
  history: [] as Transfer[],
};

describe("risk scoring", () => {
  it("maps scores to levels: <30 LOW, 30-59 MEDIUM, 60+ HIGH", () => {
    expect(levelFor(0)).toBe("LOW");
    expect(levelFor(29)).toBe("LOW");
    expect(levelFor(30)).toBe("MEDIUM");
    expect(levelFor(59)).toBe("MEDIUM");
    expect(levelFor(60)).toBe("HIGH");
    expect(levelFor(100)).toBe("HIGH");
  });

  it("scores a verified repeat recipient with an ordinary amount as LOW", () => {
    const history = [
      { recipientEmail: "ana@example.com", amount: 100, status: "completed" },
      { recipientEmail: "ana@example.com", amount: 100, status: "completed" },
    ] as Transfer[];
    const r = assessRisk({ ...base, history });
    expect(r.level).toBe("LOW");
    expect(r.factors).toHaveLength(0);
  });

  it("flags an unregistered recipient at weight 40", () => {
    const r = assessRisk({
      ...base,
      verification: { email: "ana@example.com", status: "not_found", expectedName: "Ana Rao" },
    });
    const f = r.factors.find((x) => x.id === "not_found");
    expect(f?.weight).toBe(40);
  });

  it("flags a name mismatch at weight 35", () => {
    const r = assessRisk({
      ...base,
      verification: { email: "ana@example.com", status: "mismatch", expectedName: "Ana Rao", confirmedName: "Bob" },
    });
    expect(r.factors.find((x) => x.id === "mismatch")?.weight).toBe(35);
  });

  it("adds 20 for amounts of 1000 or more and 10 for 500-999", () => {
    expect(assessRisk({ ...base, amount: 1000 }).factors.find((x) => x.id === "large_amount")?.weight).toBe(20);
    expect(assessRisk({ ...base, amount: 500 }).factors.find((x) => x.id === "elevated_amount")?.weight).toBe(10);
  });

  it("adds 20 when the note contains scam-pattern keywords", () => {
    const r = assessRisk({ ...base, note: "urgent: buy a gift card" });
    const f = r.factors.find((x) => x.id === "keywords");
    expect(f?.weight).toBe(20);
    expect(f?.detail).toContain("urgent");
  });

  it("caps the total score at 100", () => {
    const r = assessRisk({
      ...base,
      amount: 5000,
      note: "urgent crypto deposit",
      verification: { email: "ana@example.com", status: "not_found", expectedName: "X", accountAgeDays: 2 },
    });
    expect(r.score).toBeLessThanOrEqual(100);
  });
});
