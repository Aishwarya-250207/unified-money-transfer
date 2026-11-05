import type { Transfer } from "@/types";
import { formatMoney } from "@/lib/format";

/** Derived metrics shared by Dashboard and Security pages. */
export function getStats(transfers: Transfer[]) {
  const submitted = transfers.filter((t) => t.status !== "draft");
  const isProtected = (t: Transfer) => t.verification.status !== "pending" && !!t.risk;
  const cancelled = submitted.filter((t) => t.status === "cancelled");
  const saved = cancelled.filter((t) => t.currency === "USD").reduce((s, t) => s + t.amount, 0);
  const prot = submitted.filter(isProtected).length;
  return {
    total: submitted.length,
    protected: prot,
    pending: submitted.filter((t) => t.status === "pending").length,
    cancelled: cancelled.length,
    highRisk: submitted.filter((t) => t.risk?.level === "HIGH").length,
    flagged: submitted.filter((t) => t.risk && t.risk.level !== "LOW").length,
    mismatches: submitted.filter((t) => t.verification.status === "mismatch").length,
    protectionRate: submitted.length ? Math.round((prot / submitted.length) * 100) : 100,
    savedLabel: formatMoney(saved, "USD"),
  };
}
