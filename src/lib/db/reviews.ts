import { prisma } from "@/lib/db/prisma";

export type ReviewWithUser = {
  id: string;
  productSku: string;
  userId: string;
  rating: number;
  title: string;
  comment: string;
  verifiedPurchase: boolean;
  status: "PENDING" | "APPROVED" | "HIDDEN";
  helpfulCount: number;
  createdAt: string;
  updatedAt: string;
  user: {
    id: string;
    fullName: string;
  };
};

export type ReviewSummary = {
  averageRating: number;
  totalReviews: number;
  breakdown: {
    5: number;
    4: number;
    3: number;
    2: number;
    1: number;
  };
};

export type CreateReviewInput = {
  productSku: string;
  userId: string;
  rating: number;
  title: string;
  comment: string;
};

export async function createReview(input: CreateReviewInput): Promise<{ ok: true; reviewId: string } | { ok: false; error: string }> {
  const { productSku, userId, rating, title, comment } = input;

  if (rating < 1 || rating > 5) {
    return { ok: false, error: "Rating must be between 1 and 5." };
  }

  const trimmedTitle = title.trim();
  const trimmedComment = comment.trim();
  if (trimmedTitle.length < 3 || trimmedTitle.length > 120) {
    return { ok: false, error: "Title must be between 3 and 120 characters." };
  }
  if (trimmedComment.length < 10 || trimmedComment.length > 2000) {
    return { ok: false, error: "Comment must be between 10 and 2000 characters." };
  }

  const product = await prisma.product.findUnique({
    where: { sku: productSku },
    select: { sku: true },
  });
  if (!product) {
    return { ok: false, error: "Product not found." };
  }

  const existing = await prisma.review.findUnique({
    where: {
      productSku_userId: {
        productSku,
        userId,
      },
    },
  });
  if (existing) {
    return { ok: false, error: "You have already reviewed this product." };
  }

  const verifiedPurchase = await checkVerifiedPurchase(userId, productSku);

  const review = await prisma.review.create({
    data: {
      id: crypto.randomUUID(),
      productSku,
      userId,
      rating,
      title: trimmedTitle,
      comment: trimmedComment,
      verifiedPurchase,
    } as Parameters<typeof prisma.review.create>[0]["data"],
    select: { id: true },
  });

  return { ok: true, reviewId: review.id };
}

export async function getApprovedReviews(productSku: string, page = 1, pageSize = 10, sort: "newest" | "highest" | "lowest" | "helpful" = "newest") {
  const skip = (page - 1) * pageSize;
  const where = { productSku, status: "APPROVED" as const };

  const orderBy: Record<string, unknown> = {};
  switch (sort) {
    case "newest":
      orderBy.createdAt = "desc";
      break;
    case "highest":
      orderBy.rating = "desc";
      break;
    case "lowest":
      orderBy.rating = "asc";
      break;
    case "helpful":
      orderBy.helpfulCount = "desc";
      break;
    default:
      orderBy.createdAt = "desc";
  }

  const [reviews, total] = await Promise.all([
    prisma.review.findMany({
      where,
      include: {
        user: {
          select: {
            id: true,
            fullName: true,
          },
        },
      },
      orderBy,
      skip,
      take: pageSize,
    }),
    prisma.review.count({ where }),
  ]);

  return {
    reviews: reviews.map((r) => ({
      id: r.id,
      productSku: r.productSku,
      userId: r.userId,
      rating: r.rating,
      title: r.title,
      comment: r.comment,
      verifiedPurchase: r.verifiedPurchase,
      status: r.status,
      helpfulCount: r.helpfulCount,
      createdAt: r.createdAt.toISOString(),
      updatedAt: r.updatedAt.toISOString(),
      user: r.user,
    })),
    total,
    page,
    pageSize,
    totalPages: Math.ceil(total / pageSize),
  };
}

export async function getReviewSummary(productSku: string): Promise<ReviewSummary | null> {
  const reviews = await prisma.review.findMany({
    where: { productSku, status: "APPROVED" },
    select: { rating: true },
  });

  if (reviews.length === 0) {
    return {
      averageRating: 0,
      totalReviews: 0,
      breakdown: { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 },
    };
  }

  const breakdown = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 } as { 1: number; 2: number; 3: number; 4: number; 5: number };
  let sum = 0;
  for (const r of reviews) {
    const ratingKey = Math.min(5, Math.max(1, r.rating)) as 1 | 2 | 3 | 4 | 5;
    breakdown[ratingKey] = (breakdown[ratingKey] || 0) + 1;
    sum += r.rating;
  }

  return {
    averageRating: Math.round((sum / reviews.length) * 10) / 10,
    totalReviews: reviews.length,
    breakdown,
  };
}

export async function checkVerifiedPurchase(userId: string, productSku: string): Promise<boolean> {
  const order = await prisma.order.findFirst({
    where: {
      userId,
      paymentStatus: "PAID",
      items: {
        some: {
          sku: productSku,
        },
      },
    },
    select: { id: true },
  });

  return Boolean(order);
}

export async function getCustomerReview(productSku: string, userId: string) {
  const review = await prisma.review.findUnique({
    where: {
      productSku_userId: {
        productSku,
        userId,
      },
    },
    select: {
      id: true,
      rating: true,
      title: true,
      comment: true,
      verifiedPurchase: true,
      status: true,
      helpfulCount: true,
      createdAt: true,
      updatedAt: true,
    },
  });
  return review;
}

export async function updateReview(reviewId: string, userId: string, input: { rating: number; title: string; comment: string }): Promise<{ ok: true } | { ok: false; error: string }> {
  const existing = await prisma.review.findUnique({
    where: { id: reviewId },
    select: { id: true, userId: true, status: true },
  });

  if (!existing) {
    return { ok: false, error: "Review not found." };
  }

  if (existing.userId !== userId) {
    return { ok: false, error: "You cannot edit this review." };
  }

  const rating = Math.min(5, Math.max(1, input.rating));
  const trimmedTitle = input.title.trim();
  const trimmedComment = input.comment.trim();

  if (trimmedTitle.length < 3 || trimmedTitle.length > 120) {
    return { ok: false, error: "Title must be between 3 and 120 characters." };
  }
  if (trimmedComment.length < 10 || trimmedComment.length > 2000) {
    return { ok: false, error: "Comment must be between 10 and 2000 characters." };
  }

  await prisma.review.update({
    where: { id: reviewId },
    data: {
      rating,
      title: trimmedTitle,
      comment: trimmedComment,
      status: "PENDING",
    },
  });

  return { ok: true };
}

export async function getOrderReviewStatus(userId: string, orderId: string) {
  const order = await prisma.order.findFirst({
    where: { id: orderId, userId, paymentStatus: "PAID" },
    include: {
      items: {
        select: { sku: true, name: true, qty: true, image: true },
        orderBy: { sku: "asc" },
      },
    },
  });

  if (!order) {
    return null;
  }

  const skus = order.items.map((i) => i.sku);
  const reviews = await prisma.review.findMany({
    where: {
      productSku: { in: skus },
      userId,
    },
    select: { productSku: true, status: true, id: true },
  });

  const reviewMap = new Map(reviews.map((r) => [r.productSku, r]));

  return {
    orderId: order.id,
    items: order.items.map((item) => {
      const review = reviewMap.get(item.sku);
      return {
        sku: item.sku,
        name: item.name,
        qty: item.qty,
        image: item.image,
        reviewStatus: review?.status ?? "NOT_REVIEWED",
        reviewId: review?.id ?? null,
      };
    }),
  };
}

export async function toggleHelpful(reviewId: string, userId: string): Promise<{ ok: boolean; helpfulCount: number; action: "added" | "removed" }> {
  const review = await prisma.review.findUnique({
    where: { id: reviewId },
    select: { id: true, helpfulCount: true },
  });
  if (!review) {
    return { ok: false, helpfulCount: 0, action: "removed" };
  }

  const existing = await prisma.reviewHelpful.findUnique({
    where: {
      reviewId_userId: {
        reviewId,
        userId,
      },
    },
  });

  if (existing) {
    await prisma.reviewHelpful.delete({
      where: {
        reviewId_userId: {
          reviewId,
          userId,
        },
      },
    });
    const updated = await prisma.review.update({
      where: { id: reviewId },
      data: { helpfulCount: { decrement: 1 } },
      select: { helpfulCount: true },
    });
    return { ok: true, helpfulCount: updated.helpfulCount, action: "removed" };
  }

  await prisma.reviewHelpful.create({
    data: {
      id: crypto.randomUUID(),
      reviewId,
      userId,
    } as Parameters<typeof prisma.reviewHelpful.create>[0]["data"],
  });

  const updated = await prisma.review.update({
    where: { id: reviewId },
    data: { helpfulCount: { increment: 1 } },
    select: { helpfulCount: true },
  });

  return { ok: true, helpfulCount: updated.helpfulCount, action: "added" };
}

export async function getAllReviewsForAdmin(page = 1, pageSize = 20, status?: string) {
  const skip = (page - 1) * pageSize;
  const where = status ? { status: status as "PENDING" | "APPROVED" | "HIDDEN" } : {};

  const [reviews, total] = await Promise.all([
    prisma.review.findMany({
      where,
      include: {
        user: {
          select: {
            id: true,
            fullName: true,
            email: true,
          },
        },
        product: {
          select: {
            sku: true,
            name: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
      skip,
      take: pageSize,
    }),
    prisma.review.count({ where }),
  ]);

  return {
    reviews: reviews.map((r) => ({
      id: r.id,
      productSku: r.productSku,
      productName: r.product.name,
      userId: r.userId,
      userName: r.user.fullName,
      userEmail: r.user.email,
      rating: r.rating,
      title: r.title,
      comment: r.comment,
      verifiedPurchase: r.verifiedPurchase,
      status: r.status,
      helpfulCount: r.helpfulCount,
      createdAt: r.createdAt.toISOString(),
      updatedAt: r.updatedAt.toISOString(),
    })),
    total,
    page,
    pageSize,
    totalPages: Math.ceil(total / pageSize),
  };
}

export async function updateReviewStatus(reviewId: string, status: "APPROVED" | "HIDDEN") {
  return prisma.review.update({
    where: { id: reviewId },
    data: { status },
    select: { id: true, status: true },
  });
}

export async function deleteReview(reviewId: string) {
  return prisma.review.delete({
    where: { id: reviewId },
    select: { id: true },
  });
}
