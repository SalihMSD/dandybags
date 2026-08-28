import { prisma } from "@/lib/db/prisma";
import { newId } from "@/lib/db/store";

export type ShareReward = {
  id: string;
  userId: string;
  orderId: string;
  rewardType: "STORY_5" | "STORY_AND_POST_10";
  status: "PENDING" | "APPROVED" | "REJECTED";
  storyProofUrl: string | null;
  postProofUrl: string | null;
  instagramUsername: string;
  taggedAccount: string;
  submittedAt: string;
  reviewedAt: string | null;
  reviewedBy: string | null;
  couponId: string | null;
  rejectionReason: string | null;
  createdAt: string;
  updatedAt: string;
};

export async function createShareReward(input: {
  userId: string;
  orderId: string;
  rewardType: "STORY_5" | "STORY_AND_POST_10";
  instagramUsername: string;
  storyProofUrl?: string;
  postProofUrl?: string;
}): Promise<{ ok: true; rewardId: string } | { ok: false; error: string }> {
  const order = await prisma.order.findFirst({
    where: { id: input.orderId, userId: input.userId, paymentStatus: "PAID" },
    select: { id: true },
  });

  if (!order) {
    return { ok: false, error: "Order not found or not eligible." };
  }

  const existing = await prisma.shareReward.findFirst({
    where: { orderId: input.orderId, userId: input.userId },
  });

  if (existing) {
    return { ok: false, error: "You have already submitted a reward for this order." };
  }

  const reward = await prisma.shareReward.create({
    data: {
      id: newId("shr"),
      userId: input.userId,
      orderId: input.orderId,
      rewardType: input.rewardType,
      instagramUsername: input.instagramUsername,
      storyProofUrl: input.storyProofUrl || null,
      postProofUrl: input.postProofUrl || null,
    },
    select: { id: true },
  });

  return { ok: true, rewardId: reward.id };
}

export async function listUserShareRewards(userId: string) {
  const rewards = await prisma.shareReward.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
  });

  return rewards.map((r) => ({
    id: r.id,
    userId: r.userId,
    orderId: r.orderId,
    rewardType: r.rewardType,
    status: r.status,
    storyProofUrl: r.storyProofUrl,
    postProofUrl: r.postProofUrl,
    instagramUsername: r.instagramUsername,
    taggedAccount: r.taggedAccount,
    submittedAt: r.submittedAt.toISOString(),
    reviewedAt: r.reviewedAt?.toISOString() ?? null,
    reviewedBy: r.reviewedBy,
    couponId: r.couponId,
    rejectionReason: r.rejectionReason,
    createdAt: r.createdAt.toISOString(),
    updatedAt: r.updatedAt.toISOString(),
  }));
}

export async function listAllShareRewards(status?: string) {
  const where = status ? { status: status as "PENDING" | "APPROVED" | "REJECTED" } : {};
  const rewards = await prisma.shareReward.findMany({
    where,
    include: {
      user: { select: { id: true, fullName: true, email: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  const orderIds = [...new Set(rewards.map((r) => r.orderId))];
  const orders = orderIds.length
    ? await prisma.order.findMany({
        where: { id: { in: orderIds } },
        select: { id: true, paymentStatus: true, items: { select: { qty: true, unitPrice: true } } },
      })
    : [];
  const orderMap = new Map(orders.map((o) => [o.id, o]));

  return rewards.map((r) => {
    const order = orderMap.get(r.orderId);
    const sourceBillAmount = order?.items.reduce((sum, item) => sum + Number(item.unitPrice) * item.qty, 0) ?? 0;
    return {
      id: r.id,
      userId: r.userId,
      userName: r.user.fullName,
      userEmail: r.user.email,
      orderId: r.orderId,
      rewardType: r.rewardType,
      status: r.status,
      storyProofUrl: r.storyProofUrl,
      postProofUrl: r.postProofUrl,
      instagramUsername: r.instagramUsername,
      taggedAccount: r.taggedAccount,
      submittedAt: r.submittedAt.toISOString(),
      reviewedAt: r.reviewedAt?.toISOString() ?? null,
      reviewedBy: r.reviewedBy,
      couponId: r.couponId,
      rejectionReason: r.rejectionReason,
      createdAt: r.createdAt.toISOString(),
      updatedAt: r.updatedAt.toISOString(),
      sourceBillAmount,
      orderPaymentStatus: order?.paymentStatus ?? null,
    };
  });
}

export async function approveShareReward(rewardId: string, reviewerId: string, rewardType: "STORY_5" | "STORY_AND_POST_10") {
  const reward = await prisma.shareReward.findUnique({
    where: { id: rewardId },
  });

  if (!reward) {
    return { ok: false as const, error: "Reward not found." };
  }

  if (reward.status !== "PENDING") {
    return { ok: false as const, error: "This reward has already been processed." };
  }

  if (reward.rewardType !== rewardType) {
    return { ok: false as const, error: "Reward type mismatch." };
  }

  const order = await prisma.order.findFirst({
    where: { id: reward.orderId, userId: reward.userId, paymentStatus: "PAID" },
    select: { id: true, totalLabel: true, items: { select: { qty: true, unitPrice: true } } },
  });

  if (!order) {
    return { ok: false as const, error: "Eligible paid order not found." };
  }

  const rewardPercentage = rewardType === "STORY_5" ? 5 : 10;
  const sourceBillAmount = order.items.reduce((sum, item) => sum + Number(item.unitPrice) * item.qty, 0);
  const discountValue = Math.round(sourceBillAmount * (rewardPercentage / 100));
  const code = `${rewardPercentage === 5 ? "DANDY5" : "DANDY10"}-${newId("cpn").slice(-5).toUpperCase()}`;

  const coupon = await prisma.coupon.create({
    data: {
      id: newId("cpn"),
      code,
      discountType: "FIXED",
      discountValue,
      usageLimit: 1,
      validFrom: new Date(),
      validUntil: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      userId: reward.userId,
      isActive: true,
      status: "ACTIVE",
      sourceOrderId: order.id,
      sourceBillAmount,
      rewardPercentage,
    },
  });

  const updated = await prisma.shareReward.update({
    where: { id: rewardId },
    data: {
      status: "APPROVED",
      reviewedAt: new Date(),
      reviewedBy: reviewerId,
      couponId: coupon.id,
    },
    select: { id: true, couponId: true },
  });

  return { ok: true as const, rewardId: updated.id, couponId: updated.couponId, couponCode: code };
}

export async function rejectShareReward(rewardId: string, reviewerId: string, reason: string) {
  const reward = await prisma.shareReward.findUnique({
    where: { id: rewardId },
  });

  if (!reward) {
    return { ok: false as const, error: "Reward not found." };
  }

  if (reward.status !== "PENDING") {
    return { ok: false as const, error: "This reward has already been processed." };
  }

  await prisma.shareReward.update({
    where: { id: rewardId },
    data: {
      status: "REJECTED",
      reviewedAt: new Date(),
      reviewedBy: reviewerId,
      rejectionReason: reason,
    },
    select: { id: true },
  });

  return { ok: true as const };
}
