import { changeOrder, findOrder, validQuote } from "@/lib/order-payment";

export async function POST(request: Request) {
  try {
    const body = await request.json() as { reference?: string; email?: string; currency?: string; expectedAmountNgnKobo?: number; quoteExpiresAt?: string };
    const reference = body.reference?.trim().toUpperCase() || "";
    const email = body.email?.trim().toLowerCase() || "";
    if (!/^EMT-[A-Z0-9-]{10,48}$/.test(reference) || !/^\S+@\S+\.\S+$/.test(email)) return Response.json({ error: "Enter your order reference and email." }, { status: 400 });
    const order = await findOrder({ reference, email });
    if (!order) return Response.json({ error: "Order not found." }, { status: 404 });
    if (order.status === "payment_pending" && order.payment_url?.startsWith("https://checkout.paystack.com/")) return Response.json({ url: order.payment_url });
    if (order.status !== "approved") return Response.json({ error: "This domain has not been approved for payment. Contact us if you need help." }, { status: 409 });
    const currency = body.currency;
    if (currency !== "NGN" && currency !== "USD") return Response.json({ error: "Choose naira or US dollars." }, { status: 400 });
    if (currency === "USD" && process.env.PAYSTACK_USD_ENABLED !== "true") return Response.json({ error: "Dollar checkout is not enabled on this Paystack account yet." }, { status: 503 });
    if (currency === "NGN" && (!validQuote(order) || body.expectedAmountNgnKobo !== order.amount_ngn_kobo || body.quoteExpiresAt !== order.quote_expires_at)) {
      return Response.json({ error: "Your Naira quote changed or expired. Press Check status for a new price before paying." }, { status: 409 });
    }
    const amount = currency === "USD" ? order.amount_usd_cents : order.amount_ngn_kobo;
    if (!amount || !Number.isSafeInteger(amount)) return Response.json({ error: "Checkout pricing is not available. Please contact Emstan Tech." }, { status: 503 });
    const key = process.env.PAYSTACK_SECRET_KEY;
    const appUrl = process.env.APP_BASE_URL;
    if (!key || !key.startsWith("sk_test_") || !appUrl || !/^https:\/\//.test(appUrl)) {
      return Response.json({ error: "Test checkout is not configured yet." }, { status: 503 });
    }
    const paymentReference = `${reference}-P1-${currency}`;
    const response = await fetch("https://api.paystack.co/transaction/initialize", {
      method: "POST", headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({ email: order.email, amount, currency, reference: paymentReference,
        callback_url: `${appUrl.replace(/\/$/, "")}/order?order=${encodeURIComponent(reference)}`,
        metadata: { order_reference: reference, domain: order.domain } }), cache: "no-store",
    });
    const data = await response.json() as { status?: boolean; data?: { authorization_url?: string; reference?: string } };
    if (!response.ok || !data.status || data.data?.reference !== paymentReference || !data.data.authorization_url?.startsWith("https://checkout.paystack.com/")) {
      console.error("Paystack initialization failed", response.status, reference);
      return Response.json({ error: "Could not start checkout. Please contact Emstan Tech." }, { status: 502 });
    }
    const saved = await changeOrder(reference, "approved", {
      status: "payment_pending", payment_currency: currency,
      amount_ngn_kobo: currency === "NGN" ? amount : null,
      payment_reference: paymentReference, payment_url: data.data.authorization_url,
    }, currency === "NGN" ? { quote_expires_at: order.quote_expires_at! } : {});
    if (!saved) return Response.json({ error: "Order changed during checkout. Please refresh its status." }, { status: 409 });
    return Response.json({ url: data.data.authorization_url });
  } catch (error) {
    console.error("Checkout failed", error);
    return Response.json({ error: "Checkout is temporarily unavailable. Please contact Emstan Tech." }, { status: 500 });
  }
}
