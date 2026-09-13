export function supabaseRestConnection(table: string) {
  const projectUrl = process.env.SUPABASE_URL?.trim().replace(/\/$/, "");
  const key = (
    process.env.SUPABASE_SECRET_KEY ||
    process.env.SUPABASE_SERVICE_ROLE_KEY
  )?.trim();

  if (!projectUrl || !key) {
    throw new Error("Supabase environment variables are missing.");
  }

  const headers: Record<string, string> = {
    apikey: key,
    "Content-Type": "application/json",
  };

  // New sb_secret_ keys are API keys, not JWTs. Sending one as a Bearer token
  // makes PostgREST try to decode it as a JWT. Legacy service_role keys are
  // JWTs and still need the Authorization header.
  if (key.startsWith("eyJ") && key.split(".").length === 3) {
    headers.Authorization = `Bearer ${key}`;
  }

  return {
    url: `${projectUrl}/rest/v1/${table}`,
    headers,
  };
}
