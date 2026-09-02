import { jsonError } from "@/lib/auth/helpers";
import { requireAdmin } from "@/lib/auth/session";
import { getAdminAnalytics } from "@/lib/db/analytics";

export const runtime = "nodejs";

export async function GET(request: Request) {
  try {
    await requireAdmin();
  } catch {
    return jsonError("Access denied.", 403);
  }

  const { searchParams } = new URL(request.url);
  const start = searchParams.get("start") || undefined;
  const end = searchParams.get("end") || undefined;

  try {
    const analytics = await getAdminAnalytics(start || end ? { start, end } : undefined);
    return Response.json(analytics);
  } catch {
    return jsonError("Something went wrong. Please try again.", 500);
  }
}
