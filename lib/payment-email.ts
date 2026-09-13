import type { Order } from "@/lib/order-payment";

const benefits = [
  "Domain registration for one year",
  "20 GB SSD hosting",
  "30 professional mailboxes",
  "AI for WordPress",
  "AI Website Builder",
];

export function paymentEmailText(order: Order): string {
  const amount = order.payment_currency === "NGN" ? order.amount_ngn_kobo : order.amount_usd_cents;
  const paid = typeof amount === "number" ? new Intl.NumberFormat("en-NG", {
    style: "currency", currency: order.payment_currency || "NGN",
  }).format(amount / 100) : "Please check your receipt";

  return `Hello ${order.full_name},

Emstan Tech has confirmed your payment for the ${order.domain} first-year package.

Order reference: ${order.reference}
Amount paid: ${paid}

Your package includes:
${benefits.map((benefit) => `- ${benefit}`).join("\n")}

Your domain has not been registered yet. We will complete the registration and hosting setup, then send you the access details. This is a payment confirmation, not proof that the domain is already active.

Need help? Contact Emstan Tech on WhatsApp: +234 806 954 8743.

Emstan Tech`;
}

// A conditional claim in Supabase prevents both the webhook and status-check
// endpoint from sending the same confirmation simultaneously. No test orders.
export async function sendPaymentEmail(order: Order): Promise<void> {
  if (order.status !== "paid" || order.payment_mode !== "live") return;
  const key = process.env.RESEND_API_KEY?.trim();
  const from = process.env.PAYMENT_EMAIL_FROM?.trim();
  if (!key || !from) {
    console.warn("Payment email is not configured", order.reference);
    return;
  }
  if (!/^\S+@\S+\.\S+$/.test(from.replace(/^.*<([^<>]+)>$/, "$1"))) {
    throw new Error("PAYMENT_EMAIL_FROM must be an email address on a verified sending domain");
  }
  const secret = process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
  const base = process.env.SUPABASE_URL;
  if (!base || !secret) throw new Error("Supabase configuration missing for payment email");
  const url = new URL(`${base}/rest/v1/orders`);
  url.searchParams.set("id", `eq.${order.id}`);
  url.searchParams.set("status", "eq.paid");
  url.searchParams.set("payment_mode", "eq.live");
  url.searchParams.set("payment_email_sent_at", "is.null");
  url.searchParams.set("payment_email_claimed_at", "is.null");
  const headers = { apikey: secret, "Content-Type": "application/json", Prefer: "return=representation" };
  const claimedAt = new Date().toISOString();
  const claim = await fetch(url, {
    method: "PATCH", headers, body: JSON.stringify({ payment_email_claimed_at: claimedAt }), cache: "no-store",
  });
  if (!claim.ok) throw new Error(`Payment email claim failed (${claim.status})`);
  const claimed = await claim.json() as Order[];
  if (claimed.length === 0) return;

  try {
    const sent = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${key}`, "Content-Type": "application/json",
        "Idempotency-Key": `emstan-payment/${order.id}`,
      },
      body: JSON.stringify({
        from, to: [order.email], subject: `Payment confirmed for ${order.domain} | Emstan Tech`,
        text: paymentEmailText(order),
      }),
      cache: "no-store",
      signal: AbortSignal.timeout(8000),
    });
    if (!sent.ok) throw new Error(`Email provider rejected payment confirmation (${sent.status})`);
  } catch (error) {
    // The provider's idempotency key makes immediate webhook retries safe.
    const retryUrl = new URL(`${base}/rest/v1/orders`);
    retryUrl.searchParams.set("id", `eq.${order.id}`);
    retryUrl.searchParams.set("payment_email_claimed_at", `eq.${claimedAt}`);
    const reset = await fetch(retryUrl, {
      method: "PATCH", headers, body: JSON.stringify({ payment_email_claimed_at: null }), cache: "no-store",
    });
    if (!reset.ok) console.error("Payment email claim needs manual reconciliation", order.reference);
    throw error;
  }

  const completeUrl = new URL(`${base}/rest/v1/orders`);
  completeUrl.searchParams.set("id", `eq.${order.id}`);
  completeUrl.searchParams.set("payment_email_claimed_at", `eq.${claimedAt}`);
  const completed = await fetch(completeUrl, {
    method: "PATCH", headers,
    body: JSON.stringify({ payment_email_claimed_at: null, payment_email_sent_at: new Date().toISOString() }), cache: "no-store",
  });
  if (!completed.ok) throw new Error(`Email accepted, but recording delivery failed (${completed.status}); reconcile before retrying`);
}
