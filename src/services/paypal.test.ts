import { describe, expect, it } from "vitest";
import { paypalService, PAYPAL_RAIL_LABEL } from "./paypal";

describe("paypal sandbox service", () => {
  it("provides transparent sandbox rail identification", () => {
    const railName = paypalService.getRailName();
    expect(railName).toBe(PAYPAL_RAIL_LABEL);
    expect(railName.toLowerCase()).toContain("sandbox");
  });

  it("never simulates: fails clearly when credentials are missing", async () => {
    const env = { ...process.env };
    delete process.env.PAYPAL_CLIENT_ID;
    delete process.env.PAYPAL_CLIENT_SECRET;
    try {
      expect(paypalService.isConfigured()).toBe(false);
      await expect(
        paypalService.createSandboxOrder({ transferId: "tr_abc", amount: 100, currency: "USD", recipientEmail: "a@b.com" }),
      ).rejects.toThrow(/credentials missing/);
    } finally {
      process.env = env;
    }
  });
});
