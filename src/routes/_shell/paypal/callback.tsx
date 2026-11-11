import { createFileRoute, redirect } from "@tanstack/react-router";
import { paypalService } from "@/services/paypal";
import { transferService } from "@/services/transfers";

/**
 * PayPal return URL handler. PayPal redirects here after user approval.
 * Query params:
 *   transferId – the SafeSend transfer identifier
 *   token – PayPal order ID (PayPal appends `token` to the return URL)
 */
export const Route = createFileRoute("/_shell/paypal/callback")({
  // No UI – this route only performs server‑side side‑effects and redirects.
  component: () => null,
  beforeLoad: async ({ location }) => {
    const qs = new URLSearchParams(location.search);
    const transferId = qs.get("transferId");
    const orderId = qs.get("token"); // PayPal supplies `token` as the order ID
    if (!transferId || !orderId) {
      throw new Error("Missing transferId or PayPal token in callback URL");
    }

    // Capture the PayPal order (server‑side only)
    const captureResult = await paypalService.captureSandboxOrder(orderId);
    if (captureResult.status !== "COMPLETED") {
      throw new Error(`PayPal capture failed – status: ${captureResult.status}`);
    }

    // Mark the transfer as completed (bypass hold window because PayPal approval is final)
    await transferService.release(transferId);

    // Redirect the user to a success page – history shows completed transfers
    return redirect({ to: "/history" });
  },
});
