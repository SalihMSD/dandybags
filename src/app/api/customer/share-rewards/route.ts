import { jsonError, originOk } from "@/lib/auth/helpers";
import { requireCustomer } from "@/lib/auth/session";
import { createShareReward, listUserShareRewards } from "@/lib/db/share-rewards";

export const runtime = "nodejs";

export async function GET() {
  try {
    const user = await requireCustomer();
    const rewards = await listUserShareRewards(user.id);
    return Response.json({ rewards });
  } catch {
    return jsonError("Please log in.", 401);
  }
}

export async function POST(request: Request) {
  if (!originOk(request)) return jsonError("Invalid request.", 403);

  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return jsonError("Invalid request body.", 400);
  }

  let user;
  try {
    user = await requireCustomer();
  } catch {
    return jsonError("Please log in.", 401);
  }

  const orderId = String(body.orderId || "").trim();
  const rewardType = String(body.rewardType || "").trim() as "STORY_5" | "STORY_AND_POST_10";
  const instagramUsername = String(body.instagramUsername || "").trim();
  const storyProofUrl = String(body.storyProofUrl || "").trim() || undefined;
  const postProofUrl = String(body.postProofUrl || "").trim() || undefined;

  if (!orderId || !rewardType || !instagramUsername) {
    return jsonError("All fields are required.", 400);
  }

  if (!["STORY_5", "STORY_AND_POST_10"].includes(rewardType)) {
    return jsonError("Invalid reward type.", 400);
  }

  if (rewardType === "STORY_AND_POST_10" && !postProofUrl) {
    return jsonError("Post proof is required for Story + Post reward.", 400);
  }

  const result = await createShareReward({
    userId: user.id,
    orderId,
    rewardType,
    instagramUsername,
    storyProofUrl,
    postProofUrl,
  });

  if (!result.ok) {
    return jsonError(result.error, 400);
  }

  return Response.json({ ok: true, rewardId: result.rewardId }, { status: 201 });
}
