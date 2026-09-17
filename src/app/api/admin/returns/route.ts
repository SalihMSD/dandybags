import { jsonError } from "@/lib/auth/helpers";
import { requireAdmin } from "@/lib/auth/session";
import { getAdminReturns } from "@/lib/db/returns";

export const runtime = "nodejs";

export async function GET(request: Request) {
  try {
    await requireAdmin();
  } catch {
    return jsonError("Access denied.", 403);
  }

  const { searchParams } = new URL(request.url);

  const result = await getAdminReturns({
    status: searchParams.get("status") || undefined,
    resolution: searchParams.get("resolution") || undefined,
    page: searchParams.get("page") ? Number(searchParams.get("page")) : undefined,
    pageSize: searchParams.get("pageSize") ? Number(searchParams.get("pageSize")) : undefined,
  });

  return Response.json(result);
}
