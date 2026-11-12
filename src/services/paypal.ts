// PayPal Sandbox Integration (real server‑side only)

/** Configuration visible to client (only label). */
export interface PayPalConfig {
  clientId?: string;
  isSandbox: boolean;
  environment: "sandbox" | "simulated";
}

export const PAYPAL_CONFIG: PayPalConfig = {
  clientId: typeof import.meta !== "undefined" ? import.meta.env.VITE_PAYPAL_CLIENT_ID : undefined,
  isSandbox: true,
  environment:
    typeof import.meta !== "undefined" && import.meta.env.VITE_PAYPAL_CLIENT_ID
      ? "sandbox"
      : "simulated",
};

export const PAYPAL_RAIL_LABEL = PAYPAL_CONFIG.clientId
  ? "PayPal Sandbox (Active Sandbox Client)"
  : "PayPal Sandbox (Simulated Rail — No Real Funds Move)";

export interface PayPalOrderResult {
  orderId: string;
  status: "CREATED" | "COMPLETED" | "VOIDED";
  rail: string;
  isLive: false; // always sandbox
  timestamp: string;
  /** Only for real orders – approval URL for the buyer */
  approveUrl?: string;
}

// ------- Server‑side helpers (never exposed to client) -------
let cachedToken: { access_token: string; expires_at: number } | null = null;
function getEnvVar(name: string): string | undefined {
  // Secrets are provided via the global __CLOUDFLARE_ENV set in server.ts
  return ((globalThis as any).__CLOUDFLARE_ENV?.[name] ?? (typeof process !== "undefined" ? process.env[name] : undefined)) as string | undefined;
}
async function getAccessToken(): Promise<string> {
  if (cachedToken && Date.now() < cachedToken.expires_at - 60_000) {
    return cachedToken.access_token;
  }
  const clientId = getEnvVar("PAYPAL_CLIENT_ID");
  const secret = getEnvVar("PAYPAL_CLIENT_SECRET");
  if (!clientId || !secret) {
    throw new Error("PayPal credentials missing – set PAYPAL_CLIENT_ID and PAYPAL_CLIENT_SECRET.");
  }
  const auth = btoa(`${clientId}:${secret}`);
  const resp = await fetch("https://api-m.sandbox.paypal.com/v1/oauth2/token", {
    method: "POST",
    headers: {
      Authorization: `Basic ${auth}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: "grant_type=client_credentials",
  });
  if (!resp.ok) {
    const txt = await resp.text();
    throw new Error(`PayPal token request failed ${resp.status}: ${txt}`);
  }
  const data = await resp.json();
  cachedToken = { access_token: data.access_token, expires_at: Date.now() + data.expires_in * 1000 };
  return data.access_token;
}

async function createRealOrder(params: {
  transferId: string;
  amount: number; // cents
  currency: string;
  recipientEmail: string;
}): Promise<{ orderId: string; approveUrl: string }> {
  const token = await getAccessToken();
  const appBaseUrl = getEnvVar("APP_BASE_URL") ?? "";
  const payload = {
    intent: "CAPTURE",
    purchase_units: [
      {
        reference_id: params.transferId,
        amount: {
          currency_code: params.currency,
          value: (params.amount / 100).toFixed(2),
        },
        payee: { email_address: params.recipientEmail },
      },
    ],
    application_context: {
      brand_name: "SafeSend",
      landing_page: "NO_PREFERENCE",
      user_action: "PAY_NOW",
      return_url: `${appBaseUrl}/paypal/callback?transferId=${params.transferId}`,
      cancel_url: `${appBaseUrl}/dashboard`,
    },
  };

  const resp = await fetch("https://api-m.sandbox.paypal.com/v2/checkout/orders", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });
  if (!resp.ok) {
    const txt = await resp.text();
    throw new Error(`PayPal order creation failed ${resp.status}: ${txt}`);
  }
  const data = await resp.json();
  const approve = data.links.find((l: any) => l.rel === "approve");
  if (!approve) throw new Error("PayPal approval URL missing in response");
  return { orderId: data.id, approveUrl: approve.href };
}

async function captureRealOrder(orderId: string): Promise<PayPalOrderResult> {
  const token = await getAccessToken();
  const resp = await fetch(`https://api-m.sandbox.paypal.com/v2/checkout/orders/${orderId}/capture`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json", "PayPal-Request-Id": `capture-${orderId}` },
  });
  let data: any;
  if (!resp.ok) {
    const txt = await resp.text();
    if (resp.status === 422 && txt.includes("ORDER_ALREADY_CAPTURED")) {
      // Retry/refresh of the return page: read the existing order instead of failing.
      const get = await fetch(`https://api-m.sandbox.paypal.com/v2/checkout/orders/${orderId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!get.ok) throw new Error(`PayPal order lookup failed ${get.status}: ${await get.text()}`);
      data = await get.json();
    } else {
      throw new Error(`PayPal capture failed ${resp.status}: ${txt}`);
    }
  } else {
    data = await resp.json();
  }
  const status = data.status as "COMPLETED" | "VOIDED" | string;
  return {
    orderId,
    status: status as any,
    rail: "PayPal Sandbox API",
    isLive: false,
    timestamp: new Date().toISOString(),
  };
}

export const paypalService = {
  isConfigured(): boolean {
    return Boolean(getEnvVar("PAYPAL_CLIENT_ID") && getEnvVar("PAYPAL_CLIENT_SECRET"));
  },
  getRailName(): string {
    return PAYPAL_RAIL_LABEL;
  },
  async createSandboxOrder(params: { transferId: string; amount: number; currency: string; recipientEmail: string; }): Promise<PayPalOrderResult> {
    const { orderId, approveUrl } = await createRealOrder(params);
    return { orderId, approveUrl, status: "CREATED", rail: this.getRailName(), isLive: false, timestamp: new Date().toISOString() };
  },
  async captureSandboxOrder(orderId: string): Promise<PayPalOrderResult> {
    return captureRealOrder(orderId);
  },
};
