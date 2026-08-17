import { jsonError } from "@/lib/auth/helpers";
import { requireAdmin } from "@/lib/auth/session";
import { getAdminOverview } from "@/lib/db/admin";

export const runtime = "nodejs";

export async function GET() {
  try {
    await requireAdmin();
  } catch {
    return jsonError("Access denied.", 403);
  }

  try {
    const overview = await getAdminOverview();
    return Response.json(overview);
  } catch {
    return jsonError("Something went wrong. Please try again.", 500);
  }
}
