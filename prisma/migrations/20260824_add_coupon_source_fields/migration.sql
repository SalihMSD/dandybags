-- AlterTable
ALTER TABLE "coupons" ADD COLUMN "sourceOrderId" TEXT;
ALTER TABLE "coupons" ADD COLUMN "sourceBillAmount" DECIMAL(10,2);
ALTER TABLE "coupons" ADD COLUMN "rewardPercentage" INTEGER;
