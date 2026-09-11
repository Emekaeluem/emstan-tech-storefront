"use client";

import { FormEvent, useMemo, useState } from "react";
import { ArrowRight, Check, Code2, Globe2, HardDrive, Headphones, LockKeyhole, Mail, Search, Server, ShieldCheck, Sparkles } from "lucide-react";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";

type Package = { extension: ".com" | ".org" | ".net"; price: number; popular?: boolean };
const packages: Package[] = [{ extension: ".com", price: 20, popular: true }, { extension: ".org", price: 20 }, { extension: ".net", price: 23 }];
const benefits = ["Domain registration for one year", "20 GB SSD hosting", "30 professional mailboxes", "AI for WordPress", "AI Website Builder"];

function normalizeName(value: string) {
  return value.toLowerCase().trim().replace(/^https?:\/\//, "").replace(/^www\./, "").split("/")[0].replace(/\.[a-z.]+$/i, "").replace(/[^a-z0-9-]/g, "").replace(/^-+|-+$/g, "");
}

export default function Home() {
  const [domainName, setDomainName] = useState("");
  const [selected, setSelected] = useState<Package>(packages[0]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [reference, setReference] = useState("");
  const fullDomain = useMemo(() => `${normalizeName(domainName)}${selected.extension}`, [domainName, selected]);

  function startOrder(pkg = selected) {
    const cleaned = normalizeName(domainName);
    setSelected(pkg); setError(""); setReference("");
    if (!cleaned || cleaned.length < 2) {
      setError("Enter at least two letters for your domain name.");
      document.getElementById("domain-search")?.focus(); return;
    }
    setDomainName(cleaned); setDialogOpen(true);
  }

  async function submitOrder(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setSubmitting(true); setError("");
    const form = new FormData(event.currentTarget);
    const payload = { fullName: form.get("fullName"), email: form.get("email"), phone: form.get("phone"), domain: fullDomain, extension: selected.extension, website: form.get("website"), acceptedTerms: form.get("acceptedTerms") === "on" };
    try {
      const response = await fetch("/api/orders", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "We could not submit your request.");
      setReference(result.order.reference);
    } catch (requestError) { setError(requestError instanceof Error ? requestError.message : "We could not submit your request."); }
    finally { setSubmitting(false); }
  }

  return (
    <main className="min-h-screen overflow-hidden bg-white text-slate-950">
      <header className="border-b border-slate-200/80 bg-white">
        <nav className="site-container flex h-20 items-center justify-between" aria-label="Main navigation">
          <a href="#top" className="flex items-center gap-3 font-extrabold tracking-[-0.03em]"><span className="grid size-10 place-items-center rounded-xl bg-blue-600 text-lg text-white shadow-[0_10px_25px_rgba(37,84,235,.22)]">E</span><span className="text-lg">Emstan <span className="text-blue-600">Tech</span></span></a>
          <div className="hidden items-center gap-8 text-sm font-semibold text-slate-600 md:flex"><a className="hover:text-blue-600" href="#packages">Packages</a><a className="hover:text-blue-600" href="#benefits">What you get</a><a className="hover:text-blue-600" href="#faq">FAQs</a><a className="rounded-xl bg-slate-950 px-5 py-3 text-white hover:bg-blue-600" href="#finder">Find a domain</a></div>
          <a className="rounded-xl bg-slate-950 px-4 py-2.5 text-sm font-bold text-white md:hidden" href="#finder">Get started</a>
        </nav>
      </header>

      <section id="top" className="hero-grid relative border-b border-slate-100 py-20 sm:py-28">
        <div className="site-container relative z-10">
          <div className="max-w-4xl"><p className="eyebrow">Domain + hosting, made simple</p><h1 className="mt-5 max-w-4xl text-5xl font-black leading-[1.02] tracking-[-0.055em] sm:text-7xl lg:text-[5.3rem]">Your brand deserves a <span className="text-blue-600">proper home</span> online.</h1><p className="mt-6 max-w-2xl text-lg leading-8 text-slate-600">Secure your domain, hosting and business email in one straightforward package—with real support when you need it.</p></div>
          <div id="finder" className="mt-11 max-w-4xl rounded-[1.65rem] border border-slate-200 bg-white p-3 shadow-[0_25px_75px_rgba(29,49,91,.13)]">
            <div className="flex flex-col gap-3 sm:flex-row">
              <label className="flex min-h-16 flex-1 items-center gap-3 rounded-2xl bg-slate-50 px-5 ring-blue-600 focus-within:ring-2"><Search className="size-5 shrink-0 text-slate-400" aria-hidden="true" /><span className="sr-only">Domain name</span><input id="domain-search" value={domainName} onChange={(event) => setDomainName(event.target.value)} onKeyDown={(event) => event.key === "Enter" && startOrder()} placeholder="Enter your brand name" className="min-w-0 flex-1 bg-transparent py-4 text-base font-semibold outline-none placeholder:font-normal placeholder:text-slate-400" /></label>
              <select aria-label="Domain extension" value={selected.extension} onChange={(event) => setSelected(packages.find((pkg) => pkg.extension === event.target.value) || packages[0])} className="min-h-16 rounded-2xl border border-slate-200 bg-white px-5 font-extrabold outline-none focus:border-blue-600 sm:w-32">{packages.map((pkg) => <option key={pkg.extension}>{pkg.extension}</option>)}</select>
              <Button onClick={() => startOrder()} className="min-h-16 rounded-2xl bg-blue-600 px-7 text-base font-extrabold shadow-[0_12px_28px_rgba(37,84,235,.24)] hover:bg-blue-700">Check &amp; order <ArrowRight /></Button>
            </div>
            {error && !dialogOpen && <p className="px-3 pb-1 pt-3 text-sm font-medium text-red-600">{error}</p>}
          </div>
          <div className="mt-7 flex flex-wrap gap-x-7 gap-y-3 text-sm font-semibold text-slate-600">{["Your details stay private", "Secure Paystack checkout", "Safe refund policy"].map((item) => <span key={item} className="flex items-center gap-2"><ShieldCheck className="size-4 text-emerald-600" />{item}</span>)}</div>
        </div>
      </section>

      <section id="packages" className="site-container py-24 sm:py-28">
        <div className="max-w-2xl"><p className="eyebrow">Simple first-year pricing</p><h2 className="section-title mt-4">Choose your online address.</h2><p className="mt-5 text-lg text-slate-600">Every package includes the essentials to launch a professional website—without piecing services together.</p></div>
        <div className="mt-12 grid gap-5 lg:grid-cols-3">
          {packages.map((pkg) => <article key={pkg.extension} className={`group relative rounded-[1.7rem] border bg-white p-7 shadow-[0_18px_55px_rgba(24,43,82,.08)] transition hover:-translate-y-1 hover:shadow-[0_24px_65px_rgba(24,43,82,.13)] ${pkg.popular ? "border-blue-300 ring-4 ring-blue-50" : "border-slate-200"}`}>
            {pkg.popular && <span className="absolute right-6 top-6 rounded-full bg-blue-50 px-3 py-1 text-xs font-extrabold text-blue-700">Most popular</span>}<Globe2 className="size-9 text-blue-600" /><h3 className="mt-7 text-3xl font-black tracking-[-0.045em]">{pkg.extension}</h3><div className="mt-4 flex items-end gap-2"><span className="text-5xl font-black tracking-[-0.06em]">${pkg.price}</span><span className="pb-1 text-sm font-semibold text-slate-500">/ first year</span></div><p className="mt-4 text-sm leading-6 text-slate-500">Naira checkout price will be shown before payment.</p>
            <ul className="mt-7 space-y-3 border-t border-slate-100 pt-6">{benefits.map((benefit) => <li key={benefit} className="flex gap-3 text-sm font-semibold text-slate-700"><span className="mt-0.5 grid size-5 shrink-0 place-items-center rounded-full bg-emerald-50"><Check className="size-3.5 text-emerald-700" /></span>{benefit}</li>)}</ul><Button onClick={() => startOrder(pkg)} className="mt-8 h-12 w-full rounded-xl bg-slate-950 font-extrabold hover:bg-blue-600">Choose {pkg.extension}<ArrowRight /></Button>
          </article>)}
        </div>
      </section>

      <section id="benefits" className="bg-[#f6f8ff] py-24 sm:py-28"><div className="site-container grid gap-14 lg:grid-cols-[.8fr_1.2fr] lg:items-center">
        <div><p className="eyebrow">Built for a real launch</p><h2 className="section-title mt-4">More than just a domain name.</h2><p className="mt-5 max-w-xl text-lg leading-8 text-slate-600">You get the space, tools and communication essentials required to put your brand online and keep it looking professional.</p><a href="https://wa.me/2348069548743" target="_blank" rel="noreferrer" className="mt-8 inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-5 py-3.5 text-sm font-extrabold shadow-sm hover:border-blue-300 hover:text-blue-600"><Headphones className="size-4" /> Ask us a question</a></div>
        <div className="grid gap-4 sm:grid-cols-2">{[
          { icon: HardDrive, title: "20 GB SSD storage", copy: "Reliable space for your website, files and essential content." }, { icon: Mail, title: "30 mailboxes", copy: "Create professional email addresses for your team and departments." }, { icon: Sparkles, title: "AI Website Builder", copy: "Move from an idea to a polished website with guided AI tools." }, { icon: Code2, title: "AI for WordPress", copy: "Build and improve your WordPress site with practical AI assistance." },
        ].map(({ icon: Icon, title, copy }) => <article key={title} className="rounded-3xl border border-white bg-white p-7 shadow-[0_18px_50px_rgba(24,43,82,.07)]"><span className="grid size-12 place-items-center rounded-2xl bg-blue-50 text-blue-600"><Icon className="size-5" /></span><h3 className="mt-6 text-lg font-black tracking-[-0.025em]">{title}</h3><p className="mt-2 text-sm leading-6 text-slate-600">{copy}</p></article>)}</div>
      </div></section>

      <section className="site-container py-24 sm:py-28"><div className="grid overflow-hidden rounded-[2rem] bg-slate-950 text-white shadow-[0_28px_80px_rgba(15,23,42,.2)] lg:grid-cols-[.85fr_1.15fr]">
        <div className="p-8 sm:p-12"><p className="eyebrow !text-blue-300">How it works</p><h2 className="mt-4 text-4xl font-black leading-tight tracking-[-0.045em]">From name idea to online home.</h2><p className="mt-5 text-slate-300">We keep the technical fulfilment behind the scenes. You deal directly with Emstan Tech from order to support.</p></div>
        <div className="grid gap-px bg-white/10 sm:grid-cols-3">{[{ no: "01", title: "Request", copy: "Choose a package and submit your preferred domain." }, { no: "02", title: "Pay", copy: "Complete payment securely through Paystack." }, { no: "03", title: "Launch", copy: "We register, provision and send your access details." }].map((step) => <article key={step.no} className="bg-slate-950 p-8 sm:p-9"><span className="text-sm font-black text-blue-300">{step.no}</span><h3 className="mt-14 text-xl font-black">{step.title}</h3><p className="mt-3 text-sm leading-6 text-slate-400">{step.copy}</p></article>)}</div>
      </div></section>

      <section id="faq" className="border-y border-slate-100 bg-slate-50/70 py-24 sm:py-28"><div className="site-container grid gap-12 lg:grid-cols-[.7fr_1.3fr]">
        <div><p className="eyebrow">Questions, answered</p><h2 className="section-title mt-4">Buy with confidence.</h2><p className="mt-5 text-slate-600">Need more clarity? Message us directly on WhatsApp.</p></div>
        <Accordion type="single" collapsible defaultValue="ownership" className="rounded-3xl border border-slate-200 bg-white px-6 shadow-[0_18px_50px_rgba(24,43,82,.06)] sm:px-8">
          <AccordionItem value="ownership"><AccordionTrigger className="py-6 text-base font-extrabold hover:no-underline">Will I own the domain?</AccordionTrigger><AccordionContent className="pb-6 leading-7 text-slate-600">Yes. Your correct registrant details will be collected and used for the registration. Emstan Tech manages setup and support on your behalf.</AccordionContent></AccordionItem>
          <AccordionItem value="availability"><AccordionTrigger className="py-6 text-base font-extrabold hover:no-underline">What if my requested domain is unavailable?</AccordionTrigger><AccordionContent className="pb-6 leading-7 text-slate-600">You can choose another available domain or receive a full refund for the affected package. We will never force you to accept a replacement you do not want.</AccordionContent></AccordionItem>
          <AccordionItem value="renewal"><AccordionTrigger className="py-6 text-base font-extrabold hover:no-underline">What happens after the first year?</AccordionTrigger><AccordionContent className="pb-6 leading-7 text-slate-600">Before expiry, you can renew the domain only or renew the complete domain-and-hosting service. The applicable renewal price will be clearly communicated before payment.</AccordionContent></AccordionItem>
          <AccordionItem value="refund"><AccordionTrigger className="py-6 text-base font-extrabold hover:no-underline">Can I request a refund after registration?</AccordionTrigger><AccordionContent className="pb-6 leading-7 text-slate-600">If the domain is unavailable before registration, you are protected by our full-refund promise. Once a domain and hosting service have been successfully registered and provisioned, the order becomes non-refundable because the digital services have already been purchased for you.</AccordionContent></AccordionItem>
        </Accordion>
      </div></section>

      <section className="site-container py-20 sm:py-24"><div className="relative overflow-hidden rounded-[2rem] bg-blue-600 px-7 py-16 text-center text-white sm:px-14 sm:py-20"><div className="relative z-10 mx-auto max-w-2xl"><Server className="mx-auto size-9 text-blue-200" /><h2 className="mt-6 text-4xl font-black tracking-[-0.05em] sm:text-5xl">Ready to give your idea an address?</h2><p className="mt-5 text-lg text-blue-100">Choose your extension and send your domain request today.</p><a href="#finder" className="mt-8 inline-flex items-center gap-2 rounded-xl bg-white px-6 py-4 font-extrabold text-blue-700 shadow-xl">Find your domain <ArrowRight className="size-4" /></a></div></div></section>
      <footer className="border-t border-slate-200 py-10"><div className="site-container flex flex-col justify-between gap-7 text-sm text-slate-500 sm:flex-row"><div><p className="font-extrabold text-slate-950">Emstan <span className="text-blue-600">Tech</span></p><p className="mt-2">emstantechservices@gmail.com · +234 806 954 8743</p></div><div className="max-w-xl text-xs leading-6 sm:text-right">Emstan Tech provides managed domain registration, hosting setup and support. Domain services are fulfilled through established third-party providers. Prices shown cover the first year unless otherwise stated.</div></div></footer>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}><DialogContent className="max-h-[92vh] overflow-y-auto rounded-3xl border-slate-200 p-0 sm:max-w-xl">
        {reference ? <div className="p-8 text-center sm:p-10"><span className="mx-auto grid size-16 place-items-center rounded-full bg-emerald-50"><Check className="size-8 text-emerald-700" /></span><DialogTitle className="mt-6 text-2xl font-black tracking-tight">Request received</DialogTitle><p className="mt-3 leading-7 text-slate-600">We’ll confirm <strong>{fullDomain}</strong> and send the secure Paystack checkout to your email.</p><div className="mt-6 rounded-2xl bg-slate-50 p-4 text-sm"><span className="text-slate-500">Order reference</span><strong className="mt-1 block font-mono text-slate-950">{reference}</strong></div><Button onClick={() => setDialogOpen(false)} className="mt-6 h-12 w-full rounded-xl bg-blue-600 font-bold">Done</Button></div> :
        <form onSubmit={submitOrder} className="p-6 sm:p-8"><DialogHeader><DialogTitle className="text-2xl font-black tracking-[-0.035em]">Request {fullDomain || `a ${selected.extension} domain`}</DialogTitle><DialogDescription className="leading-6">First-year package: ${selected.price}. We confirm availability before requesting payment.</DialogDescription></DialogHeader><div className="mt-7 grid gap-5">
          <label className="grid gap-2 text-sm font-bold">Full name<Input name="fullName" required minLength={2} className="h-12 rounded-xl" placeholder="Your full name" /></label><label className="grid gap-2 text-sm font-bold">Email address<Input name="email" required type="email" className="h-12 rounded-xl" placeholder="you@example.com" /></label><label className="grid gap-2 text-sm font-bold">WhatsApp number<Input name="phone" required type="tel" className="h-12 rounded-xl" placeholder="+234..." /></label><label className="hidden" aria-hidden="true">Website<Input name="website" tabIndex={-1} autoComplete="off" /></label><label className="flex items-start gap-3 rounded-2xl bg-slate-50 p-4 text-sm leading-6 text-slate-600"><input name="acceptedTerms" required type="checkbox" className="mt-1 size-4 accent-blue-600" /><span>I confirm that my details are correct and accept the registration and refund terms.</span></label>{error && <p className="rounded-xl bg-red-50 p-3 text-sm font-semibold text-red-700">{error}</p>}<Button disabled={submitting} className="h-13 rounded-xl bg-blue-600 text-base font-extrabold hover:bg-blue-700">{submitting ? "Submitting…" : "Submit domain request"}<ArrowRight /></Button><p className="flex items-center justify-center gap-2 text-center text-xs text-slate-500"><LockKeyhole className="size-3.5" />No card details are collected on this form.</p>
        </div></form>}
      </DialogContent></Dialog>
    </main>
  );
}
