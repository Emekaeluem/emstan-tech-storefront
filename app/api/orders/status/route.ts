import { findOrder, publicOrder, quoteApprovedOrder, verifyOrderPayment } from "@/lib/order-payment";
import { sendPaymentEmail } from "@/lib/payment-email";

export async function POST(request: Request) {
  try {
    const body = await request.json() as { reference?: string; email?: string };
    const reference = body.reference?.trim().toUpperCase() || "";
    const email = body.email?.trim().toLowerCase() || "";
    if (!/^EMT-[A-Z0-9-]{10,48}$/.test(reference) || !/^\S+@\S+\.\S+$/.test(email)) {
      return Response.json({ error: "Enter your order reference and email." }, { status: 400 });
    }
    const order = await findOrder({ reference, email });
    if (!order) return Response.json({ error: "Order not found. Check your reference and email." }, { status: 404 });
    const verified = await verifyOrderPayment(order);
    if (verified.status === "paid") {
      try { await sendPaymentEmail(verified); }
      catch (error) { console.error("Payment email failed; payment remains confirmed", error); }
    }
    let quoted = verified;
    let rateError = false;
    if (verified.status === "approved") {
      try { quoted = await quoteApprovedOrder(verified); }
      catch (error) { console.error("Exchange-rate quote failed", error); rateError = true; }
    }
    return Response.json({ order: publicOrder(quoted, rateError) }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    console.error("Order status failed", error);
    return Response.json({ error: "We could not check your order. Please try again." }, { status: 500 });
  }
}
