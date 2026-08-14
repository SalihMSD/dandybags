import { destroySession } from "@/lib/auth/session";
import { jsonError, originOk } from "@/lib/auth/helpers";

export const runtime = "nodejs";

export async function POST(request: Request) {
  if (!originOk(request)) return jsonError("Invalid request.", 403);
  await destroySession();
  return Response.json({ ok: true });
}
