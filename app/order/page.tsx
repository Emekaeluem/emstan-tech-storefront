"use client";

import { FormEvent, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Suspense } from "react";
import Link from "next/link";

type Order = { reference: string; fullName: string; domain: string; status: string; amountNgnKobo: number | null; paidAt: string | null };

function OrderLookup() {
  const params = useSearchParams();
  const [reference, setReference] = useState(params.get("order") || params.get("reference") || "");
  const [email, setEmail] = useState("");
  const [order, setOrder] = useState<Order | null>(null);
  const [error, setError] = useState("");
  const [working, setWorking] = useState(false);

  const money = (amount: number) => new Intl.NumberFormat("en-NG", { style: "currency", currency: "NGN" }).format(amount / 100);

  async function check(event?: FormEvent) {
    event?.preventDefault(); setWorking(true); setError("");
    try {
      const response = await fetch("/api/orders/status", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ reference, email }) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Could not find your order.");
      setOrder(data.order);
    } catch (cause) { setOrder(null); setError(cause instanceof Error ? cause.message : "Try again."); }
    finally { setWorking(false); }
  }

  async function checkout() {
    setWorking(true); setError("");
    try {
      const response = await fetch("/api/checkout", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ reference, email }) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Could not open checkout.");
      if (!/^https:\/\/checkout\.paystack\.com\//.test(data.url)) throw new Error("Invalid checkout link.");
      window.location.assign(data.url);
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Try again."); setWorking(false); }
  }

  return <main className="min-h-screen bg-[#f7f9ff] px-4 py-12 text-slate-900 sm:py-20">
    <div className="mx-auto max-w-xl rounded-3xl border border-slate-200 bg-white p-6 shadow-[0_20px_70px_rgba(24,43,82,.09)] sm:p-10">
      <Link href="/" className="text-sm font-black text-blue-600">← Emstan Tech</Link>
      <h1 className="mt-7 text-3xl font-black tracking-tight">Check your domain request</h1>
      <p className="mt-3 text-slate-600">Enter the reference shown when you submitted your request and the same email address.</p>
      <form onSubmit={check} className="mt-8 space-y-4">
        <label className="block text-sm font-bold">Order reference<input required value={reference} onChange={e => setReference(e.target.value)} className="mt-2 block w-full rounded-xl border border-slate-300 p-3 font-mono outline-blue-600" placeholder="EMT-..." /></label>
        <label className="block text-sm font-bold">Email address<input required type="email" value={email} onChange={e => setEmail(e.target.value)} className="mt-2 block w-full rounded-xl border border-slate-300 p-3 outline-blue-600" placeholder="you@example.com" /></label>
        <button disabled={working} className="w-full rounded-xl bg-slate-900 px-6 py-3 font-bold text-white disabled:opacity-60">{working ? "Please wait…" : "Check status"}</button>
      </form>
      {error && <p role="alert" className="mt-5 rounded-xl bg-red-50 p-4 text-sm text-red-700">{error}</p>}
      {order && <section className="mt-7 rounded-2xl bg-blue-50/70 p-5">
        <p className="text-sm text-slate-600">{order.domain} · {order.reference}</p>
        {order.status === "awaiting_review" && <p className="mt-2 font-semibold">Your request is being reviewed. No payment is due yet.</p>}
        {order.status === "approved" && <><p className="mt-2 font-semibold">Your domain request is approved. Confirm the price below before opening Paystack.</p>{order.amountNgnKobo ? <><p className="mt-4 text-3xl font-black">{money(order.amountNgnKobo)}</p><button onClick={checkout} disabled={working} className="mt-5 w-full rounded-xl bg-blue-600 px-6 py-3 font-bold text-white disabled:opacity-60">Pay securely with Paystack</button></> : <p className="mt-3 text-sm">Checkout pricing is being finalised. Contact us before payment.</p>}</>}
        {order.status === "payment_pending" && <><p className="mt-2 font-semibold">Payment has not been confirmed yet. If you just paid, try “Check status” again.</p>{order.amountNgnKobo && <p className="mt-2">Amount: {money(order.amountNgnKobo)}</p>}<button onClick={checkout} disabled={working} className="mt-5 w-full rounded-xl bg-blue-600 px-6 py-3 font-bold text-white disabled:opacity-60">Return to Paystack checkout</button></>}
        {order.status === "paid" && <div className="mt-3 rounded-xl border border-emerald-200 bg-white p-5" id="receipt"><p className="font-black text-emerald-700">Payment confirmed · Emstan Tech receipt</p><p className="mt-3">Customer: {order.fullName}</p><p>Service: {order.domain} — first-year domain and hosting package</p><p>Amount paid: {order.amountNgnKobo ? money(order.amountNgnKobo) : "—"}</p><p>Paid: {order.paidAt ? new Date(order.paidAt).toLocaleString("en-NG") : "Confirmed"}</p><p>Reference: {order.reference}</p><p className="mt-4 text-xs text-slate-600">Registration and hosting setup are handled separately after payment. This receipt confirms payment, not domain registration.</p><button onClick={() => window.print()} className="mt-5 rounded-lg border px-4 py-2 text-sm font-bold print:hidden">Print receipt</button></div>}
        {!(["awaiting_review", "approved", "payment_pending", "paid"].includes(order.status)) && <p className="mt-2 font-semibold">Status: {order.status}. Contact us for an update.</p>}
      </section>}
      <p className="mt-7 text-sm text-slate-500">Need help? <a className="font-semibold text-blue-600" href="https://wa.me/2348069548743" target="_blank" rel="noreferrer">Chat on WhatsApp</a>.</p>
    </div>
  </main>;
}

export default function OrderPage() { return <Suspense fallback={<main className="p-10">Loading your order…</main>}><OrderLookup /></Suspense>; }
