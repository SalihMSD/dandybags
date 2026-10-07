import type { PrismaClient
} from "@prisma/client";
import { prisma } from "@/lib/db/prisma";
import { ShiprocketError, ShiprocketTimeoutError, normalizeShiprocketError } from "@/lib/shiprocket/errors";
import type {
  ShiprocketCreateOrderPayload,
  ShiprocketCreateOrderResponse,
  ShiprocketAssignAwbResponse,
  ShiprocketPickupResponse,
  ShiprocketLabelResponse,
  ShiprocketOrderLookupResult,
} from "@/lib/shiprocket/types";
import {
  createOrder,
  assignAWB,
  schedulePickup,
  generateLabel,
  isShiprocketConfigured,
  findOrderByMerchantId,
} from "@/lib/shiprocket/client";
import {
  buildShiprocketPayload,
  type OrderSnapshot,
  type ProductCatalogEntry,
} from "@/lib/shipping/mapper";
import {
  createShipmentWithIdempotency,
  assignAwbToShipment,
  recordShipmentEvent,
} from "@/lib/shipping/idempotency";
import { newId } from "@/lib/db/store";
import { site } from "@/lib/site";

export type ShipmentErrorCode =
  | "NOT_CONFIGURED"
  | "ORDER_NOT_FOUND"
  | "ORDER_NOT_PAID"
  | "ORDER_CANCELLED"
  | "SHIPMENT_EXISTS"
  | "SHIPIMENT_IN_PROGRESS"
  | "INVALID_MEASUREMENTS"
  | "BUILD_PAYLOAD_FAILED"
  | "SHIPROCKET_AUTH_ERROR"
  | "SHIPROCKET_API_ERROR"
  | "SHIPROCKET_TIMEOUT"
  | "SHIPMENT_UPDATE_FAILED"
  | "INTERNAL_ERROR";

export type ShipmentDetail = {
  shipmentId: string;
  status: string;
  providerOrderId: string | null;
  providerShipmentId: string | null;
  awb: string | null;
  courierName: string | null;
  trackingUrl: string | null;
  labelUrl: string | null;
  shippingCost: number | null;
  pickupScheduledAt: string | null;
  failureReason: string | null;
};

export type CreateShipmentResult =
  | {
      ok: true;
      shipment: ShipmentDetail;
      action: "created" | "reconciled";
      message: string;
    }
  | {
      ok: false;
      error: string;
      code: ShipmentErrorCode;
      statusCode: number;
    };

export interface ShipmentDeps {
  prisma: PrismaClient;
  isShiprocketConfigured: () => boolean;
  createOrder: (payload: ShiprocketCreateOrderPayload) => Promise<ShiprocketCreateOrderResponse>;
  assignAWB: (shipmentId: string) => Promise<ShiprocketAssignAwbResponse>;
  schedulePickup: (shipmentIds: string[]) => Promise<ShiprocketPickupResponse>;
  generateLabel: (shipmentId: string) => Promise<ShiprocketLabelResponse>;
  reconcileShirocketOrder: (orderId: string) => Promise<ShiprocketOrderLookupResult | null>;
}

const defaultDeps: ShipmentDeps = {
  prisma,
  isShiprocketConfigured,
  createOrder,
  assignAWB,
  schedulePickup,
  generateLabel,
  reconcileShirocketOrder: findOrderByMerchantId,
};

const RETRYABLE_STATUSES = new Set(["PENDING", "FAILED", "CREATED", "RECONCILIATION_REQUIRED"]);

export function canRetryShipment(status: string): boolean {
  return RETRYABLE_STATUSES.has(status);
}

function sanitizeShiprocketError(err: unknown): string {
  if (err instanceof ShiprocketError) {
    return normalizeShiprocketError(err.message || err.name);
  }
  if (err instanceof Error) {
    return normalizeShiprocketError(err.message);
  }
  return "An unexpected error occurred.";
}

export async function getExistingShipment(
  db: PrismaClient,
  orderId: string,
): Promise<{
  id: string;
  status: string;
  providerOrderId: string | null;
  providerShipmentId: string | null;
  awb: string | null;
  courierName: string | null;
  trackingUrl: string | null;
  labelUrl: string | null;
  shippingCost: unknown;
  pickupScheduledAt: Date | null;
  failureReason: string | null;
} | null> {
  const shipment = await db.shipment.findUnique({
    where: { orderId },
    select: {
      id: true,
      status: true,
      providerOrderId: true,
      providerShipmentId: true,
      awb: true,
      courierName: true,
      trackingUrl: true,
      labelUrl: true,
      shippingCost: true,
      pickupScheduledAt: true,
      failureReason: true,
    },
  });
  if (!shipment) return null;
  return shipment;
}

async function acquireShipmentLock(db: PrismaClient, orderId: string): Promise<void> {
  await db.$executeRaw`SELECT pg_advisory_lock(hashtext(${`shipment:${orderId}`}))`;
}

async function releaseShipmentLock(db: PrismaClient, orderId: string): Promise<void> {
  try {
    await db.$executeRaw`SELECT pg_advisory_unlock(hashtext(${`shipment:${orderId}`}))`;
  } catch {
    // Best-effort unlock — never throw from finally
  }
}

export async function createShipmentForOrder(
  orderId: string,
  deps: ShipmentDeps = defaultDeps,
): Promise<CreateShipmentResult> {
  const { prisma: db } = deps;

  await acquireShipmentLock(db, orderId);
  try {
    return await createShipmentForOrderInner(orderId, deps);
  } finally {
    await releaseShipmentLock(db, orderId);
  }
}

export async function fetchOrderForShipment(
  db: PrismaClient,
  orderId: string,
): Promise<{
  id: string;
  totalLabel: string;
  paymentStatus: string;
  orderStatus: string;
  shipFullName: string;
  shipPhone: string;
  shipEmail: string | null;
  shipLine1: string;
  shipLine2: string;
  shipCity: string;
  shipState: string;
  shipPincode: string;
  shipLandmark: string;
  shipCountry: string;
  items: Array<{
    sku: string;
    name: string;
    qty: number;
    unitPrice: { toString(): string } | null;
  }>;
} | null> {
  const order = await db.order.findUnique({
    where: { id: orderId },
    include: { items: { orderBy: { sku: "asc" } } },
  });
  if (!order) return null;
  return {
    id: order.id,
    totalLabel: order.totalLabel,
    paymentStatus: order.paymentStatus,
    orderStatus: order.orderStatus,
    shipFullName: order.shipFullName,
    shipPhone: order.shipPhone,
    shipEmail: order.shipEmail ?? null,
    shipLine1: order.shipLine1,
    shipLine2: order.shipLine2,
    shipCity: order.shipCity,
    shipState: order.shipState,
    shipPincode: order.shipPincode,
    shipLandmark: order.shipLandmark,
    shipCountry: order.shipCountry,
    items: order.items.map((item) => ({
      sku: item.sku,
      name: item.name,
      qty: item.qty,
      unitPrice: item.unitPrice,
    })),
  };
}

type ProductRow = {
  sku: string;
  name: string;
  category: string;
  weight: string;
  length: string;
  width: string;
  height: string;
};

export async function fetchProductCatalog(
  db: PrismaClient,
  skus: string[],
): Promise<Record<string, ProductRow>> {
  const products = await db.product.findMany({
    where: { sku: { in: skus } },
    select: {
      sku: true,
      name: true,
      category: true,
      weight: true,
      length: true,
      width: true,
      height: true,
    },
  });
  const result: Record<string, ProductRow> = {};
  for (const p of products) {
    result[p.sku] = p;
  }
  return result;
}

async function createShipmentForOrderInner(
  orderId: string,
  deps: ShipmentDeps,
): Promise<CreateShipmentResult> {
  const { prisma: db, isShiprocketConfigured: checkConfigured } = deps;

  // Step 1: Check Shiprocket is configured
  if (!checkConfigured()) {
    return {
      ok: false,
      error: "Shiprocket is not configured. Set SHIPROCKET_EMAIL, SHIPROCKET_PASSWORD, and SHIPROCKET_PICKUP_LOCATION.",
      code: "NOT_CONFIGURED",
      statusCode: 503,
    };
  }

  // Step 2: Fetch order
  const order = await fetchOrderForShipment(db, orderId);
  if (!order) {
    return {
      ok: false,
      error: "Order not found.",
      code: "ORDER_NOT_FOUND",
      statusCode: 404,
    };
  }

  // Step 3: Check order eligibility
  if (order.paymentStatus !== "PAID") {
    return {
      ok: false,
      error: `Order is not PAID (payment status: ${order.paymentStatus}).`,
      code: "ORDER_NOT_PAID",
      statusCode: 400,
    };
  }
  if (order.orderStatus === "CANCELLED") {
    return {
      ok: false,
      error: "Order is CANCELLED. Cannot create a shipment for a cancelled order.",
      code: "ORDER_CANCELLED",
      statusCode: 400,
    };
  }

  // Step 4: Check for existing shipment — duplicate prevention, retry, and resume-from-state
  const existing = await getExistingShipment(db, orderId);
  if (existing) {
    if (existing.providerOrderId && canResumeFromProviderOrder(existing.status)) {
      return resumeFromExistingShipment(orderId, existing, deps);
    }

    if (!canRetryShipment(existing.status)) {
      return {
        ok: false,
        error: `A shipment already exists with status: ${existing.status}.`,
        code: "SHIPMENT_EXISTS",
        statusCode: 409,
      };
    }

    if (existing.status === "RECONCILIATION_REQUIRED") {
      // Reconciliation path: createOrder may have succeeded on Shiprocket's side
      // but the response was lost. Check Shiprocket before re-calling createOrder.
      let lookupResult: ShiprocketOrderLookupResult | null;
      try {
        lookupResult = await deps.reconcileShirocketOrder(orderId);
      } catch {
        return {
          ok: false,
          error: "Unable to reconcile with Shiprocket. Please retry.",
          code: "SHIPROCKET_API_ERROR",
          statusCode: 502,
        };
      }

      if (lookupResult) {
        // Order exists on Shiprocket - persist providerOrderId and resume
        await db.shipment.update({
          where: { id: existing.id },
          data: {
            providerOrderId: lookupResult.providerOrderId,
            providerShipmentId: lookupResult.providerShipmentId,
            awb: lookupResult.awb,
            courierName: lookupResult.courierName,
            status: "CREATED",
          },
        });
        const current = await getExistingShipment(db, orderId);
        if (current && current.providerOrderId) {
          return resumeFromExistingShipment(orderId, current, deps);
        }
      }

      // No order found on Shiprocket - safe to retry createOrder
      await db.shipment.update({
        where: { id: existing.id },
        data: { status: "PENDING" },
      });
    }

    if (existing.status === "FAILED") {
      await db.shipment.update({
        where: { id: existing.id },
        data: { status: "PENDING" },
      });
    }
  }

  // Step 5: Fetch product catalog
  const skus = [...new Set(order.items.map((i) => i.sku))];
  const catalog = await fetchProductCatalog(db, skus);

  const missingSkus = order.items.filter((item) => !catalog[item.sku]);
  if (missingSkus.length > 0) {
    return {
      ok: false,
      error: `Product catalog entries missing for SKUs: ${missingSkus.map((i) => i.sku).join(", ")}`,
      code: "INVALID_MEASUREMENTS",
      statusCode: 400,
    };
  }

  // Step 6: Build payload
  const productCatalog: ProductCatalogEntry[] = Object.keys(catalog).map((sku) => {
    const p = catalog[sku];
    return {
      sku: p.sku,
      name: p.name,
      category: p.category,
      weight: p.weight,
      length: p.length,
      width: p.width,
      height: p.height,
    };
  });

  const pickupLocation = process.env.SHIPROCKET_PICKUP_LOCATION || site.contact.pincode;

  const orderSnapshot: OrderSnapshot = {
    id: order.id,
    totalLabel: order.totalLabel,
    shipFullName: order.shipFullName,
    shipPhone: order.shipPhone,
    shipEmail: order.shipEmail,
    shipLine1: order.shipLine1,
    shipLine2: order.shipLine2,
    shipCity: order.shipCity,
    shipState: order.shipState,
    shipPincode: order.shipPincode,
    shipLandmark: order.shipLandmark,
    shipCountry: order.shipCountry,
    items: order.items,
  };

  const payloadResult = buildShiprocketPayload(orderSnapshot, productCatalog, pickupLocation);
  if (!payloadResult.ok) {
    return {
      ok: false,
      error: `Validation failed: ${payloadResult.errors.join("; ")}`,
      code: "BUILD_PAYLOAD_FAILED",
      statusCode: 400,
    };
  }

  const { payload, idempotencyKey } = payloadResult;

  // Step 7: Create local PENDING shipment (idempotent)
  const createResult = await createShipmentWithIdempotency(db, {
    orderId: order.id,
    provider: "SHIPROCKET",
    idempotencyKey,
    providerOrderId: null,
    providerShipmentId: null,
    awb: null,
    courierName: null,
    trackingUrl: null,
    shippingCost: null,
    labelUrl: null,
  });

  if (!createResult.ok) {
    if (createResult.action === "shipment_exists") {
      return {
        ok: false,
        error: "A shipment already exists for this order with different provider data.",
        code: "SHIPMENT_EXISTS",
        statusCode: 409,
      };
    }
    return {
      ok: false,
      error: sanitizeShiprocketError(createResult.error),
      code: "SHIPMENT_UPDATE_FAILED",
      statusCode: 500,
    };
  }

  if (createResult.action === "existing") {
    return {
      ok: false,
      error: "A shipment already exists and cannot be updated.",
      code: "SHIPMENT_EXISTS",
      statusCode: 409,
    };
  }

  const shipmentId = createResult.shipmentId;
  const alreadyExisted = createResult.action === "reconciled";

  // If we reconciled onto an existing record that already has a providerOrderId, resume
  if (createResult.action === "reconciled" && createResult.providerOrderId) {
    const current = await getExistingShipment(db, orderId);
    if (current) {
      return resumeFromExistingShipment(orderId, current, deps);
    }
  }

  // Step 8: Call Shiprocket — createOrder
  let createRes: ShiprocketCreateOrderResponse;
  try {
    createRes = await deps.createOrder(payload);
  } catch (err) {
    if (err instanceof ShiprocketError && err.statusCode === 408) {
      // Timeout: createOrder result is unknown - do NOT mark as FAILED.
      // Mark as RECONCILIATION_REQUIRED to prevent blind retries.
      await db.shipment.update({
        where: { id: shipmentId },
        data: {
          status: "RECONCILIATION_REQUIRED",
          failureReason: sanitizeShiprocketError(err),
        },
      });
      return {
        ok: false,
        error: "Shiprocket API timed out. The order may or may not have been created. An admin must reconcile before retrying.",
        code: "SHIPROCKET_TIMEOUT",
        statusCode: 504,
      };
    }
    // Non-timeout error: createOrder definitively failed - safe to retry later.
    await markShipmentFailed(db, shipmentId, sanitizeShiprocketError(err));
    const isAuthErr = err instanceof ShiprocketError && err.statusCode === 401;
    return {
      ok: false,
      error: sanitizeShiprocketError(err),
      code: isAuthErr ? "SHIPROCKET_AUTH_ERROR" : "SHIPROCKET_API_ERROR",
      statusCode: isAuthErr ? 401 : 502,
    };
  }

  const providerOrderId = String(createRes.order_id);
  const providerShipmentId = String(createRes.shipment_id);

  if (!isValidProviderId(providerOrderId)) {
    await markShipmentFailed(db, shipmentId, "Shiprocket createOrder returned an invalid order_id");
    return {
      ok: false,
      error: "Shiprocket createOrder returned an invalid order_id.",
      code: "SHIPROCKET_API_ERROR",
      statusCode: 502,
    };
  }

  if (!isValidProviderId(providerShipmentId)) {
    await markShipmentFailed(db, shipmentId, "Shiprocket createOrder returned an invalid shipment_id");
    return {
      ok: false,
      error: "Shiprocket createOrder returned an invalid shipment_id.",
      code: "SHIPROCKET_API_ERROR",
      statusCode: 502,
    };
  }

  // Step 8b: Immediately persist both IDs so retries can resume from here.
  // This is the critical fix: if the process crashes after createOrder succeeds,
  // a retry will find providerOrderId already set and skip re-calling createOrder.
  await db.shipment.update({
    where: { id: shipmentId },
    data: {
      providerOrderId,
      providerShipmentId,
      status: "CREATED",
    },
  });

  // Step 9: Record CREATED event
  await recordShipmentEvent(db, {
    shipmentId,
    status: "CREATED",
    rawStatus: String(createRes.order_status || "created"),
    activity: createRes.message || undefined,
    location: null,
    note: null,
    occurredAt: new Date(),
  }).catch(() => undefined);

  let awbCode = createRes.awb_code || null;
  let courierName: string | null = null;

  // Step 10: Assign AWB if not returned by createOrder
  if (!awbCode) {
    try {
      const assignRes: ShiprocketAssignAwbResponse = await deps.assignAWB(providerShipmentId);
      if (assignRes.data) {
        awbCode = assignRes.data.awb_code;
        courierName = assignRes.data.courier_company || null;
      }
    } catch (err) {
      if (err instanceof ShiprocketError && err.statusCode === 408) {
        await db.shipment.update({
          where: { id: shipmentId },
          data: { status: "CREATED", providerOrderId, providerShipmentId },
        });
        return {
          ok: false,
          error: `Order was created on Shiprocket (ID: ${providerOrderId}) but AWB assignment timed out. Please retry — the system will resume from the existing order.`,
          code: "SHIPROCKET_TIMEOUT",
          statusCode: 504,
        };
      }
      await markShipmentFailed(db, shipmentId, sanitizeShiprocketError(err));
      return {
        ok: false,
        error: `Failed to assign AWB: ${sanitizeShiprocketError(err)}`,
        code: "SHIPROCKET_API_ERROR",
        statusCode: 502,
      };
    }
  }

  // Step 11: Update local shipment with AWB
  if (awbCode) {
    await assignAwbToShipment(db, orderId, awbCode, courierName, null).catch(() => undefined);
  }

  // Step 12: Record AWB_ASSIGNED event
  await recordShipmentEvent(db, {
    shipmentId,
    status: "AWB_ASSIGNED",
    rawStatus: "awb_assigned",
    activity: "AWB assigned to shipment",
    location: null,
    note: null,
    occurredAt: new Date(),
  }).catch(() => undefined);

  // Step 13: Schedule pickup
  let pickupScheduledAt: Date | null = null;
  try {
    await deps.schedulePickup([providerOrderId]);
    pickupScheduledAt = new Date();

    await db.shipment.update({
      where: { id: shipmentId },
      data: { status: "PICKUP_SCHEDULED" },
    }).catch(() => undefined);

    await recordShipmentEvent(db, {
      shipmentId,
      status: "PICKUP_SCHEDULED",
      rawStatus: "pickup_scheduled",
      activity: "Pickup scheduled",
      location: null,
      note: null,
      occurredAt: new Date(),
    }).catch(() => undefined);
  } catch (err) {
    await recordShipmentEvent(db, {
      shipmentId,
      status: "PICKUP_SCHEDULED",
      rawStatus: "pickup_failed",
      activity: `Pickup scheduling failed: ${sanitizeShiprocketError(err)}`,
      location: null,
      note: null,
      occurredAt: new Date(),
    }).catch(() => undefined);
  }

  // Step 14: Generate label (optional — may fail gracefully)
  let labelUrl: string | null = null;
  try {
    const labelRes: ShiprocketLabelResponse = await deps.generateLabel(providerOrderId);
    if (labelRes.data?.url) {
      labelUrl = labelRes.data.url;
      await db.shipment.update({
        where: { id: shipmentId },
        data: { labelUrl },
      }).catch(() => undefined);
    }
  } catch {
    // Label generation is optional
  }

  // Step 15: Final update of the local shipment
  const finalShipment = await db.shipment.update({
    where: { id: shipmentId },
    data: {
      providerOrderId,
      providerShipmentId,
      awb: awbCode,
      courierName,
      status: pickupScheduledAt ? "PICKUP_SCHEDULED" : "AWB_ASSIGNED",
      pickupScheduledAt,
    },
  });

  const finalStatus = pickupScheduledAt ? "PICKUP_SCHEDULED" : "AWB_ASSIGNED";
  const message = alreadyExisted
    ? `Shipment reconciled. Status: ${finalStatus}.`
    : `Shipment created. Status: ${finalStatus}.`;

  return {
    ok: true,
    action: alreadyExisted ? "reconciled" : "created",
    message,
    shipment: {
      shipmentId: finalShipment.id,
      status: finalShipment.status,
      providerOrderId: finalShipment.providerOrderId,
      providerShipmentId: finalShipment.providerShipmentId,
      awb: finalShipment.awb,
      courierName: finalShipment.courierName ?? null,
      trackingUrl: finalShipment.trackingUrl ?? null,
      labelUrl: finalShipment.labelUrl ?? null,
      shippingCost: finalShipment.shippingCost ? Number(finalShipment.shippingCost) : null,
      pickupScheduledAt: finalShipment.pickupScheduledAt?.toISOString() ?? null,
      failureReason: finalShipment.failureReason,
    },
  };
}

const RESUMABLE_STATUSES = new Set(["PENDING", "CREATED", "AWB_ASSIGNED", "PICKUP_SCHEDULED", "FAILED"]);

function canResumeFromProviderOrder(status: string): boolean {
  return RESUMABLE_STATUSES.has(status);
}

async function resumeFromExistingShipment(
  orderId: string,
  existing: { id: string; status: string; providerOrderId: string | null; providerShipmentId: string | null; awb: string | null; pickupScheduledAt: Date | null },
  deps: ShipmentDeps,
): Promise<CreateShipmentResult> {
  const { prisma: db } = deps;
  const providerOrderId = existing.providerOrderId;
  const providerShipmentId = existing.providerShipmentId;
  if (!providerOrderId) {
    throw new ShiprocketError("resume called without providerOrderId", 500);
  }
  // assignAWB requires a Shiprocket shipment_id. providerShipmentId holds it
  // for current records; fall back to providerOrderId only for legacy records
  // created before the two IDs were tracked separately.
  const awbShipmentId = providerShipmentId ?? providerOrderId;

  let awbCode = existing.awb;
  let courierName: string | null = null;

  // Step A: If no AWB assigned, try to assign one
  if (!awbCode) {
    try {
      const assignRes: ShiprocketAssignAwbResponse = await deps.assignAWB(awbShipmentId);
      if (assignRes.data) {
        awbCode = assignRes.data.awb_code;
        courierName = assignRes.data.courier_company || null;
      }
    } catch (err) {
      if (err instanceof ShiprocketError && err.statusCode === 408) {
        await db.shipment.update({
          where: { id: existing.id },
          data: { status: "CREATED" },
        });
        return {
          ok: false,
          error: `Order exists on Shiprocket (ID: ${providerOrderId}) but AWB assignment timed out. Please retry.`,
          code: "SHIPROCKET_TIMEOUT",
          statusCode: 504,
        };
      }
      return {
        ok: false,
        error: `Failed to assign AWB during resume: ${sanitizeShiprocketError(err)}`,
        code: "SHIPROCKET_API_ERROR",
        statusCode: 502,
      };
    }
  }

  // Step B: Persist AWB if we got one
  if (awbCode) {
    await assignAwbToShipment(db, orderId, awbCode, courierName, null).catch(() => undefined);
  }

  // Step C: Record AWB_ASSIGNED event (idempotent)
  await recordShipmentEvent(db, {
    shipmentId: existing.id,
    status: "AWB_ASSIGNED",
    rawStatus: "awb_assigned",
    activity: "AWB assigned to shipment (resumed)",
    location: null,
    note: null,
    occurredAt: new Date(),
  }).catch(() => undefined);

  // Step D: Schedule pickup if not already done
  let pickupScheduledAt: Date | null = existing.pickupScheduledAt;
  if (existing.status !== "PICKUP_SCHEDULED") {
    try {
      await deps.schedulePickup([providerOrderId]);
      pickupScheduledAt = new Date();

      await db.shipment.update({
        where: { id: existing.id },
        data: { status: "PICKUP_SCHEDULED", pickupScheduledAt },
      }).catch(() => undefined);

      await recordShipmentEvent(db, {
        shipmentId: existing.id,
        status: "PICKUP_SCHEDULED",
        rawStatus: "pickup_scheduled",
        activity: "Pickup scheduled (resumed)",
        location: null,
        note: null,
        occurredAt: new Date(),
      }).catch(() => undefined);
    } catch (err) {
      await recordShipmentEvent(db, {
        shipmentId: existing.id,
        status: "PICKUP_SCHEDULED",
        rawStatus: "pickup_failed",
        activity: `Pickup scheduling failed: ${sanitizeShiprocketError(err)}`,
        location: null,
        note: null,
        occurredAt: new Date(),
      }).catch(() => undefined);
    }
  }

  // Step E: Final update
  const finalShipment = await db.shipment.update({
    where: { id: existing.id },
    data: {
      providerOrderId,
      providerShipmentId: providerShipmentId ?? providerOrderId,
      awb: awbCode,
      courierName,
      status: pickupScheduledAt ? "PICKUP_SCHEDULED" : "AWB_ASSIGNED",
      ...(pickupScheduledAt ? { pickupScheduledAt } : {}),
    },
  });

  const finalStatus = pickupScheduledAt ? "PICKUP_SCHEDULED" : "AWB_ASSIGNED";
  const message = `Shipment reconciled from existing state. Status: ${finalStatus}.`;

  return {
    ok: true,
    action: "reconciled",
    message,
    shipment: {
      shipmentId: finalShipment.id,
      status: finalShipment.status,
      providerOrderId: finalShipment.providerOrderId,
      providerShipmentId: finalShipment.providerShipmentId,
      awb: finalShipment.awb,
      courierName: finalShipment.courierName ?? null,
      trackingUrl: finalShipment.trackingUrl ?? null,
      labelUrl: finalShipment.labelUrl ?? null,
      shippingCost: finalShipment.shippingCost ? Number(finalShipment.shippingCost) : null,
      pickupScheduledAt: finalShipment.pickupScheduledAt?.toISOString() ?? null,
      failureReason: finalShipment.failureReason,
    },
  };
}

async function markShipmentFailed(
  db: PrismaClient,
  shipmentId: string,
  reason: string,
): Promise<void> {
  try {
    await db.shipment.update({
      where: { id: shipmentId },
      data: { status: "FAILED", failureReason: reason },
    });
  } catch {
    // Best-effort — log but don't fail
  }
}

export type ReconcileShipmentErrorCode =
  | "NOT_CONFIGURED"
  | "ORDER_NOT_FOUND"
  | "SHIPMENT_NOT_FOUND"
  | "SHIPMENT_ALREADY_ATTACHED"
  | "STATUS_NOT_RECONCILABLE"
  | "SHIPROCKET_API_ERROR"
  | "SHIPROCKET_NOT_FOUND"
  | "INVALID_PROVIDER_ID"
  | "MANUAL_INTERVENTION_REQUIRED"
  | "INTERNAL_ERROR";

export type ReconcileShipmentResult =
  | {
      ok: true;
      shipment: ShipmentDetail;
      action: "reconciled";
      message: string;
    }
  | {
      ok: true;
      shipment: ShipmentDetail;
      action: "recovered";
      message: string;
    }
  | {
      ok: true;
      action: "no_remote_order";
      message: string;
    }
  | {
      ok: false;
      error: string;
      code: ReconcileShipmentErrorCode;
      statusCode: number;
    };

function isValidProviderId(value: string): boolean {
  if (!value || typeof value !== "string") return false;
  const trimmed = value.trim();
  if (trimmed.length === 0) return false;
  if (trimmed === "undefined" || trimmed === "null" || trimmed === "NaN") return false;
  return true;
}

export async function reconcileShipmentForOrder(
  orderId: string,
  deps: ShipmentDeps = defaultDeps,
): Promise<ReconcileShipmentResult> {
  const { prisma: db } = deps;

  if (!deps.isShiprocketConfigured()) {
    return {
      ok: false,
      error: "Shiprocket is not configured.",
      code: "NOT_CONFIGURED",
      statusCode: 503,
    };
  }

  await acquireShipmentLock(db, orderId);
  try {
    return await reconcileShipmentForOrderInner(orderId, deps);
  } finally {
    await releaseShipmentLock(db, orderId);
  }
}

async function recoverMissingLocalShipment(
  orderId: string,
  deps: ShipmentDeps,
): Promise<ReconcileShipmentResult> {
  const { prisma: db } = deps;

  let lookupResult: ShiprocketOrderLookupResult | null;
  try {
    lookupResult = await deps.reconcileShirocketOrder(orderId);
  } catch (err) {
    return {
      ok: false,
      error: `Shiprocket lookup failed: ${sanitizeShiprocketError(err)}`,
      code: "SHIPROCKET_API_ERROR",
      statusCode: 502,
    };
  }

  if (!lookupResult) {
    return {
      ok: true,
      action: "no_remote_order",
      message: `No local shipment and no Shiprocket order found for DANDY order ${orderId}. The Shiprocket createOrder was never called or failed. Manual investigation required.`,
    };
  }

  const providerOrderId = String(lookupResult.providerOrderId);
  const providerShipmentId = String(lookupResult.providerShipmentId);

  if (!isValidProviderId(providerOrderId)) {
    return {
      ok: false,
      error: "Shiprocket lookup returned an invalid providerOrderId. Manual investigation required.",
      code: "INVALID_PROVIDER_ID",
      statusCode: 502,
    };
  }

  const shipmentId = newId("shp");
  const idempotencyKey = newId("shp");

  try {
    await db.shipment.create({
      data: {
        id: shipmentId,
        orderId,
        provider: "SHIPROCKET",
        providerOrderId,
        providerShipmentId: isValidProviderId(providerShipmentId)
          ? providerShipmentId
          : providerOrderId,
        awb: lookupResult.awb,
        courierName: lookupResult.courierName,
        status: "CREATED",
        trackingUrl: null,
        shippingCost: null,
        labelUrl: null,
        pickupScheduledAt: null,
        idempotencyKey,
      },
    });
  } catch (err: any) {
    if (err.code === "P2002") {
      const rechecked = await getExistingShipment(db, orderId);
      if (rechecked) {
        return {
          ok: true,
          action: "recovered",
          message: `Local shipment already existed (created concurrently). Status: ${rechecked.status}.`,
          shipment: {
            shipmentId: rechecked.id,
            status: rechecked.status,
            providerOrderId: rechecked.providerOrderId,
            providerShipmentId: rechecked.providerShipmentId,
            awb: rechecked.awb,
            courierName: rechecked.courierName ?? null,
            trackingUrl: rechecked.trackingUrl ?? null,
            labelUrl: rechecked.labelUrl ?? null,
            shippingCost: rechecked.shippingCost ? Number(rechecked.shippingCost) : null,
            pickupScheduledAt: rechecked.pickupScheduledAt?.toISOString() ?? null,
            failureReason: rechecked.failureReason,
          },
        };
      }
    }
    throw err;
  }

  await recordShipmentEvent(db, {
    shipmentId,
    status: "CREATED",
    rawStatus: "recovered_from_shiprocket",
    activity: "Local shipment created and recovered from existing Shiprocket order via admin recovery action",
    location: null,
    note: lookupResult.orderId
      ? `Shiprocket order_id: ${lookupResult.orderId}`
      : null,
    occurredAt: new Date(),
  }).catch(() => undefined);

  const created = await getExistingShipment(db, orderId);

  return {
    ok: true,
    action: "recovered",
    message: `Local shipment created and attached to existing Shiprocket order (ID: ${providerOrderId}). Status: CREATED. AWB/pickup can be assigned via Retry Shipment.`,
    shipment: {
      shipmentId: created!.id,
      status: created!.status,
      providerOrderId: created!.providerOrderId,
      providerShipmentId: created!.providerShipmentId,
      awb: created!.awb,
      courierName: created!.courierName ?? null,
      trackingUrl: created!.trackingUrl ?? null,
      labelUrl: created!.labelUrl ?? null,
      shippingCost: created!.shippingCost ? Number(created!.shippingCost) : null,
      pickupScheduledAt: created!.pickupScheduledAt?.toISOString() ?? null,
      failureReason: created!.failureReason,
    },
  };
}

async function reconcileShipmentForOrderInner(
  orderId: string,
  deps: ShipmentDeps,
): Promise<ReconcileShipmentResult> {
  const { prisma: db } = deps;

  const existing = await getExistingShipment(db, orderId);

  if (!existing) {
    return recoverMissingLocalShipment(orderId, deps);
  }

  if (existing.providerOrderId) {
    return {
      ok: false,
      error: "Shipment already has a providerOrderId attached. Manual investigation required.",
      code: "SHIPMENT_ALREADY_ATTACHED",
      statusCode: 409,
    };
  }

  if (!canRetryShipment(existing.status)) {
    return {
      ok: false,
      error: `Shipment status ${existing.status} is not reconcilable. Manual investigation required.`,
      code: "STATUS_NOT_RECONCILABLE",
      statusCode: 409,
    };
  }

  let lookupResult: ShiprocketOrderLookupResult | null;
  try {
    lookupResult = await deps.reconcileShirocketOrder(orderId);
  } catch (err) {
    return {
      ok: false,
      error: `Shiprocket lookup failed: ${sanitizeShiprocketError(err)}`,
      code: "SHIPROCKET_API_ERROR",
      statusCode: 502,
    };
  }

  if (!lookupResult) {
    return {
      ok: true,
      action: "no_remote_order",
      message: `No Shiprocket order found for DANDY order ${orderId}. The local shipment remains in ${existing.status}. Manual investigation required — verify the order was actually created on Shiprocket.`,
    };
  }

  const providerOrderId = String(lookupResult.providerOrderId);
  const providerShipmentId = String(lookupResult.providerShipmentId);

  if (!isValidProviderId(providerOrderId)) {
    return {
      ok: false,
      error: "Shiprocket lookup returned an invalid providerOrderId. Manual investigation required.",
      code: "INVALID_PROVIDER_ID",
      statusCode: 502,
    };
  }

  await db.shipment.update({
    where: { id: existing.id },
    data: {
      providerOrderId,
      providerShipmentId: isValidProviderId(providerShipmentId)
        ? providerShipmentId
        : providerOrderId,
      awb: lookupResult.awb,
      courierName: lookupResult.courierName,
      failureReason: null,
      status: "CREATED",
    },
  });

  await recordShipmentEvent(db, {
    shipmentId: existing.id,
    status: "CREATED",
    rawStatus: "reconciled_from_shiprocket",
    activity: "Shipment reconciled from Shiprocket via admin recovery action",
    location: null,
    note: lookupResult.orderId
      ? `Shiprocket order_id: ${lookupResult.orderId}`
      : null,
    occurredAt: new Date(),
  }).catch(() => undefined);

  const updated = await getExistingShipment(db, orderId);

  return {
    ok: true,
    action: "reconciled",
    message: `Shipment reconciled with Shiprocket order. Status: CREATED. AWB/pickup can be assigned via Retry Shipment.`,
    shipment: {
      shipmentId: updated!.id,
      status: updated!.status,
      providerOrderId: updated!.providerOrderId,
      providerShipmentId: updated!.providerShipmentId,
      awb: updated!.awb,
      courierName: updated!.courierName ?? null,
      trackingUrl: updated!.trackingUrl ?? null,
      labelUrl: updated!.labelUrl ?? null,
      shippingCost: updated!.shippingCost ? Number(updated!.shippingCost) : null,
      pickupScheduledAt: updated!.pickupScheduledAt?.toISOString() ?? null,
      failureReason: updated!.failureReason,
    },
  };
}

export async function getShipmentDetails(orderId: string): Promise<{
  id: string;
  status: string;
  provider: string;
  providerOrderId: string | null;
  providerShipmentId: string | null;
  awb: string | null;
  courierName: string | null;
  trackingUrl: string | null;
  labelUrl: string | null;
  shippingCost: number | null;
  pickupScheduledAt: string | null;
  shippedAt: string | null;
  deliveredAt: string | null;
  cancelledAt: string | null;
  failureReason: string | null;
  createdAt: string;
  updatedAt: string;
  canRetry: boolean;
  canTrack: boolean;
  events: Array<{
    id: string;
    status: string;
    rawStatus: string;
    activity: string | null;
    location: string | null;
    note: string | null;
    occurredAt: string;
  }>;
} | null> {
  const shipment = await prisma.shipment.findUnique({
    where: { orderId },
    include: {
      events: {
        orderBy: { occurredAt: "desc" },
      },
    },
  });

  if (!shipment) return null;

  return {
    id: shipment.id,
    status: shipment.status,
    provider: shipment.provider,
    providerOrderId: shipment.providerOrderId,
    providerShipmentId: shipment.providerShipmentId,
    awb: shipment.awb,
    courierName: shipment.courierName,
    trackingUrl: shipment.trackingUrl,
    labelUrl: shipment.labelUrl,
    shippingCost: shipment.shippingCost ? Number(shipment.shippingCost) : null,
    pickupScheduledAt: shipment.pickupScheduledAt?.toISOString() ?? null,
    shippedAt: shipment.shippedAt?.toISOString() ?? null,
    deliveredAt: shipment.deliveredAt?.toISOString() ?? null,
    cancelledAt: shipment.cancelledAt?.toISOString() ?? null,
    failureReason: shipment.failureReason,
    createdAt: shipment.createdAt.toISOString(),
    updatedAt: shipment.updatedAt.toISOString(),
    canRetry: canRetryShipment(shipment.status),
    canTrack: shipment.awb !== null || shipment.providerOrderId !== null,
    events: shipment.events.map((event) => ({
      id: event.id,
      status: event.status,
      rawStatus: event.rawStatus,
      activity: event.activity,
      location: event.location,
      note: event.note,
      occurredAt: event.occurredAt.toISOString(),
    })),
  };
}
