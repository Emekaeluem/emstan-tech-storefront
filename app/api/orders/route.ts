import { checkDomain, validDomain } from "@/lib/domain-availability";
import { currentPaymentMode } from "@/lib/paystack-config";

const packagePrices: Record<string, number> = {
  ".com": 2000,
  ".org": 2000,
  ".net": 2300,
};

function value(input: unknown, limit = 160) {
  return typeof input === "string" ? input.trim().slice(0, limit) : "";
}

function supabaseConnection() {
  const secret =
    process.env.SUPABASE_SECRET_KEY ||
    process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!process.env.SUPABASE_URL || !secret) {
    throw new Error("Supabase environment variables are missing.");
  }

  return {
    url: process.env.SUPABASE_URL,
    headers: {
      apikey: secret,
      Authorization: `Bearer ${secret}`,
      "Content-Type": "application/json",
    },
  };
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as Record<string, unknown>;

    if (value(body.website)) {
      return Response.json({ error: "Unable to submit request." }, { status: 400 });
    }

    const fullName = value(body.fullName, 100);
    const email = value(body.email, 180).toLowerCase();
    const phone = value(body.phone, 40);
    const domain = value(body.domain, 100).toLowerCase();
    const extension = value(body.extension, 10).toLowerCase();
    const acceptedTerms = body.acceptedTerms === true;

    if (!fullName || !/^\S+@\S+\.\S+$/.test(email) || !/^\+?[0-9 ()-]{8,20}$/.test(phone)) {
      return Response.json(
        { error: "Enter a valid name, email and WhatsApp number." },
        { status: 400 },
      );
    }

    if (!packagePrices[extension] || !validDomain(domain) || !domain.endsWith(extension)) {
      return Response.json(
        { error: "Choose a valid .com, .org or .net domain." },
        { status: 400 },
      );
    }

    if (!acceptedTerms) {
      return Response.json(
        { error: "You must accept the registration and refund terms." },
        { status: 400 },
      );
    }

    const { url, headers } = supabaseConnection();
    const paymentMode = currentPaymentMode();
    const duplicateUrl = new URL(`${url}/rest/v1/orders`);
    duplicateUrl.searchParams.set("select", "reference,status");
    duplicateUrl.searchParams.set("email", `eq.${email}`);
    duplicateUrl.searchParams.set("domain", `eq.${domain}`);
    duplicateUrl.searchParams.set("payment_mode", `eq.${paymentMode}`);
    duplicateUrl.searchParams.set("limit", "1");

    const duplicateResponse = await fetch(duplicateUrl, {
      headers,
      cache: "no-store",
    });

    if (!duplicateResponse.ok) {
      throw new Error(`Supabase lookup failed: HTTP ${duplicateResponse.status}`);
    }

    const existing = (await duplicateResponse.json()) as Array<{
      reference: string;
      status: string;
    }>;

    if (existing[0]) {
      return Response.json({ order: existing[0], duplicate: true });
    }

    const registration = await checkDomain(domain);
    if (registration === "registered") return Response.json({ error: "This domain is already registered. Try another name or extension." }, { status: 409 });
    if (registration === "unknown") return Response.json({ error: "We could not check the domain registry right now. Please try again shortly; no request was saved." }, { status: 503 });

    const id = crypto.randomUUID();
    const reference = `EMT-${Date.now().toString(36).toUpperCase()}-${id.slice(0, 13).toUpperCase()}`;
    const now = new Date().toISOString();

    const insertResponse = await fetch(`${url}/rest/v1/orders`, {
      method: "POST",
      headers: { ...headers, Prefer: "return=representation" },
      body: JSON.stringify({
        id,
        reference,
        full_name: fullName,
        email,
        phone,
        domain,
        extension,
        amount_usd_cents: packagePrices[extension],
        payment_mode: paymentMode,
        status: "awaiting_review",
        terms_accepted_at: now,
        updated_at: now,
      }),
    });

    if (!insertResponse.ok) {
      throw new Error(`Supabase insert failed: HTTP ${insertResponse.status}`);
    }

    const [order] = (await insertResponse.json()) as Array<{
      reference: string;
      status: string;
    }>;

    return Response.json({ order }, { status: 201 });
  } catch (error) {
    console.error("Order submission failed", error);
    return Response.json(
      { error: "We could not save your request. Please try again." },
      { status: 500 },
    );
  }
}
