import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { createServerFn, useServerFn } from "@tanstack/react-start";
import { useEffect, useState } from "react";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { paypalService } from "@/services/paypal";

/**
 * PayPal return URL handler. PayPal redirects here after user approval.
 * Query params:
 *   transferId – the SafeSend transfer identifier
 *   token – PayPal order ID (PayPal appends `token` to the return URL)
 */
export const captureCallback = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => z.object({
    transferId: z.string().min(1).max(100),
    orderId: z.string().regex(/^[A-Za-z0-9]+$/).max(100),
  }).parse(input))
  .handler(async ({ data, context }) => {
    const { data: transfer, error } = await context.supabase.from("transfers")
      .select("status").eq("id", data.transferId).eq("user_id", context.userId).single();
    if (error || !transfer) throw new Error(error?.message ?? "Transfer not found");
    if (transfer.status === "cancelled") throw new Error("This transfer was cancelled.");

    const captured = await paypalService.captureSandboxOrder(data.orderId);
    if (captured.status !== "COMPLETED") {
      throw new Error(`PayPal capture failed – status: ${captured.status}`);
    }
    if (transfer.status !== "completed") {
      const at = new Date().toISOString();
      const { error: updateError } = await context.supabase.from("transfers")
        .update({ status: "completed", confirmed_at: at, completed_at: at })
        .eq("id", data.transferId).eq("user_id", context.userId).eq("status", transfer.status);
      if (updateError) throw new Error(updateError.message);
      const { error: eventError } = await context.supabase.from("transfer_events").insert({
        id: crypto.randomUUID(), transfer_id: data.transferId, user_id: context.userId,
        type: "released", at, message: "PayPal Sandbox capture completed.",
      });
      if (eventError) throw new Error(eventError.message);
    }
    return { status: captured.status };
  });

export const Route = createFileRoute("/_shell/paypal/callback")({
  head: () => ({ meta: [
    { title: "PayPal return — SafeSend" },
    { name: "description", content: "Complete your SafeSend PayPal Sandbox payment." },
    { property: "og:title", content: "PayPal return — SafeSend" },
    { property: "og:description", content: "Complete your SafeSend PayPal Sandbox payment." },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary" },
  ] }),
  component: Callback,
});

function Callback() {
  const capture = useServerFn(captureCallback);
  const navigate = useNavigate();
  const [error, setError] = useState<Error | null>(null);
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    void capture({ data: { transferId: params.get("transferId") ?? "", orderId: params.get("token") ?? "" } })
      .then(() => navigate({ to: "/history", replace: true }))
      .catch((reason) => setError(reason instanceof Error ? reason : new Error(String(reason))));
  }, [capture, navigate]);
  if (error) throw error;
  return <p className="text-muted-foreground">Completing PayPal Sandbox payment…</p>;
}
