import { findOrder, publicOrder, verifyOrderPayment } from "@/lib/order-payment";

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
    return Response.json({ order: publicOrder(await verifyOrderPayment(order)) }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    console.error("Order status failed", error);
    return Response.json({ error: "We could not check your order. Please try again." }, { status: 500 });
  }
}
