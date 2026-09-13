import { checkoutEnabled, currentPaymentMode, paymentSecretKey, type PaymentMode, usdTestEnabled } from "@/lib/paystack-config";
import { supabaseRestConnection } from "@/lib/supabase-rest";

export type Order = {
  id: string;
  reference: string;
  full_name: string;
  email: string;
  domain: string;
  extension: string;
  status: string;
  payment_mode: PaymentMode;
  amount_ngn_kobo: number | null;
  amount_usd_cents: number;
  quote_expires_at: string | null;
  fx_rate_ngn_per_usd: number | null;
  fx_rate_updated_at: string | null;
  fx_margin_percent: number | null;
  payment_currency: "NGN" | "USD" | null;
  payment_reference: string | null;
  payment_url: string | null;
  paid_at: string | null;
};

function connection() {
  const { url, headers } = supabaseRestConnection("orders");
  return { base: url, headers };
}

export async function findOrder(filters: Record<string, string>): Promise<Order | null> {
  const { base, headers } = connection();
  const url = new URL(base);
  url.searchParams.set("select", "id,reference,full_name,email,domain,extension,status,payment_mode,amount_ngn_kobo,amount_usd_cents,quote_expires_at,fx_rate_ngn_per_usd,fx_rate_updated_at,fx_margin_percent,payment_currency,payment_reference,payment_url,paid_at");
  for (const [field, value] of Object.entries(filters)) url.searchParams.set(field, `eq.${value}`);
  url.searchParams.set("limit", "1");
  const response = await fetch(url, { headers, cache: "no-store" });
  if (!response.ok) throw new Error(`Order lookup failed (${response.status})`);
  const rows = (await response.json()) as Order[];
  return rows[0] || null;
}

export async function changeOrder(reference: string, status: string, fields: Record<string, unknown>, match: Record<string, string> = {}): Promise<Order | null> {
  const { base, headers } = connection();
  const url = new URL(base);
  url.searchParams.set("reference", `eq.${reference}`);
  url.searchParams.set("status", `eq.${status}`);
  for (const [field, value] of Object.entries(match)) url.searchParams.set(field, `eq.${value}`);
  const response = await fetch(url, {
    method: "PATCH", headers: { ...headers, Prefer: "return=representation" },
    body: JSON.stringify({ ...fields, updated_at: new Date().toISOString() }), cache: "no-store",
  });
  if (!response.ok) throw new Error(`Order update failed (${response.status})`);
  return ((await response.json()) as Order[])[0] || null;
}

const QUOTE_MS = 15 * 60 * 1000;
const MAX_RATE_AGE_MS = 48 * 60 * 60 * 1000;
export const FIXED_TWENTY_DOLLAR_NGN_KOBO = 2_840_000;

export function fixedNgnPrice(order: Pick<Order, "extension">): number | null {
  return order.extension === ".com" || order.extension === ".org" ? FIXED_TWENTY_DOLLAR_NGN_KOBO : null;
}

export function validQuote(order: Order): boolean {
  if (order.status !== "approved" || !order.amount_ngn_kobo || !order.quote_expires_at || Date.parse(order.quote_expires_at) <= Date.now()) return false;
  const fixed = fixedNgnPrice(order);
  if (fixed !== null) return order.amount_ngn_kobo === fixed;
  return !!order.fx_rate_updated_at &&
    Date.now() - Date.parse(order.fx_rate_updated_at) < MAX_RATE_AGE_MS &&
    Date.parse(order.fx_rate_updated_at) <= Date.now() + 60_000;
}

export async function quoteApprovedOrder(order: Order): Promise<Order> {
  if (order.status !== "approved" || validQuote(order)) return order;
  const fixed = fixedNgnPrice(order);
  if (fixed !== null) {
    return (await changeOrder(order.reference, "approved", {
      amount_ngn_kobo: fixed, quote_expires_at: new Date(Date.now() + QUOTE_MS).toISOString(),
      fx_rate_ngn_per_usd: null, fx_rate_updated_at: null, fx_margin_percent: null,
    })) || order;
  }
  const margin = Number(process.env.FX_MARGIN_PERCENT ?? "0");
  if (!Number.isFinite(margin) || margin < 0 || margin > 20) throw new Error("Invalid FX_MARGIN_PERCENT configuration");
  const response = await fetch("https://open.er-api.com/v6/latest/USD", { next: { revalidate: 3600 } });
  if (!response.ok) throw new Error(`Exchange-rate service unavailable (${response.status})`);
  const data = await response.json() as { result?: string; base_code?: string; rates?: { NGN?: number }; time_last_update_unix?: number };
  const rate = data.rates?.NGN;
  const updated = (data.time_last_update_unix ?? 0) * 1000;
  if (data.result !== "success" || data.base_code !== "USD" || typeof rate !== "number" ||
    !Number.isFinite(rate) || rate < 100 || rate > 10000 || updated > Date.now() + 60_000 || Date.now() - updated >= MAX_RATE_AGE_MS) {
    throw new Error("Exchange rate is missing or out of date");
  }
  const amount = Math.ceil(order.amount_usd_cents * rate * (1 + margin / 100));
  if (!Number.isSafeInteger(amount) || amount < 10000) throw new Error("Invalid converted checkout amount");
  return (await changeOrder(order.reference, "approved", {
    amount_ngn_kobo: amount, quote_expires_at: new Date(Date.now() + QUOTE_MS).toISOString(),
    fx_rate_ngn_per_usd: rate, fx_rate_updated_at: new Date(updated).toISOString(), fx_margin_percent: margin,
  })) || order;
}

export async function verifyOrderPayment(order: Order): Promise<Order> {
  if (order.status !== "payment_pending" || !order.payment_reference || !order.payment_currency) return order;
  const expectedAmount = order.payment_currency === "USD" ? order.amount_usd_cents : order.amount_ngn_kobo;
  if (!expectedAmount) return order;
  const key = paymentSecretKey(order.payment_mode);
  if (!key) throw new Error("Paystack configuration missing");
  const response = await fetch(`https://api.paystack.co/transaction/verify/${encodeURIComponent(order.payment_reference)}`, {
    headers: { Authorization: `Bearer ${key}` }, cache: "no-store",
  });
  if (!response.ok) throw new Error(`Paystack verification failed (${response.status})`);
  const result = (await response.json()) as { status?: boolean; data?: { status?: string; reference?: string; amount?: number; currency?: string; customer?: { email?: string }; paid_at?: string } };
  const payment = result.data;
  if (!result.status || !payment || payment.status !== "success") return order;
  if (payment.reference !== order.payment_reference || payment.amount !== expectedAmount || payment.currency !== order.payment_currency || payment.customer?.email?.toLowerCase() !== order.email.toLowerCase()) {
    console.error("Paystack payment does not match order", order.reference);
    return order;
  }
  return (await changeOrder(order.reference, "payment_pending", { status: "paid", paid_at: payment.paid_at || new Date().toISOString() })) || order;
}

export function publicOrder(order: Order, rateError = false) {
  const currentMode = currentPaymentMode();
  const payable = order.payment_mode === currentMode && checkoutEnabled(currentMode);
  return {
    reference: order.reference, fullName: order.full_name, domain: order.domain, status: order.status,
    fixedNgnPrice: fixedNgnPrice(order) !== null,
    stalePendingPrice: order.status === "payment_pending" && order.payment_currency === "NGN" &&
      fixedNgnPrice(order) !== null && order.amount_ngn_kobo !== fixedNgnPrice(order),
    paymentMode: order.payment_mode, payable,
    amountNgnKobo: order.status === "approved" && !validQuote(order) ? null : order.amount_ngn_kobo,
    amountUsdCents: order.amount_usd_cents, currency: order.payment_currency,
    usdAvailable: payable && order.payment_mode === "test" && usdTestEnabled(), paidAt: order.paid_at,
    quoteExpiresAt: validQuote(order) ? order.quote_expires_at : null,
    rateUpdatedAt: validQuote(order) ? order.fx_rate_updated_at : null,
    fxRate: validQuote(order) ? order.fx_rate_ngn_per_usd : null,
    fxMarginPercent: validQuote(order) ? order.fx_margin_percent : null,
    rateError,
  };
}
