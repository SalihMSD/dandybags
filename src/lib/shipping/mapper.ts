import type { ShiprocketCreateOrderPayload, ShiprocketOrderItem, ShiprocketPackage } from "@/lib/shiprocket/types";
import { isShiprocketConfigured } from "@/lib/shiprocket/client";
import { parseProductMeasurements } from "@/lib/shipping/measurements";
import { newId } from "@/lib/db/store";

export type OrderSnapshot = {
  id: string;
  totalLabel: string;
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
};

export type ProductCatalogEntry = {
  sku: string;
  name: string;
  category: string;
  weight: string;
  length: string;
  width: string;
  height: string;
};

export type ShiprocketPayloadResult =
  | { ok: true; payload: ShiprocketCreateOrderPayload; idempotencyKey: string }
  | { ok: false; errors: string[] };

export function buildShiprocketPayload(
  order: OrderSnapshot,
  productCatalog: ProductCatalogEntry[],
  pickupLocation: string,
): ShiprocketPayloadResult {
  if (!isShiprocketConfigured()) {
    return { ok: false, errors: ["Shiprocket is not configured"] };
  }

  if (!order.shipEmail) {
    return { ok: false, errors: ["Order is missing shipEmail — required for Shiprocket"] };
  }

  if (!order.shipPincode) {
    return { ok: false, errors: ["Order is missing shipPincode — required for Shiprocket"] };
  }

  if (!order.shipCountry) {
    return { ok: false, errors: ["Order is missing shipCountry"] };
  }

  const productMap = new Map(productCatalog.map((p) => [p.sku, p]));

  const errors: string[] = [];
  let totalWeightGrams = 0;
  let maxDim = 0;
  let packageLength = 0;
  let packageWidth = 0;
  let packageHeight = 0;

  const orderItems: ShiprocketOrderItem[] = [];

  for (const item of order.items) {
    const product = productMap.get(item.sku);
    if (!product) {
      errors.push(`Product not found in catalog for SKU: ${item.sku}`);
      continue;
    }

    const price = item.unitPrice == null ? 0 : Number(item.unitPrice.toString());

    const parsed = parseProductMeasurements(
      product.weight,
      product.length,
      product.width,
      product.height,
    );

    if (!parsed.ok) {
      for (const e of parsed.errors) {
        errors.push(`SKU ${item.sku}: ${e}`);
      }
      continue;
    }

    totalWeightGrams += parsed.measurements.weightGrams * item.qty;
    packageLength = Math.max(packageLength, parsed.measurements.lengthCm);
    packageWidth = Math.max(packageWidth, parsed.measurements.widthCm);
    packageHeight = Math.max(packageHeight, parsed.measurements.heightCm);
    maxDim = Math.max(packageLength, packageWidth, packageHeight);

    orderItems.push({
      name: item.name,
      sku: item.sku,
      qty: item.qty,
      units: 1,
      selling_price: price,
      tax_rate: 0,
      tax_value: 0,
      discount: 0,
    });
  }

  if (errors.length > 0) {
    return { ok: false, errors };
  }

  if (orderItems.length === 0) {
    return { ok: false, errors: ["Order has no valid items to ship"] };
  }

  if (totalWeightGrams <= 0) {
    return { ok: false, errors: ["Total package weight must be greater than 0"] };
  }

  const weightKg = totalWeightGrams / 1000;
  const lengthM = packageLength / 100;
  const widthM = packageWidth / 100;
  const heightM = packageHeight / 100;
  const volumetricKg = lengthM * widthM * heightM * 1000;
  const billableWeight = Math.max(weightKg, volumetricKg);

  if (billableWeight > 60) {
    return { ok: false, errors: [`Package billable weight ${billableWeight.toFixed(2)}kg exceeds Shiprocket 60kg limit`] };
  }

  if (maxDim > 120) {
    return { ok: false, errors: [`Package dimension ${maxDim}cm exceeds Shiprocket 120cm limit`] };
  }

  const shippingAddress = [order.shipLine1, order.shipLine2].filter(Boolean).join(", ");

  const normalizedPhone = normalizePhoneE164(order.shipPhone);

  const payload: ShiprocketCreateOrderPayload = {
    order_id: order.id,
    order_date: new Date().toISOString().split("T")[0],
    shipping_customer_name: order.shipFullName,
    shipping_address: shippingAddress,
    shipping_city: order.shipCity,
    shipping_state: order.shipState,
    shipping_country: order.shipCountry,
    shipping_pincode: order.shipPincode,
    shipping_phone: normalizedPhone,
    shipping_email: order.shipEmail,
    ...(order.shipLandmark ? { shipping_landmark: order.shipLandmark } : {}),
    billing_customer_name: order.shipFullName,
    billing_address: shippingAddress,
    billing_city: order.shipCity,
    billing_state: order.shipState,
    billing_country: order.shipCountry,
    billing_pincode: order.shipPincode,
    billing_phone: normalizedPhone,
    billing_email: order.shipEmail,
    ...(order.shipLandmark ? { billing_landmark: order.shipLandmark } : {}),
    order_items: orderItems,
    payment_type: "PREPAID",
    order_amount: parseTotalAmount(order.totalLabel),
    order_currency: "INR",
    weight: {
      weight: Math.round(billableWeight),
      length: packageLength,
      breadth: packageWidth,
      height: packageHeight,
    } as ShiprocketPackage,
    pickup_location: pickupLocation,
    fuel_price: "0",
  };

  const idempotencyKey = `shp_${newId("shp")}`;

  return { ok: true, payload, idempotencyKey };
}

const SHIPROCKET_PHONE_PATTERN = /^(\+91|91|0)?(\d{10})$/;
const INDIAN_MOBILE_PATTERN = /^(\d{10})$/;

export function normalizePhoneE164(phone: string): string {
  const trimmed = phone.trim().replace(/\s+/g, "");
  const match = trimmed.match(INDIAN_MOBILE_PATTERN);
  if (match) {
    return `+91${match[1]}`;
  }
  if (trimmed.startsWith("+91")) {
    return trimmed;
  }
  const with91 = trimmed.match(SHIPROCKET_PHONE_PATTERN);
  if (with91) {
    return `+91${with91[2]}`;
  }
  return trimmed;
}

function parseTotalAmount(totalLabel: string): number {
  const num = Number(totalLabel.replace(/[^0-9.]/g, ""));
  if (!Number.isFinite(num) || num <= 0) return 0;
  return Math.round(num * 100) / 100;
}
