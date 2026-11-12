import { describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ capture: vi.fn(), db: { from: vi.fn() } }));
vi.mock("@tanstack/react-start", () => ({
  createServerFn: () => {
    const builder = { middleware: () => builder, inputValidator: () => builder,
      handler: (fn: unknown) => fn };
    return builder;
  },
  useServerFn: vi.fn(),
}));
vi.mock("@/integrations/supabase/auth-middleware", () => ({ requireSupabaseAuth: {} }));
vi.mock("@/services/paypal", () => ({ paypalService: { captureSandboxOrder: mocks.capture } }));

import { captureCallback } from "@/routes/_shell/paypal/callback";

describe("PayPal callback completion", () => {
  it("completes a draft only after a COMPLETED capture", async () => {
    const update = vi.fn(() => chain);
    const insert = vi.fn().mockResolvedValue({ error: null });
    const chain = { select: () => chain, eq: () => chain, update, insert,
      single: async () => ({ data: { status: "draft" }, error: null }),
      then: (resolve: (v: unknown) => void) => resolve({ error: null }) };
    mocks.db.from.mockReturnValue(chain);
    mocks.capture.mockResolvedValue({ status: "APPROVED" });
    const run = captureCallback as unknown as (args: unknown) => Promise<unknown>;
    const args = { data: { transferId: "transfer", orderId: "ORDER" }, context: { supabase: mocks.db, userId: "owner" } };
    await expect(run(args)).resolves.toMatchObject({ ok: false, error: expect.stringContaining("status: APPROVED") });
    expect(update).not.toHaveBeenCalled();
    mocks.capture.mockResolvedValue({ status: "COMPLETED" });
    await expect(run(args)).resolves.toEqual({ ok: true, status: "COMPLETED" });
    expect(update).toHaveBeenCalledWith(expect.objectContaining({ status: "completed" }));
    expect(insert).toHaveBeenCalledWith(expect.objectContaining({ type: "released", transfer_id: "transfer" }));
  });
});