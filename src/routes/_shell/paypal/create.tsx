// Server‑side endpoint to create a PayPal Sandbox order using TanStack Start API
import { createFileRoute } from "@tanstack/react-router";
import { paypalService } from "@/services/paypal";

export const Route = createFileRoute("/_shell/paypal/create")({
  // No UI – this route is used as an API endpoint.
  component: () => null,
  // Use the server.handlers API for POST requests (TanStack Start v0.4+)
  server: {
    handlers: {
      POST: async ({ request }) => {
        const { transferId, amount, currency, recipientEmail } = await request.json();
        if (!paypalService.isConfigured()) {
          return Response.json({ error: "PayPal Sandbox credentials are missing on the server (PAYPAL_CLIENT_ID / PAYPAL_CLIENT_SECRET)." }, { status: 503 });
        }
        let order;
        try {
          order = await paypalService.createSandboxOrder({ transferId, amount, currency, recipientEmail });
        } catch (e) {
          return Response.json({ error: e instanceof Error ? e.message : "PayPal order creation failed" }, { status: 502 });
        }
        // Respond with JSON containing orderId and approval URL
        return new Response(JSON.stringify({ orderId: order.orderId, approveUrl: order.approveUrl }), {
          headers: { "Content-Type": "application/json" },
          status: 200,
        });
      },
    },
  },
});
