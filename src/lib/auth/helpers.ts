import { ensureAdminUser } from "@/lib/db/users";

export async function ensureAdmin() {
  await ensureAdminUser();
}

export function jsonError(message: string, status: number) {
  return Response.json({ error: message }, { status });
}

/**
 * Same-origin check for mutating requests.
 * Falls back to Referer header when Origin is missing (some legitimate
 * clients omit Origin but include Referer).
 * */
export function originOk(request: Request) {
  if (request.method === "GET" || request.method === "HEAD") return true;
  const origin = request.headers.get("origin");
  if (origin) {
    const host = request.headers.get("host");
    try {
      return new URL(origin).host === host;
    } catch {
      return false;
    }
  }
  const referer = request.headers.get("referer");
  if (referer) {
    const host = request.headers.get("host");
    try {
      return new URL(referer).host === host;
    } catch {
      return false;
    }
  }
  if (process.env.NODE_ENV === "production") {
    return false;
  }
  return true;
}
