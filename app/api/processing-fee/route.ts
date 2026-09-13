import { randomBytes } from "node:crypto";
import { createProcessingFeePayment, PROCESSING_FEE_NGN_KOBO, saveProcessingFeeUrl } from "@/lib/processing-fee";
import { checkoutBaseUrl, checkoutEnabled, currentPaymentMode, paymentSecretKey } from "@/lib/paystack-config";

export function GET() {
  const mode = currentPaymentMode();
  return Response.json({ mode, enabled: checkoutEnabled(mode) && !!paymentSecretKey(mode), amountNgnKobo: PROCESSING_FEE_NGN_KOBO });
}

export async function POST(request: Request) {
  try {
    const body = await request.json() as { fullName?: string; email?: string };
    const fullName = body.fullName?.trim().replace(/\s+/g, " ") || "";
    const email = body.email?.trim().toLowerCase() || "";
    if (fullName.length < 2 || fullName.length > 100 || !/^\S+@\S+\.\S+$/.test(email) || email.length > 254) {
      return Response.json({ error: "Enter your full name and a valid email address." }, { status: 400 });
    }
    const mode = currentPaymentMode();
    if (!checkoutEnabled(mode)) return Response.json({ error: "Live checkout is not enabled." }, { status: 503 });
    const key = paymentSecretKey(mode);
    if (!key) return Response.json({ error: `Paystack ${mode} checkout is not configured.` }, { status: 503 });
    const appUrl = checkoutBaseUrl();
    if (!appUrl) return Response.json({ error: "APP_BASE_URL is not configured." }, { status: 503 });

    const reference = `EMT-FEE-${Date.now().toString(36).toUpperCase()}-${randomBytes(5).toString("hex").toUpperCase()}`;
    await createProcessingFeePayment({ reference, full_name: fullName, email, amount_ngn_kobo: PROCESSING_FEE_NGN_KOBO, payment_mode: mode });
    const response = await fetch("https://api.paystack.co/transaction/initialize", {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        email,
        amount: PROCESSING_FEE_NGN_KOBO,
        currency: "NGN",
        reference,
        callback_url: `${appUrl}/processing-fee`,
        metadata: { product: "processing_fee", customer_name: fullName, payment_mode: mode },
      }),
      cache: "no-store",
    });
    const result = await response.json() as { status?: boolean; message?: string; data?: { authorization_url?: string; reference?: string } };
    const paymentUrl = result.data?.authorization_url;
    if (!response.ok || !result.status || result.data?.reference !== reference || !paymentUrl?.startsWith("https://checkout.paystack.com/")) {
      console.error("Processing-fee checkout initialization failed", response.status, reference, result.message);
      return Response.json({ error: "Paystack could not start the ₦1,000 checkout. No payment has been taken." }, { status: 502 });
    }
    await saveProcessingFeeUrl(reference, mode, paymentUrl);
    return Response.json({ url: paymentUrl, reference, mode });
  } catch (error) {
    console.error("Processing-fee checkout failed", error);
    return Response.json({ error: "The ₦1,000 checkout is temporarily unavailable. No payment has been taken." }, { status: 500 });
  }
}
