-- CreateEnum
CREATE TYPE "NotificationType" AS ENUM ('NEW_ORDER', 'REFUND_SUCCEEDED', 'REFUND_FAILED');

-- CreateTable
CREATE TABLE "notifications" (
    "id" TEXT NOT NULL,
    "type" "NotificationType" NOT NULL,
    "orderId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "read" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "notifications_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "notifications_orderId_type_key" ON "notifications"("orderId", "type");
CREATE INDEX "notifications_read_createdAt_idx" ON "notifications"("read", "createdAt");
