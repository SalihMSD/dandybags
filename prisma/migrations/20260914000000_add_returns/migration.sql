-- CreateEnum
CREATE TYPE "ReturnStatus" AS ENUM ('REQUESTED', 'APPROVED', 'REJECTED', 'COMPLETED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "ReturnResolution" AS ENUM ('REFUND', 'REPLACE', 'EXCHANGE');

-- CreateTable
CREATE TABLE "return_requests" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "status" "ReturnStatus" NOT NULL DEFAULT 'REQUESTED',
    "resolution" "ReturnResolution" NOT NULL,
    "reason" TEXT NOT NULL,
    "note" TEXT,
    "refundAmount" INTEGER,
    "refundId" TEXT,
    "exchangeVariantSku" TEXT,
    "adminNote" TEXT,
    "processedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "return_requests_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "return_request_items" (
    "id" TEXT NOT NULL,
    "returnRequestId" TEXT NOT NULL,
    "sku" TEXT NOT NULL,
    "qty" INTEGER NOT NULL,
    "condition" TEXT,
    "reason" TEXT,

    CONSTRAINT "return_request_items_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "return_requests_orderId_idx" ON "return_requests"("orderId");
CREATE INDEX "return_requests_userId_idx" ON "return_requests"("userId");
CREATE INDEX "return_requests_status_idx" ON "return_requests"("status");
CREATE INDEX "return_requests_resolution_idx" ON "return_requests"("resolution");
CREATE UNIQUE INDEX "return_requests_refundId_key" ON "return_requests"("refundId");
CREATE INDEX "return_request_items_returnRequestId_idx" ON "return_request_items"("returnRequestId");
CREATE INDEX "return_request_items_sku_idx" ON "return_request_items"("sku");

-- AddForeignKey
ALTER TABLE "return_requests" ADD CONSTRAINT "return_requests_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "return_requests" ADD CONSTRAINT "return_requests_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "return_requests" ADD CONSTRAINT "return_requests_refundId_fkey" FOREIGN KEY ("refundId") REFERENCES "refunds"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "return_request_items" ADD CONSTRAINT "return_request_items_returnRequestId_fkey" FOREIGN KEY ("returnRequestId") REFERENCES "return_requests"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "return_request_items" ADD CONSTRAINT "return_request_items_sku_fkey" FOREIGN KEY ("sku") REFERENCES "products"("sku") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Extend NotificationType enum with new return-related notification types
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'NotificationType') THEN
        CREATE TYPE "NotificationType" AS ENUM ('NEW_ORDER', 'REFUND_SUCCEEDED', 'REFUND_FAILED', 'RETURN_REQUESTED', 'RETURN_APPROVED', 'RETURN_REJECTED');
    ELSE
        IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE typname = 'NotificationType' AND enumlabel = 'RETURN_REQUESTED') THEN
            ALTER TYPE "NotificationType" ADD VALUE 'RETURN_REQUESTED';
        END IF;
        IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE typname = 'NotificationType' AND enumlabel = 'RETURN_REJECTED') THEN
            ALTER TYPE "NotificationType" ADD VALUE 'RETURN_REJECTED';
        END IF;
        IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE typname = 'NotificationType' AND enumlabel = 'RETURN_APPROVED') THEN
            ALTER TYPE "NotificationType" ADD VALUE 'RETURN_APPROVED';
        END IF;
    END IF;
END $$;