import type { ShiprocketCreateOrderPayload, ShiprocketOrderItem } from "@/lib/shiprocket/types";
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

function splitFullName(fullName: string): { firstName: string; lastName: string } {
  const trimmed = fullName.trim();
  const parts = trimmed.split(/\s+/);
  if (parts.length === 0) {
    return { firstName: "", lastName: "" };
  }
  if (parts.length === 1) {
    return { firstName: parts[0], lastName: "" };
  }
  const lastName = parts[parts.length - 1];
  const firstName = parts.slice(0, -1).join(" ");
  return { firstName, lastName };
}

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

  const orderItems: ShiprocketOrderItem[] = [];

  let subTotal = 0;

  for (const item of order.items) {
    const product = productMap.get(item.sku);
    if (!product) {
      errors.push(`Product not found in catalog for SKU: ${item.sku}`);
      continue;
    }

    const price = item.unitPrice == null ? 0 : Number(item.unitPrice.toString());
    subTotal += price * item.qty;

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

    const weightKg = parsed.measurements.weightGrams / 1000;
    const lengthCm = parsed.measurements.lengthCm;
    const breadthCm = parsed.measurements.widthCm;
    const heightCm = parsed.measurements.heightCm;

    if (weightKg <= 0) {
      errors.push(`SKU ${item.sku}: weight must be greater than 0`);
      continue;
    }

    orderItems.push({
      name: item.name,
      sku: item.sku,
      qty: item.qty,
      units: 1,
      selling_price: price,
      tax_rate: 0,
      tax_value: 0,
      discount: 0,
      weight: weightKg,
      length: lengthCm,
      breadth: breadthCm,
      height: heightCm,
    });
  }

  if (errors.length > 0) {
    return { ok: false, errors };
  }

  if (orderItems.length === 0) {
    return { ok: false, errors: ["Order has no valid items to ship"] };
  }

  const totalWeightKg = orderItems.reduce((sum, item) => sum + item.weight * item.qty, 0);
  if (totalWeightKg > 60) {
    return { ok: false, errors: [`Total package weight ${totalWeightKg.toFixed(2)}kg exceeds Shiprocket 60kg limit`] };
  }

  const shippingAddress = [order.shipLine1, order.shipLine2].filter(Boolean).join(", ");

  const normalizedPhone = normalizePhoneE164(order.shipPhone);

  const { firstName: shippingFirstName, lastName: shippingLastName } = splitFullName(order.shipFullName);
  const { firstName: billingFirstName, lastName: billingLastName } = splitFullName(order.shipFullName);

  if (!billingLastName) {
    return { ok: false, errors: ["billing_last_name cannot be empty — shipFullName must contain at least two words"] };
  }
  if (!shippingLastName) {
    return { ok: false, errors: ["shipping_last_name cannot be empty — shipFullName must contain at least two words"] };
  }

  const payload: ShiprocketCreateOrderPayload = {
    order_id: order.id,
    order_date: new Date().toISOString().split("T")[0],
    shipping_customer_name: order.shipFullName,
    shipping_first_name: shippingFirstName,
    shipping_last_name: shippingLastName,
    shipping_address: shippingAddress,
    shipping_city: order.shipCity,
    shipping_state: order.shipState,
    shipping_country: order.shipCountry,
    shipping_pincode: order.shipPincode,
    shipping_phone: normalizedPhone,
    shipping_email: order.shipEmail,
    ...(order.shipLandmark ? { shipping_landmark: order.shipLandmark } : {}),
    billing_customer_name: order.shipFullName,
    billing_first_name: billingFirstName,
    billing_last_name: billingLastName,
    billing_address: shippingAddress,
    billing_city: order.shipCity,
    billing_state: order.shipState,
    billing_country: order.shipCountry,
    billing_pincode: order.shipPincode,
    billing_phone: normalizedPhone,
    billing_email: order.shipEmail,
    ...(order.shipLandmark ? { billing_landmark: order.shipLandmark } : {}),
    order_items: orderItems,
    payment_method: "Prepaid",
    sub_total: subTotal,
    shipping_charges: 0,
    shipping_is_billing: true,
    order_currency: "INR",
    pickup_location: pickupLocation,
    fuel_price: "0",
    weight: totalWeightKg,
    length: Math.max(...orderItems.map((i) => i.length)),
    breadth: Math.max(...orderItems.map((i) => i.breadth)),
    height: Math.max(...orderItems.map((i) => i.height)),
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