export type DomainStatus = "registered" | "no_record" | "unknown";

// IANA's RDAP bootstrap lists these authoritative registry services for the
// three TLDs we sell. Keep the hostnames fixed: never fetch a user-supplied URL.
const rdapBase: Record<string, string> = {
  com: "https://rdap.verisign.com/com/v1/domain/",
  net: "https://rdap.verisign.com/net/v1/domain/",
  org: "https://rdap.publicinterestregistry.org/rdap/domain/",
};

export function validDomain(domain: string): boolean {
  const match = /^([a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?)\.(com|org|net)$/i.exec(domain);
  return !!match && match[1].length >= 2 && domain.length <= 253;
}

export async function checkDomain(domain: string): Promise<DomainStatus> {
  const name = domain.toLowerCase();
  if (!validDomain(name)) throw new Error("Invalid domain");
  const tld = name.split(".").at(-1)!;
  try {
    const response = await fetch(`${rdapBase[tld]}${encodeURIComponent(name)}`, {
      headers: { Accept: "application/rdap+json, application/json" },
      signal: AbortSignal.timeout(6500),
      cache: "no-store",
    });
    if (response.status === 404) return "no_record";
    if (!response.ok) return "unknown";
    const record = await response.json() as { objectClassName?: string; ldhName?: string };
    return record.objectClassName === "domain" && record.ldhName?.toLowerCase() === name
      ? "registered" : "unknown";
  } catch (error) {
    console.error("Registry RDAP lookup failed", name, error);
    return "unknown";
  }
}
