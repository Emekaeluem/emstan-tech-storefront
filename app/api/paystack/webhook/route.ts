import { createHmac, timingSafeEqual } from "node:crypto";
import { findOrder, verifyOrderPayment } from "@/lib/order-payment";
import { paystackTestKey } from "@/lib/paystack-config";

export async function POST(request: Request) {
  const secret = paystackTestKey();
  const signature = request.headers.get("x-paystack-signature") || "";
  const raw = await request.text();
  if (!secret || !/^[a-f0-9]{128}$/i.test(signature)) return new Response(null, { status: 401 });
  const expected = createHmac("sha512", secret).update(raw).digest("hex");
  if (!timingSafeEqual(Buffer.from(signature.toLowerCase()), Buffer.from(expected))) return new Response(null, { status: 401 });
  try {
    const event = JSON.parse(raw) as { event?: string; data?: { reference?: string } };
    if (event.event !== "charge.success" || !event.data?.reference) return new Response(null, { status: 200 });
    const order = await findOrder({ payment_reference: event.data.reference });
    if (order) await verifyOrderPayment(order);
    return new Response(null, { status: 200 });
  } catch (error) {
    console.error("Paystack webhook processing failed", error);
    return new Response(null, { status: 500 });
  }
}
