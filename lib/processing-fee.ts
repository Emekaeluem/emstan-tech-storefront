import { paymentSecretKey, type PaymentMode } from "@/lib/paystack-config";

export const PROCESSING_FEE_NGN_KOBO = 100_000;

export type ProcessingFeePayment = {
  reference: string;
  full_name: string;
  email: string;
  amount_ngn_kobo: number;
  payment_mode: PaymentMode;
  status: "pending" | "paid";
  payment_url: string | null;
  paid_at: string | null;
};

function supabaseHeaders(prefer?: string): HeadersInit {
  const key = process.env.SUPABASE_SECRET_KEY?.trim() || "";
  return {
    apikey: key,
    Authorization: `Bearer ${key}`,
    "Content-Type": "application/json",
    ...(prefer ? { Prefer: prefer } : {}),
  };
}

function tableUrl(): string {
  const base = process.env.SUPABASE_URL?.trim().replace(/\/$/, "");
  if (!base || !process.env.SUPABASE_SECRET_KEY?.trim()) {
    throw new Error("Supabase processing-fee storage is not configured");
  }
  return `${base}/rest/v1/processing_fee_payments`;
}

export async function createProcessingFeePayment(payment: Omit<ProcessingFeePayment, "status" | "payment_url" | "paid_at">): Promise<ProcessingFeePayment> {
  const response = await fetch(tableUrl(), {
    method: "POST",
    headers: supabaseHeaders("return=representation"),
    body: JSON.stringify({ ...payment, status: "pending" }),
    cache: "no-store",
  });
  if (!response.ok) throw new Error(`Processing-fee insert failed (${response.status})`);
  const rows = await response.json() as ProcessingFeePayment[];
  if (!rows[0]) throw new Error("Processing-fee insert returned no row");
  return rows[0];
}

export async function findProcessingFeePayment(reference: string): Promise<ProcessingFeePayment | null> {
  const url = new URL(tableUrl());
  url.searchParams.set("select", "reference,full_name,email,amount_ngn_kobo,payment_mode,status,payment_url,paid_at");
  url.searchParams.set("reference", `eq.${reference}`);
  url.searchParams.set("limit", "1");
  const response = await fetch(url, { headers: supabaseHeaders(), cache: "no-store" });
  if (!response.ok) throw new Error(`Processing-fee lookup failed (${response.status})`);
  return ((await response.json()) as ProcessingFeePayment[])[0] || null;
}

export async function saveProcessingFeeUrl(reference: string, mode: PaymentMode, paymentUrl: string): Promise<void> {
  const url = new URL(tableUrl());
  url.searchParams.set("reference", `eq.${reference}`);
  url.searchParams.set("payment_mode", `eq.${mode}`);
  url.searchParams.set("status", "eq.pending");
  const response = await fetch(url, {
    method: "PATCH",
    headers: supabaseHeaders(),
    body: JSON.stringify({ payment_url: paymentUrl, updated_at: new Date().toISOString() }),
    cache: "no-store",
  });
  if (!response.ok) throw new Error(`Processing-fee URL update failed (${response.status})`);
}

export async function verifyProcessingFeePayment(payment: ProcessingFeePayment): Promise<ProcessingFeePayment> {
  if (payment.status === "paid") return payment;
  const key = paymentSecretKey(payment.payment_mode);
  if (!key) throw new Error(`Paystack ${payment.payment_mode} key is unavailable`);
  const response = await fetch(`https://api.paystack.co/transaction/verify/${encodeURIComponent(payment.reference)}`, {
    headers: { Authorization: `Bearer ${key}` },
    cache: "no-store",
  });
  const result = await response.json() as {
    status?: boolean;
    data?: { status?: string; reference?: string; amount?: number; currency?: string; customer?: { email?: string }; paid_at?: string };
  };
  const data = result.data;
  if (!response.ok || !result.status || data?.status !== "success") return payment;
  if (data.reference !== payment.reference || data.amount !== PROCESSING_FEE_NGN_KOBO || data.currency !== "NGN" || data.customer?.email?.toLowerCase() !== payment.email) {
    throw new Error("Processing-fee verification mismatch");
  }
  const url = new URL(tableUrl());
  url.searchParams.set("reference", `eq.${payment.reference}`);
  url.searchParams.set("payment_mode", `eq.${payment.payment_mode}`);
  url.searchParams.set("status", "eq.pending");
  const paidAt = data.paid_at || new Date().toISOString();
  const updated = await fetch(url, {
    method: "PATCH",
    headers: supabaseHeaders("return=representation"),
    body: JSON.stringify({ status: "paid", paid_at: paidAt, updated_at: new Date().toISOString() }),
    cache: "no-store",
  });
  if (!updated.ok) throw new Error(`Processing-fee payment update failed (${updated.status})`);
  return ((await updated.json()) as ProcessingFeePayment[])[0] || { ...payment, status: "paid", paid_at: paidAt };
}
