export type PaymentMode = "test" | "live";

export function currentPaymentMode(): PaymentMode {
  return process.env.PAYSTACK_MODE === "live" ? "live" : "test";
}

export function paystackTestKey(): string | null {
  const key = (process.env.PAYSTACK_TEST_SECRET_KEY || process.env.PAYSTACK_SECRET_KEY)?.trim();
  return key && /^sk_test_[A-Za-z0-9_-]{8,}$/.test(key) && !/YOUR|PLACEHOLDER/i.test(key) ? key : null;
}

export function paystackLiveKey(): string | null {
  const key = process.env.PAYSTACK_LIVE_SECRET_KEY?.trim();
  return key && /^sk_live_[A-Za-z0-9_-]{8,}$/.test(key) && !/YOUR|PLACEHOLDER/i.test(key) ? key : null;
}

export function paymentSecretKey(mode: PaymentMode): string | null {
  return mode === "live" ? paystackLiveKey() : paystackTestKey();
}

export function checkoutEnabled(mode: PaymentMode): boolean {
  return mode === "test" || process.env.LIVE_CHECKOUT_ENABLED === "true";
}

export function usdTestEnabled(): boolean {
  return currentPaymentMode() === "test" && process.env.PAYSTACK_TEST_USD_ENABLED === "true" && !!paystackTestKey();
}

export function checkoutBaseUrl(): string | null {
  const configured = process.env.APP_BASE_URL?.trim();
  if (configured && !/YOUR[-_]/i.test(configured)) {
    try {
      const url = new URL(configured);
      if (url.protocol === "https:" && url.hostname && !url.username && !url.password) return url.origin;
    } catch { /* Fall back to a Vercel-provided URL. */ }
  }

  // These names are supplied by Vercel, not by the customer request/Host header.
  const domain = process.env.VERCEL_PROJECT_PRODUCTION_URL || process.env.VERCEL_URL;
  if (!domain || !/^[a-z0-9.-]+$/i.test(domain) || !domain.includes(".")) return null;
  return `https://${domain}`;
}
