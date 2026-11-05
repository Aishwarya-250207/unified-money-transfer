import type { RecipientVerification } from "@/types";

/** Simulated recipient directory. Replace with a database / PayPal Sandbox lookup later. */
export const DEMO_DIRECTORY: Record<string, { name: string; accountAgeDays: number }> = {
  "priya.sharma@gmail.com": { name: "Priya Sharma", accountAgeDays: 2410 },
  "james.carter@outlook.com": { name: "James Carter", accountAgeDays: 1830 },
  "sunita.kapoor@yahoo.com": { name: "Sunita Kapoor", accountAgeDays: 3650 },
  "sofia.lopez@gmail.com": { name: "Sofia López", accountAgeDays: 912 },
  "northside.rentals@mail.com": { name: "Northside Rentals LLC", accountAgeDays: 14 },
  "alex.morgan@protonmail.com": { name: "A. Morgan Trading", accountAgeDays: 6 },
};

function tokens(name: string) {
  return name
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter((t) => t.length >= 2);
}

export function namesMatch(expected: string, confirmed: string): boolean {
  const c = new Set(tokens(confirmed));
  return tokens(expected).some((t) => c.has(t));
}

/** Pure lookup — no delay. */
export function lookupRecipient(email: string, expectedName?: string): RecipientVerification {
  const key = email.trim().toLowerCase();
  const entry = DEMO_DIRECTORY[key];
  const checkedAt = new Date().toISOString();
  if (!entry) return { email: key, status: "not_found", expectedName, checkedAt };
  const mismatch = !!expectedName?.trim() && !namesMatch(expectedName, entry.name);
  return {
    email: key,
    status: mismatch ? "mismatch" : "verified",
    expectedName,
    confirmedName: entry.name,
    accountAgeDays: entry.accountAgeDays,
    checkedAt,
  };
}

/** Async verification with realistic latency (simulated network call). */
export async function verifyRecipient(
  email: string,
  expectedName?: string,
  delayMs = 1400,
): Promise<RecipientVerification> {
  await new Promise((r) => setTimeout(r, delayMs));
  return lookupRecipient(email, expectedName);
}
