import { jsonError, originOk } from "@/lib/auth/helpers";
import { requireAdmin } from "@/lib/auth/session";
import { listAllShareRewards, approveShareReward, rejectShareReward } from "@/lib/db/share-rewards";

export const runtime = "nodejs";

export async function GET(request: Request) {
  try {
    await requireAdmin();
  } catch {
    return jsonError("Access denied.", 403);
  }

  const { searchParams } = new URL(request.url);
  const status = searchParams.get("status") || undefined;

  try {
    const rewards = await listAllShareRewards(status);
    return Response.json({ rewards });
  } catch {
    return jsonError("Something went wrong. Please try again.", 500);
  }
}

export async function PATCH(request: Request) {
  if (!originOk(request)) return jsonError("Invalid request.", 403);

  let admin;
  try {
    admin = await requireAdmin();
  } catch {
    return jsonError("Access denied.", 403);
  }

  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return jsonError("Invalid request body.", 400);
  }

  const rewardId = String(body.rewardId || "").trim();
  const action = String(body.action || "").trim();
  const reason = String(body.reason || "").trim();

  if (!rewardId || !action) {
    return jsonError("rewardId and action are required.", 400);
  }

  try {
    if (action === "approve_5") {
      const result = await approveShareReward(rewardId, admin.id, "STORY_5");
      if (!result.ok) return jsonError(result.error, 400);
      return Response.json({ ok: true, couponCode: result.couponCode });
    }

    if (action === "approve_10") {
      const result = await approveShareReward(rewardId, admin.id, "STORY_AND_POST_10");
      if (!result.ok) return jsonError(result.error, 400);
      return Response.json({ ok: true, couponCode: result.couponCode });
    }

    if (action === "reject") {
      if (!reason) {
        return jsonError("Rejection reason is required.", 400);
      }
      const result = await rejectShareReward(rewardId, admin.id, reason);
      if (!result.ok) return jsonError(result.error, 400);
      return Response.json({ ok: true });
    }

    return jsonError("Invalid action.", 400);
  } catch {
    return jsonError("Something went wrong. Please try again.", 500);
  }
}
