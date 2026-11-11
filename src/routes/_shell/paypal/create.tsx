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
        const order = await paypalService.createSandboxOrder({
          transferId,
          amount,
          currency,
          recipientEmail,
        });
        // Respond with JSON containing orderId and approval URL
        return new Response(JSON.stringify({ orderId: order.orderId, approveUrl: order.approveUrl }), {
          headers: { "Content-Type": "application/json" },
          status: 200,
        });
      },
    },
  },
});
