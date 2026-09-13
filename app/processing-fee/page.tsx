"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

type Mode = "test" | "live";
type Receipt = { reference: string; fullName: string; amountNgnKobo: number; mode: Mode; status: "pending" | "paid"; paidAt: string | null };

function money(kobo: number) {
  return new Intl.NumberFormat("en-NG", { style: "currency", currency: "NGN" }).format(kobo / 100);
}

export default function ProcessingFeePage() {
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [mode, setMode] = useState<Mode | null>(null);
  const [enabled, setEnabled] = useState(false);
  const [working, setWorking] = useState(false);
  const [error, setError] = useState("");
  const [receipt, setReceipt] = useState<Receipt | null>(null);

  useEffect(() => {
    void fetch("/api/processing-fee", { cache: "no-store" })
      .then(async response => {
        if (!response.ok) throw new Error();
        return response.json() as Promise<{ mode: Mode; enabled: boolean }>;
      })
      .then(config => { setMode(config.mode); setEnabled(config.enabled); })
      .catch(() => setError("Checkout configuration could not be loaded."));

    const reference = new URLSearchParams(window.location.search).get("reference");
    if (reference) {
      void fetch("/api/processing-fee/status", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reference }),
      }).then(async response => {
        const result = await response.json() as Receipt & { error?: string };
        if (!response.ok) throw new Error(result.error || "Payment could not be confirmed.");
        setReceipt(result);
      }).catch(problem => setError(problem instanceof Error ? problem.message : "Payment could not be confirmed."))
    }
  }, []);

  async function pay() {
    setError("");
    setWorking(true);
    try {
      const response = await fetch("/api/processing-fee", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fullName, email }),
      });
      const result = await response.json() as { url?: string; error?: string };
      if (!response.ok || !result.url) throw new Error(result.error || "Checkout could not start.");
      window.location.assign(result.url);
    } catch (problem) {
      setError(problem instanceof Error ? problem.message : "Checkout could not start.");
      setWorking(false);
    }
  }

  return <main className="min-h-screen bg-slate-50 px-4 py-12 text-slate-950">
    <section className="mx-auto max-w-xl rounded-3xl border border-slate-200 bg-white p-7 shadow-xl shadow-slate-200/60 sm:p-10">
      <Link href="/" className="text-sm font-bold text-blue-600">← Emstan Tech</Link>
      <p className="mt-8 text-sm font-bold uppercase tracking-[.2em] text-blue-600">Standalone payment</p>
      <h1 className="mt-3 text-3xl font-black sm:text-4xl">Processing Fee</h1>
      <p className="mt-3 text-slate-600">A separate checkout for testing and processing purposes. This is not a domain purchase.</p>

      <div className="mt-6 rounded-2xl bg-blue-50 p-5">
        <p className="text-sm font-semibold text-slate-600">Amount</p>
        <p className="mt-1 text-4xl font-black">₦1,000</p>
      </div>

      {mode && <div className={`mt-5 rounded-xl border p-4 text-sm font-bold ${mode === "live" ? "border-red-300 bg-red-50 text-red-800" : "border-amber-300 bg-amber-50 text-amber-900"}`}>
        {mode === "live" ? "LIVE MODE — your card will be charged ₦1,000 real money." : "TEST MODE — no real money will be charged."}
      </div>}

      {receipt ? <div className="mt-6 rounded-2xl border border-emerald-200 bg-emerald-50 p-5">
        <p className="font-black text-emerald-800">{receipt.status === "paid" ? "Payment confirmed" : "Payment has not been confirmed yet"}</p>
        <p className="mt-3 text-sm">Customer: {receipt.fullName}</p>
        <p className="text-sm">Amount: {money(receipt.amountNgnKobo)}</p>
        <p className="text-sm">Reference: {receipt.reference}</p>
        {receipt.mode === "test" && <p className="mt-3 font-black text-amber-900">TEST PAYMENT ONLY — no real money received.</p>}
        {receipt.status !== "paid" && <button onClick={() => window.location.reload()} className="mt-4 rounded-xl bg-slate-900 px-5 py-3 font-bold text-white">Check again</button>}
      </div> : <div className="mt-6 space-y-4">
        <label className="block"><span className="mb-2 block text-sm font-bold">Full name</span><input value={fullName} onChange={event => setFullName(event.target.value)} autoComplete="name" className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-blue-500" /></label>
        <label className="block"><span className="mb-2 block text-sm font-bold">Email address</span><input value={email} onChange={event => setEmail(event.target.value)} type="email" autoComplete="email" className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-blue-500" /></label>
        <button onClick={() => void pay()} disabled={working || !enabled || !mode} className="w-full rounded-xl bg-blue-600 px-6 py-4 font-black text-white disabled:cursor-not-allowed disabled:opacity-50">{working ? "Please wait…" : enabled ? "Pay ₦1,000 with Paystack" : "Checkout unavailable"}</button>
      </div>}

      {error && <p className="mt-5 rounded-xl bg-red-50 p-4 text-sm font-semibold text-red-700">{error}</p>}
      <p className="mt-6 text-xs leading-5 text-slate-500">Paystack will send its standard transaction receipt to the email entered above when customer receipts are enabled in your Paystack settings.</p>
    </section>
  </main>;
}
