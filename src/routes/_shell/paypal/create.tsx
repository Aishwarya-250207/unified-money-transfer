// Server‑side endpoint to create a PayPal Sandbox order
import { createFileRoute } from "@tanstack/react-router";
import { paypalService } from "@/services/paypal";

export const Route = createFileRoute("/_shell/paypal/create")({
  // No UI – this route is only used as an API endpoint.
  component: () => null,
  // TanStack Start will call this loader for the request.
  async loader({ request }) {
    if (request.method !== "POST") {
      throw new Error("Method Not Allowed");
    }
    const { transferId, amount, currency, recipientEmail } = await request.json();
    const order = await paypalService.createSandboxOrder({
      transferId,
      amount,
      currency,
      recipientEmail,
    });
    // Return the orderId and the approval URL (if configured)
    return { orderId: order.orderId, approveUrl: order.approveUrl };
  },
});
