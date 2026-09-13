import { findProcessingFeePayment, verifyProcessingFeePayment } from "@/lib/processing-fee";

export async function POST(request: Request) {
  try {
    const body = await request.json() as { reference?: string };
    const reference = body.reference?.trim().toUpperCase() || "";
    if (!/^EMT-FEE-[A-Z0-9-]{12,64}$/.test(reference)) return Response.json({ error: "Invalid payment reference." }, { status: 400 });
    const payment = await findProcessingFeePayment(reference);
    if (!payment) return Response.json({ error: "Payment not found." }, { status: 404 });
    const verified = await verifyProcessingFeePayment(payment);
    return Response.json({
      reference: verified.reference,
      fullName: verified.full_name,
      amountNgnKobo: verified.amount_ngn_kobo,
      mode: verified.payment_mode,
      status: verified.status,
      paidAt: verified.paid_at,
    });
  } catch (error) {
    console.error("Processing-fee status failed", error);
    return Response.json({ error: "We could not confirm this payment yet. Please try again." }, { status: 500 });
  }
}
