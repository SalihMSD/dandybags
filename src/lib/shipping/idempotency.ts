import type { PrismaClient } from "@prisma/client";
import { ShiprocketError } from "@/lib/shiprocket/errors";
import { isShipmentCancelable } from "@/lib/shipping/status";

export type CreateShipmentResult =
  | { ok: true; shipmentId: string; providerOrderId: string | null; action: "created" | "reconciled" | "existing" }
  | { ok: false; error: string; action: "no_eligible_order" | "shipment_exists" | "failed" };

type TxLike = {
    shipment: {
    findFirst: (args: unknown) => Promise<{ id: string; providerOrderId: string | null; awb: string | null; status: string } | null>;
    create: (args: unknown) => Promise<{ id: string; providerOrderId: string | null }>;
    update: (args: unknown) => Promise<{ id: string; providerOrderId: string | null }>;
    updateMany: (args: unknown) => Promise<{ count: number }>;
  };
  shipmentEvent: {
    findFirst: (args: unknown) => Promise<{ id: string } | null>;
    create: (args: unknown) => Promise<{ id: string }>;
  };
  order: {
    findUnique: (args: unknown) => Promise<{ paymentStatus: string; orderStatus: string } | null>;
  };
};

export async function createShipmentWithIdempotency(
  prisma: PrismaClient,
  input: {
    orderId: string;
    provider: string;
    idempotencyKey: string;
    providerOrderId: string | null;
    providerShipmentId: string | null;
    awb: string | null;
    courierName: string | null;
    trackingUrl: string | null;
    shippingCost: number | null;
    labelUrl: string | null;
  },
): Promise<CreateShipmentResult> {
  return prisma.$transaction(async (tx) => {
    const t = tx as unknown as TxLike;

    const existing = await t.shipment.findFirst({
      where: { orderId: input.orderId },
      select: { id: true, providerOrderId: true, awb: true, status: true },
    });

    if (existing) {
      const isCancelable = isShipmentCancelable(existing.status as never);
      if (existing.providerOrderId && existing.providerOrderId !== input.providerOrderId) {
        return {
          ok: false,
          error: `A shipment already exists for order ${input.orderId} with a different providerOrderId`,
          action: "shipment_exists",
        };
      }

      if (existing.awb || existing.providerOrderId) {
        return {
          ok: true,
          shipmentId: existing.id,
          providerOrderId: existing.providerOrderId,
          action: "reconciled",
        };
      }

      if (isCancelable) {
        const updated = await t.shipment.update({
          where: { id: existing.id },
          data: {
            providerOrderId: input.providerOrderId,
            providerShipmentId: input.providerShipmentId,
            awb: input.awb,
            courierName: input.courierName,
            trackingUrl: input.trackingUrl,
            shippingCost: input.shippingCost,
            labelUrl: input.labelUrl,
            idempotencyKey: input.idempotencyKey,
          },
        });
        return {
          ok: true,
          shipmentId: updated.id,
          providerOrderId: updated.providerOrderId,
          action: "reconciled",
        };
      }

      return {
        ok: true,
        shipmentId: existing.id,
        providerOrderId: existing.providerOrderId,
        action: "existing",
      };
    }

    const order = await t.order.findUnique({
      where: { id: input.orderId },
      select: { paymentStatus: true, orderStatus: true },
    });

    if (!order) {
      return {
        ok: false,
        error: `Order ${input.orderId} not found`,
        action: "no_eligible_order",
      };
    }

    if (order.paymentStatus !== "PAID") {
      return {
        ok: false,
        error: `Order ${input.orderId} is not PAID (status: ${order.paymentStatus})`,
        action: "no_eligible_order",
      };
    }

    if (order.orderStatus === "CANCELLED") {
      return {
        ok: false,
        error: `Order ${input.orderId} is ${order.orderStatus} — cannot create shipment`,
        action: "no_eligible_order",
      };
    }

    const shipmentId = input.idempotencyKey;

    try {
      const created = await t.shipment.create({
        data: {
          id: shipmentId,
          orderId: input.orderId,
          provider: input.provider,
          providerOrderId: input.providerOrderId,
          providerShipmentId: input.providerShipmentId,
          awb: input.awb,
          courierName: input.courierName,
          status: "PENDING",
          trackingUrl: input.trackingUrl,
          shippingCost: input.shippingCost,
          labelUrl: input.labelUrl,
          idempotencyKey: input.idempotencyKey,
        },
      });

      return {
        ok: true,
        shipmentId: created.id,
        providerOrderId: created.providerOrderId,
        action: "created",
      };
    } catch (err) {
      if (err instanceof Error && err.message.includes("unique")) {
        const rechecked = await t.shipment.findFirst({
          where: { orderId: input.orderId },
          select: { id: true, providerOrderId: true, status: true },
        });
        if (rechecked) {
          return {
            ok: true,
            shipmentId: rechecked.id,
            providerOrderId: rechecked.providerOrderId,
            action: "reconciled",
          };
        }
      }
      if (err instanceof ShiprocketError) {
        throw err;
      }
      throw new ShiprocketError(`Failed to create shipment: ${err instanceof Error ? err.message : String(err)}`);
    }
  });
}

export async function assignAwbToShipment(
  prisma: PrismaClient,
  orderId: string,
  awb: string,
  courierName: string | null,
  trackingUrl: string | null,
): Promise<{ ok: true } | { ok: false; error: string }> {
  return prisma.$transaction(async (tx) => {
    const t = tx as unknown as TxLike;

    const existing = await t.shipment.findFirst({
      where: { orderId, awb },
      select: { id: true },
    });

    if (existing) {
      return { ok: true };
    }

    const shipment = await t.shipment.findFirst({
      where: { orderId },
      select: { id: true, status: true, awb: true },
    });

    if (!shipment) {
      return { ok: false, error: `No shipment found for order ${orderId}` };
    }

    if (shipment.awb) {
      return { ok: false, error: `Shipment for order ${orderId} already has AWB: ${shipment.awb}` };
    }

    await t.shipment.update({
      where: { id: shipment.id },
      data: {
        awb,
        courierName,
        trackingUrl,
        status: "AWB_ASSIGNED",
      },
    });

    return { ok: true };
  });
}

export async function recordShipmentEvent(
  prisma: PrismaClient,
  input: {
    shipmentId: string;
    status: string;
    rawStatus: string;
    activity?: string | null;
    location?: string | null;
    note?: string | null;
    occurredAt: Date;
    eventId?: string;
  },
): Promise<{ ok: true; eventId: string } | { ok: false; error: string }> {
  return prisma.$transaction(async (tx) => {
    const t = tx as unknown as TxLike;

    const existing = await t.shipmentEvent.findFirst({
      where: {
        shipmentId: input.shipmentId,
        status: input.status as never,
        occurredAt: input.occurredAt,
      },
      select: { id: true },
    });

    if (existing) {
      return { ok: true, eventId: existing.id };
    }

    const event = await t.shipmentEvent.create({
      data: {
        id: input.eventId || `evt_${input.shipmentId}_${Date.now()}`,
        shipmentId: input.shipmentId,
        status: input.status as never,
        rawStatus: input.rawStatus,
        activity: input.activity ?? null,
        location: input.location ?? null,
        note: input.note ?? null,
        occurredAt: input.occurredAt,
      },
    });

    await t.shipment.updateMany({
      where: { id: input.shipmentId, status: { not: input.status as never } },
      data: { status: input.status as never, updatedAt: new Date() },
    });

    return { ok: true, eventId: event.id };
  });
}
