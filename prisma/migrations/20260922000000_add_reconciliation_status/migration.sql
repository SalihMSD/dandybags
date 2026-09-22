-- Add RECONCILIATION_REQUIRED status for shipments where createOrder
-- may have succeeded on the Shiprocket side but the response was lost.
-- This status prevents blind retries that could create duplicate orders.
ALTER TYPE "ShipmentStatus" ADD VALUE 'RECONCILIATION_REQUIRED';
