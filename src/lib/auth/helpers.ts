import { ensureAdminUser } from "@/lib/db/users";

export async function ensureAdmin() {
  await ensureAdminUser();
}

export function jsonError(message: string, status: number) {
  return Response.json({ error: message }, { status });
}

/**
 * Same-origin check for mutating requests.
 * Known limitation (unchanged in E3): requests with no Origin header are allowed.
 */
export function originOk(request: Request) {
  if (request.method === "GET" || request.method === "HEAD") return true;
  const origin = request.headers.get("origin");
  if (!origin) return true;
  const host = request.headers.get("host");
  try {
    return new URL(origin).host === host;
  } catch {
    return false;
  }
}
