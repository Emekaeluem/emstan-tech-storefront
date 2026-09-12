export type Order = {
  id: string;
  reference: string;
  full_name: string;
  email: string;
  domain: string;
  extension: string;
  status: string;
  amount_ngn_kobo: number | null;
  payment_reference: string | null;
  payment_url: string | null;
  paid_at: string | null;
};

function connection() {
  const key = process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!process.env.SUPABASE_URL || !key) throw new Error("Supabase configuration missing");
  return { base: `${process.env.SUPABASE_URL}/rest/v1/orders`, headers: { apikey: key, "Content-Type": "application/json" } };
}

export async function findOrder(filters: Record<string, string>): Promise<Order | null> {
  const { base, headers } = connection();
  const url = new URL(base);
  url.searchParams.set("select", "id,reference,full_name,email,domain,extension,status,amount_ngn_kobo,payment_reference,payment_url,paid_at");
  for (const [field, value] of Object.entries(filters)) url.searchParams.set(field, `eq.${value}`);
  url.searchParams.set("limit", "1");
  const response = await fetch(url, { headers, cache: "no-store" });
  if (!response.ok) throw new Error(`Order lookup failed (${response.status})`);
  const rows = (await response.json()) as Order[];
  return rows[0] || null;
}

export async function changeOrder(reference: string, status: string, fields: Record<string, unknown>): Promise<Order | null> {
  const { base, headers } = connection();
  const url = new URL(base);
  url.searchParams.set("reference", `eq.${reference}`);
  url.searchParams.set("status", `eq.${status}`);
  const response = await fetch(url, {
    method: "PATCH", headers: { ...headers, Prefer: "return=representation" },
    body: JSON.stringify({ ...fields, updated_at: new Date().toISOString() }), cache: "no-store",
  });
  if (!response.ok) throw new Error(`Order update failed (${response.status})`);
  return ((await response.json()) as Order[])[0] || null;
}

export function configuredPrice(extension: string): number | null {
  const names: Record<string, string> = { ".com": "PRICE_COM_NGN_KOBO", ".org": "PRICE_ORG_NGN_KOBO", ".net": "PRICE_NET_NGN_KOBO" };
  const raw = process.env[names[extension]];
  if (!raw || !/^[1-9]\d*$/.test(raw)) return null;
  const amount = Number(raw);
  return Number.isSafeInteger(amount) && amount >= 10000 ? amount : null;
}

export async function verifyOrderPayment(order: Order): Promise<Order> {
  if (order.status !== "payment_pending" || !order.payment_reference || !order.amount_ngn_kobo) return order;
  const key = process.env.PAYSTACK_SECRET_KEY;
  if (!key) throw new Error("Paystack configuration missing");
  const response = await fetch(`https://api.paystack.co/transaction/verify/${encodeURIComponent(order.payment_reference)}`, {
    headers: { Authorization: `Bearer ${key}` }, cache: "no-store",
  });
  if (!response.ok) throw new Error(`Paystack verification failed (${response.status})`);
  const result = (await response.json()) as { status?: boolean; data?: { status?: string; reference?: string; amount?: number; currency?: string; customer?: { email?: string }; paid_at?: string } };
  const payment = result.data;
  if (!result.status || !payment || payment.status !== "success") return order;
  if (payment.reference !== order.payment_reference || payment.amount !== order.amount_ngn_kobo || payment.currency !== "NGN" || payment.customer?.email?.toLowerCase() !== order.email.toLowerCase()) {
    console.error("Paystack payment does not match order", order.reference);
    return order;
  }
  return (await changeOrder(order.reference, "payment_pending", { status: "paid", paid_at: payment.paid_at || new Date().toISOString() })) || order;
}

export function publicOrder(order: Order) {
  return { reference: order.reference, fullName: order.full_name, domain: order.domain, status: order.status, amountNgnKobo: order.amount_ngn_kobo ?? (order.status === "approved" ? configuredPrice(order.extension) : null), paidAt: order.paid_at };
}
