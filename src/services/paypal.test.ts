import { describe, expect, it } from "vitest";
import { paypalService, PAYPAL_RAIL_LABEL } from "./paypal";

describe("paypal sandbox service", () => {
  it("provides transparent sandbox rail identification", () => {
    const railName = paypalService.getRailName();
    expect(railName).toBe(PAYPAL_RAIL_LABEL);
    expect(railName.toLowerCase()).toContain("sandbox");
  });

  it("creates sandbox order with non-live safety guarantee", async () => {
    const result = await paypalService.createSandboxOrder({
      transferId: "tr_abc",
      amount: 100,
      currency: "USD",
      recipientEmail: "test@example.com",
    });

    expect(result.orderId).toBeDefined();
    expect(result.status).toBe("CREATED");
    expect(result.isLive).toBe(false); // Must never claim to be real live payment
    expect(result.rail.toLowerCase()).toContain("sandbox");
  });

  it("captures sandbox order successfully", async () => {
    const result = await paypalService.captureSandboxOrder("ORDER-123");
    expect(result.orderId).toBe("ORDER-123");
    expect(result.status).toBe("COMPLETED");
    expect(result.isLive).toBe(false);
  });
});
