-- CreateEnum
CREATE TYPE "CouponDiscountType" AS ENUM ('PERCENTAGE', 'FIXED');

-- CreateEnum
CREATE TYPE "CouponStatus" AS ENUM ('ACTIVE', 'USED', 'EXPIRED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "ShareRewardType" AS ENUM ('STORY_5', 'STORY_AND_POST_10');

-- CreateEnum
CREATE TYPE "ShareRewardStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

-- CreateTable
CREATE TABLE "coupons" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "discountType" "CouponDiscountType" NOT NULL,
    "discountValue" DECIMAL(10,2) NOT NULL,
    "minimumOrderValue" DECIMAL(10,2),
    "maximumDiscount" DECIMAL(10,2),
    "usageLimit" INTEGER NOT NULL DEFAULT 1,
    "usedCount" INTEGER NOT NULL DEFAULT 0,
    "validFrom" TIMESTAMP(3) NOT NULL,
    "validUntil" TIMESTAMP(3) NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "userId" TEXT,
    "status" "CouponStatus" NOT NULL DEFAULT 'ACTIVE',
    "usedAt" TIMESTAMP(3),
    "shareRewardId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "coupons_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "coupons_code_key" ON "coupons"("code");

-- CreateIndex
CREATE INDEX "coupons_code_idx" ON "coupons"("code");

-- CreateIndex
CREATE INDEX "coupons_userId_idx" ON "coupons"("userId");

-- CreateIndex
CREATE INDEX "coupons_status_idx" ON "coupons"("status");

-- AddForeignKey
ALTER TABLE "coupons" ADD CONSTRAINT "coupons_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- CreateTable
CREATE TABLE "share_rewards" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "rewardType" "ShareRewardType" NOT NULL,
    "status" "ShareRewardStatus" NOT NULL DEFAULT 'PENDING',
    "storyProofUrl" TEXT,
    "postProofUrl" TEXT,
    "instagramUsername" TEXT NOT NULL,
    "taggedAccount" TEXT NOT NULL DEFAULT '@dandybagsonline.in',
    "submittedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "reviewedAt" TIMESTAMP(3),
    "reviewedBy" TEXT,
    "couponId" TEXT,
    "rejectionReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "share_rewards_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "share_rewards_userId_idx" ON "share_rewards"("userId");

-- CreateIndex
CREATE INDEX "share_rewards_orderId_idx" ON "share_rewards"("orderId");

-- CreateIndex
CREATE INDEX "share_rewards_status_idx" ON "share_rewards"("status");

-- CreateIndex
CREATE UNIQUE INDEX "share_rewards_couponId_key" ON "share_rewards"("couponId");

-- AddForeignKey
ALTER TABLE "share_rewards" ADD CONSTRAINT "share_rewards_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "share_rewards" ADD CONSTRAINT "share_rewards_couponId_fkey" FOREIGN KEY ("couponId") REFERENCES "coupons"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Migrate existing product images: set sideImage3 and sideImage4
UPDATE "products"
SET "imageRight" = "imageBack",
    "imageTop" = "imageLeft"
WHERE "imageRight" IS NULL AND "imageTop" IS NULL;
