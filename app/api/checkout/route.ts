import { checkDomain } from "@/lib/domain-availability";
import { changeOrder, findOrder, fixedNgnPrice, validQuote } from "@/lib/order-payment";
import { checkoutBaseUrl, checkoutEnabled, currentPaymentMode, paymentSecretKey, usdTestEnabled } from "@/lib/paystack-config";

export async function POST(request: Request) {
  try {
    const body = await request.json() as { reference?: string; email?: string; currency?: string; expectedAmountNgnKobo?: number; quoteExpiresAt?: string };
    const reference = body.reference?.trim().toUpperCase() || "";
    const email = body.email?.trim().toLowerCase() || "";
    if (!/^EMT-[A-Z0-9-]{10,48}$/.test(reference) || !/^\S+@\S+\.\S+$/.test(email)) return Response.json({ error: "Enter your order reference and email." }, { status: 400 });
    const order = await findOrder({ reference, email });
    if (!order) return Response.json({ error: "Order not found." }, { status: 404 });
    const mode = currentPaymentMode();
    if (order.payment_mode !== mode) return Response.json({ error: "This request belongs to the previous test checkout. Submit a new domain request to pay for a real order." }, { status: 409 });
    if (!checkoutEnabled(mode)) return Response.json({ error: "Live checkout is not enabled yet. No payment has been taken; please contact Emstan Tech." }, { status: 503 });
    if (order.status === "payment_pending" && order.payment_url?.startsWith("https://checkout.paystack.com/")) {
      const fixed = fixedNgnPrice(order);
      if (order.payment_currency === "NGN" && fixed !== null && order.amount_ngn_kobo !== fixed) return Response.json({ error: "This checkout was created at an earlier Naira price. Please contact Emstan Tech before paying." }, { status: 409 });
      return Response.json({ url: order.payment_url });
    }
    if (order.status !== "approved") return Response.json({ error: "This domain has not been approved for payment. Contact us if you need help." }, { status: 409 });
    const registration = await checkDomain(order.domain);
    if (registration === "registered") return Response.json({ error: "This domain now appears registered. No payment was started. Contact Emstan Tech to choose another domain." }, { status: 409 });
    if (registration === "unknown") return Response.json({ error: "We could not verify the domain registry right now. No payment was started; please try again shortly." }, { status: 503 });
    const currency = body.currency;
    if (currency !== "NGN" && currency !== "USD") return Response.json({ error: "Choose naira or US dollars." }, { status: 400 });
    if (currency === "USD" && (mode === "live" || !usdTestEnabled())) return Response.json({ error: "Direct USD checkout is unavailable for this account. Choose the Naira quote; a supported international card may convert the charge through its issuer." }, { status: 503 });
    if (currency === "NGN" && (!validQuote(order) || body.expectedAmountNgnKobo !== order.amount_ngn_kobo || body.quoteExpiresAt !== order.quote_expires_at)) {
      return Response.json({ error: "Your Naira quote changed or expired. Press Check status for a new price before paying." }, { status: 409 });
    }
    const amount = currency === "USD" ? order.amount_usd_cents : order.amount_ngn_kobo;
    if (!amount || !Number.isSafeInteger(amount)) return Response.json({ error: "Checkout pricing is not available. Please contact Emstan Tech." }, { status: 503 });
    const key = paymentSecretKey(mode);
    if (!key) return Response.json({ error: `Paystack ${mode} checkout is not configured. Please contact Emstan Tech; no payment has been taken.` }, { status: 503 });
    const appUrl = checkoutBaseUrl();
    if (!appUrl) return Response.json({ error: "Checkout callback URL is missing. Set APP_BASE_URL in Vercel Production to your exact https:// website URL, then redeploy." }, { status: 503 });
    const paymentReference = `${reference}-P1-${currency}`;
    const response = await fetch("https://api.paystack.co/transaction/initialize", {
      method: "POST", headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({ email: order.email, amount, currency, reference: paymentReference,
        callback_url: `${appUrl.replace(/\/$/, "")}/order?order=${encodeURIComponent(reference)}`,
        metadata: { order_reference: reference, domain: order.domain, payment_mode: mode } }), cache: "no-store",
    });
    const data = await response.json() as { status?: boolean; message?: string; data?: { authorization_url?: string; reference?: string } };
    if (!response.ok || !data.status || data.data?.reference !== paymentReference || !data.data.authorization_url?.startsWith("https://checkout.paystack.com/")) {
      console.error("Paystack initialization failed", response.status, reference, data.message);
      return Response.json({ error: currency === "USD" ? "Paystack could not start a USD test transaction. Choose the Naira quote instead." : "Paystack could not start checkout. No payment has been taken; please contact Emstan Tech." }, { status: 502 });
    }
    const saved = await changeOrder(reference, "approved", {
      status: "payment_pending", payment_currency: currency,
      amount_ngn_kobo: currency === "NGN" ? amount : null,
      payment_reference: paymentReference, payment_url: data.data.authorization_url,
    }, { payment_mode: mode, ...(currency === "NGN" ? { quote_expires_at: order.quote_expires_at! } : {}) });
    if (!saved) return Response.json({ error: "Order changed during checkout. Please refresh its status." }, { status: 409 });
    return Response.json({ url: data.data.authorization_url });
  } catch (error) {
    console.error("Checkout failed", error);
    return Response.json({ error: "Checkout is temporarily unavailable. Please contact Emstan Tech." }, { status: 500 });
  }
}
