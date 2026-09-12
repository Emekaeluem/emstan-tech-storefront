"use client";

import { FormEvent, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Suspense } from "react";
import Link from "next/link";

type Currency = "NGN" | "USD";
type Order = { reference: string; fullName: string; domain: string; status: string; amountNgnKobo: number | null; amountUsdCents: number; currency: Currency | null; usdAvailable: boolean; paidAt: string | null; quoteExpiresAt: string | null; rateUpdatedAt: string | null; fxRate: number | null; fxMarginPercent: number | null; rateError: boolean };

function OrderLookup() {
  const params = useSearchParams();
  const [reference, setReference] = useState(params.get("order") || params.get("reference") || "");
  const [email, setEmail] = useState("");
  const [order, setOrder] = useState<Order | null>(null);
  const [error, setError] = useState("");
  const [working, setWorking] = useState(false);
  const [currency, setCurrency] = useState<Currency>("NGN");

  const money = (amount: number, code: Currency) => new Intl.NumberFormat(code === "USD" ? "en-US" : "en-NG", { style: "currency", currency: code }).format(amount / 100);

  async function check(event?: FormEvent) {
    event?.preventDefault(); setWorking(true); setError("");
    try {
      const response = await fetch("/api/orders/status", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ reference, email }) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Could not find your order.");
      setCurrency(data.order.currency || (data.order.usdAvailable ? "USD" : "NGN"));
      setOrder(data.order);
    } catch (cause) { setOrder(null); setError(cause instanceof Error ? cause.message : "Try again."); }
    finally { setWorking(false); }
  }

  async function checkout() {
    setWorking(true); setError("");
    try {
      const response = await fetch("/api/checkout", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ reference, email, currency, expectedAmountNgnKobo: order?.amountNgnKobo, quoteExpiresAt: order?.quoteExpiresAt }) });
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
        {order.status === "approved" && <><p className="mt-2 font-semibold">Your domain request is approved. Choose a currency and confirm the exact amount before paying.</p>
          <div className="mt-5 grid grid-cols-2 gap-3">
            <button type="button" onClick={() => setCurrency("USD")} disabled={!order.usdAvailable} className={`rounded-xl border p-3 text-left disabled:cursor-not-allowed disabled:opacity-50 ${currency === "USD" ? "border-blue-600 bg-white ring-2 ring-blue-100" : "border-slate-200 bg-white"}`}><span className="block text-xs font-bold text-slate-500">US dollars {order.usdAvailable ? "· test only" : "· reference price"}</span><span className="text-lg font-black">{money(order.amountUsdCents, "USD")}</span></button>
            <button type="button" onClick={() => setCurrency("NGN")} disabled={!order.amountNgnKobo} className={`rounded-xl border p-3 text-left disabled:cursor-not-allowed disabled:opacity-50 ${currency === "NGN" ? "border-blue-600 bg-white ring-2 ring-blue-100" : "border-slate-200 bg-white"}`}><span className="block text-xs font-bold text-slate-500">Naira</span><span className="text-lg font-black">{order.amountNgnKobo ? money(order.amountNgnKobo, "NGN") : "Not set"}</span></button>
          </div>
          {!order.usdAvailable && <p className="mt-2 text-xs text-slate-600">Have a dollar card? Choose the Naira quote: Paystack charges NGN and your card issuer converts it. Direct USD checkout is not enabled.</p>}
          {order.usdAvailable && <p className="mt-2 text-xs text-slate-600">USD checkout here is for Paystack test payments only. Real USD collections require a USD payout account approved by Paystack.</p>}
          {order.amountNgnKobo && order.quoteExpiresAt && <p className="mt-3 text-xs leading-relaxed text-slate-600">Naira price locked until {new Date(order.quoteExpiresAt).toLocaleString("en-NG")}. Based on a daily USD/NGN rate of {order.fxRate?.toLocaleString("en-NG")} (updated {order.rateUpdatedAt && new Date(order.rateUpdatedAt).toLocaleDateString("en-NG")}) from <a className="underline" href="https://www.exchangerate-api.com" target="_blank" rel="noreferrer">ExchangeRate-API</a>{order.fxMarginPercent ? `, plus a ${order.fxMarginPercent}% exchange buffer` : ", with no added exchange buffer"}. Paystack charges Naira; your card issuer may use a different conversion rate or charge fees.</p>}
          {order.rateError && <p className="mt-3 text-xs text-amber-800">A fresh exchange rate is temporarily unavailable. No Naira checkout can start right now. Please press Check status again later.</p>}
          <button onClick={checkout} disabled={working || (currency === "USD" ? !order.usdAvailable : !order.amountNgnKobo)} className="mt-5 w-full rounded-xl bg-blue-600 px-6 py-3 font-bold text-white disabled:opacity-50">Pay {currency === "USD" ? money(order.amountUsdCents, "USD") : order.amountNgnKobo ? money(order.amountNgnKobo, "NGN") : ""} with Paystack</button>
        </>}
        {order.status === "payment_pending" && <><p className="mt-2 font-semibold">Payment has not been confirmed yet. If you just paid, try “Check status” again.</p><p className="mt-2">Amount: {order.currency === "USD" ? money(order.amountUsdCents, "USD") : order.amountNgnKobo ? money(order.amountNgnKobo, "NGN") : "—"}</p><button onClick={checkout} disabled={working} className="mt-5 w-full rounded-xl bg-blue-600 px-6 py-3 font-bold text-white disabled:opacity-60">Return to Paystack checkout</button></>}
        {order.status === "paid" && <div className="mt-3 rounded-xl border border-emerald-200 bg-white p-5" id="receipt"><p className="font-black text-emerald-700">Payment confirmed · Emstan Tech receipt</p><p className="mt-3">Customer: {order.fullName}</p><p>Service: {order.domain} — first-year domain and hosting package</p><p>Amount paid: {order.currency === "USD" ? money(order.amountUsdCents, "USD") : order.amountNgnKobo ? money(order.amountNgnKobo, "NGN") : "—"}</p><p>Currency: {order.currency || "NGN"}</p><p>Paid: {order.paidAt ? new Date(order.paidAt).toLocaleString("en-NG") : "Confirmed"}</p><p>Reference: {order.reference}</p><p className="mt-4 text-xs text-slate-600">Registration and hosting setup are handled separately after payment. This receipt confirms payment, not domain registration.</p><button onClick={() => window.print()} className="mt-5 rounded-lg border px-4 py-2 text-sm font-bold print:hidden">Print receipt</button></div>}
        {!(["awaiting_review", "approved", "payment_pending", "paid"].includes(order.status)) && <p className="mt-2 font-semibold">Status: {order.status}. Contact us for an update.</p>}
      </section>}
      <p className="mt-7 text-sm text-slate-500">Need help? <a className="font-semibold text-blue-600" href="https://wa.me/2348069548743" target="_blank" rel="noreferrer">Chat on WhatsApp</a>.</p>
    </div>
  </main>;
}

export default function OrderPage() { return <Suspense fallback={<main className="p-10">Loading your order…</main>}><OrderLookup /></Suspense>; }
