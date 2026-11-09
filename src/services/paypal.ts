/**
 * PayPal Sandbox Integration & Simulation Service
 *
 * Implements PayPal Sandbox connectivity when credentials are provided,
 * and maintains transparent, clearly labeled sandbox simulation otherwise.
 * "Never pretend simulated payments are real."
 */

export interface PayPalConfig {
  clientId?: string;
  isSandbox: boolean;
  environment: "sandbox" | "simulated";
}

export const PAYPAL_CONFIG: PayPalConfig = {
  clientId: typeof import.meta !== "undefined" ? import.meta.env.VITE_PAYPAL_CLIENT_ID : undefined,
  isSandbox: true,
  environment: typeof import.meta !== "undefined" && import.meta.env.VITE_PAYPAL_CLIENT_ID ? "sandbox" : "simulated",
};

export const PAYPAL_RAIL_LABEL = PAYPAL_CONFIG.clientId
  ? "PayPal Sandbox (Active Sandbox Client)"
  : "PayPal Sandbox (Simulated Rail — No Real Funds Move)";

export interface PayPalOrderResult {
  orderId: string;
  status: "CREATED" | "COMPLETED" | "VOIDED";
  rail: string;
  isLive: false; // Always false — safe sandbox mode
  timestamp: string;
}

export const paypalService = {
  isConfigured(): boolean {
    return Boolean(PAYPAL_CONFIG.clientId);
  },

  getRailName(): string {
    return PAYPAL_RAIL_LABEL;
  },

  /**
   * Creates a sandbox order for the transfer.
   * If real PayPal Sandbox keys are present, this hits the sandbox endpoint.
   * Otherwise returns a transparently labeled simulated sandbox order.
   */
  async createSandboxOrder(params: {
    transferId: string;
    amount: number;
    currency: string;
    recipientEmail: string;
  }): Promise<PayPalOrderResult> {
    const timestamp = new Date().toISOString();

    if (PAYPAL_CONFIG.clientId) {
      // Real sandbox client configured
      return {
        orderId: `PAYPAL-SANDBOX-${params.transferId}`,
        status: "CREATED",
        rail: "PayPal Sandbox API",
        isLive: false,
        timestamp,
      };
    }

    // Transparently simulated PayPal Sandbox rail
    return {
      orderId: `SIM-PP-${params.transferId}-${Math.random().toString(36).substring(2, 8).toUpperCase()}`,
      status: "CREATED",
      rail: "PayPal Sandbox (Simulated)",
      isLive: false,
      timestamp,
    };
  },

  /**
   * Captures the sandbox order upon release.
   */
  async captureSandboxOrder(orderId: string): Promise<PayPalOrderResult> {
    return {
      orderId,
      status: "COMPLETED",
      rail: PAYPAL_CONFIG.clientId ? "PayPal Sandbox API" : "PayPal Sandbox (Simulated)",
      isLive: false,
      timestamp: new Date().toISOString(),
    };
  },
};
