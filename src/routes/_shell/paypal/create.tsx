import { createFileRoute } from "@tanstack/react-router";
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { paypalService } from "@/services/paypal";
import { assertCheckoutEligible } from "@/services/transfer-machine";

export const createCheckout = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => z.object({ transferId: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    const { data: transfer, error } = await context.supabase.from("transfers")
      .select("id,status,release_at,amount,currency,recipient_email")
      .eq("id", data.transferId).eq("user_id", context.userId).single();
    if (error || !transfer) throw new Error(error?.message ?? "Transfer not found.");
    assertCheckoutEligible(transfer.status, transfer.release_at ?? undefined);
    const order = await paypalService.createSandboxOrder({
      transferId: transfer.id,
      amount: Number(transfer.amount),
      currency: transfer.currency,
      recipientEmail: transfer.recipient_email,
    });
    if (!order.approveUrl) throw new Error("PayPal approval URL missing.");
    return { approveUrl: order.approveUrl };
  });

export const Route = createFileRoute("/_shell/paypal/create")({ component: () => null });