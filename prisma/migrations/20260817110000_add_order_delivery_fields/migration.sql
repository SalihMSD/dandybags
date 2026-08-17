-- AlterTable
ALTER TABLE "orders" ADD COLUMN "shippingProvider" TEXT;
ALTER TABLE "orders" ADD COLUMN "trackingNumber" TEXT;
ALTER TABLE "orders" ADD COLUMN "shippedAt" TIMESTAMP(3);
ALTER TABLE "orders" ADD COLUMN "deliveredAt" TIMESTAMP(3);
