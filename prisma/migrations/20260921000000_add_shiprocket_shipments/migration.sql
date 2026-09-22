-- CreateEnum
CREATE TYPE "ShipmentStatus" AS ENUM ('PENDING', 'CREATED', 'AWB_ASSIGNED', 'PICKUP_SCHEDULED', 'PICKED_UP', 'IN_TRANSIT', 'OUT_FOR_DELIVERY', 'DELIVERED', 'NDR', 'RTO', 'CANCELLED', 'FAILED');

-- CreateTable
CREATE TABLE "shipments" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "provider" TEXT NOT NULL DEFAULT 'SHIPROCKET',
    "providerOrderId" TEXT,
    "providerShipmentId" TEXT,
    "awb" TEXT,
    "courierName" TEXT,
    "status" "ShipmentStatus" NOT NULL DEFAULT 'PENDING',
    "trackingUrl" TEXT,
    "shippingCost" DECIMAL(10,2),
    "labelUrl" TEXT,
    "pickupScheduledAt" TIMESTAMP(3),
    "shippedAt" TIMESTAMP(3),
    "deliveredAt" TIMESTAMP(3),
    "cancelledAt" TIMESTAMP(3),
    "failureReason" TEXT,
    "idempotencyKey" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "shipments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "shipment_events" (
    "id" TEXT NOT NULL,
    "shipmentId" TEXT NOT NULL,
    "status" "ShipmentStatus" NOT NULL,
    "rawStatus" TEXT NOT NULL,
    "activity" TEXT,
    "location" TEXT,
    "note" TEXT,
    "occurredAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "shipment_events_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "shipments_orderId_key" ON "shipments"("orderId");
CREATE UNIQUE INDEX "shipments_providerOrderId_key" ON "shipments"("providerOrderId");
CREATE UNIQUE INDEX "shipments_awb_key" ON "shipments"("awb");
CREATE UNIQUE INDEX "shipments_idempotencyKey_key" ON "shipments"("idempotencyKey");
CREATE INDEX "shipments_status_idx" ON "shipments"("status");
CREATE INDEX "shipments_providerOrderId_idx" ON "shipments"("providerOrderId");
CREATE INDEX "shipments_awb_idx" ON "shipments"("awb");
CREATE INDEX "shipment_events_shipmentId_occurredAt_idx" ON "shipment_events"("shipmentId", "occurredAt");
CREATE INDEX "shipment_events_status_occurredAt_idx" ON "shipment_events"("status", "occurredAt");

-- AddForeignKey
ALTER TABLE "shipments" ADD CONSTRAINT "shipments_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "orders"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "shipment_events" ADD CONSTRAINT "shipment_events_shipmentId_fkey" FOREIGN KEY ("shipmentId") REFERENCES "shipments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddColumn
ALTER TABLE "orders" ADD COLUMN "shipEmail" TEXT;
ALTER TABLE "orders" ADD COLUMN "shipCountry" TEXT NOT NULL DEFAULT 'India';
