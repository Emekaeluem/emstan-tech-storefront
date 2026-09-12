import { checkDomain, validDomain } from "@/lib/domain-availability";

export async function GET(request: Request) {
  const domain = new URL(request.url).searchParams.get("domain")?.trim().toLowerCase() || "";
  if (!validDomain(domain)) return Response.json({ error: "Enter a valid .com, .org or .net domain." }, { status: 400 });
  const status = await checkDomain(domain);
  return Response.json({ domain, status }, { headers: { "Cache-Control": "no-store" } });
}
