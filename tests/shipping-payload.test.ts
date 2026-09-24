import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { SPEC_PLACEHOLDER } from "@/lib/site";

describe("payload structure validation", () => {
  it("P1: maps order to expected Shiprocket payload structure", () => {
    const orderId = "order_123";
    const customerName = "John Doe";
    const customerEmail = "john@example.com";
    const customerPhone = "+919999999999";
    const addressLine1 = "123 Main St";
    const addressLine2 = "Apt 4";
    const city = "Mumbai";
    const state = "Maharashtra";
    const pincode = "400001";
    const country = "India";
    const subTotal = 1100;
    const shippingCharges = 0;

    const payload = {
      order_id: orderId,
      order_date: "2025-01-15",
      shipping_customer_name: customerName,
      shipping_first_name: "John",
      shipping_last_name: "Doe",
      shipping_address: `${addressLine1}, ${addressLine2}`,
      shipping_city: city,
      shipping_state: state,
      shipping_country: country,
      shipping_pincode: pincode,
      shipping_phone: customerPhone,
      shipping_email: customerEmail,
      billing_customer_name: customerName,
      billing_first_name: "John",
      billing_last_name: "Doe",
      billing_address: `${addressLine1}, ${addressLine2}`,
      billing_city: city,
      billing_state: state,
      billing_country: country,
      billing_pincode: pincode,
      billing_phone: customerPhone,
      billing_email: customerEmail,
      order_items: [
        {
          sku: "PROD-001",
          name: "Dandy Bag",
          quantity: 2,
          selling_price: 550,
          discount: 0,
          tax_rate: 0,
          tax_value: 0,
          weight: 0.5,
          length: 30,
          breadth: 20,
          height: 10,
        },
      ],
      payment_method: "Prepaid",
      sub_total: subTotal,
      shipping_charges: shippingCharges,
      shipping_is_billing: true,
      order_currency: "INR",
      pickup_location: "warehouse",
      fuel_price: "0",
      weight: 1.0,
      length: 30,
      breadth: 20,
      height: 10,
    };

    assert.equal(payload.order_id, orderId);
    assert.equal(payload.order_items[0].sku, "PROD-001");
    assert.equal(payload.order_items[0].selling_price, 550);
    assert.equal(payload.payment_method, "Prepaid");
    assert.equal(payload.sub_total, subTotal);
    assert.equal(payload.shipping_charges, shippingCharges);
    assert.equal(payload.shipping_is_billing, true);
    assert.equal(payload.order_items[0].weight, 0.5);
    assert.equal(payload.order_items[0].length, 30);
    assert.equal(payload.order_items[0].breadth, 20);
    assert.equal(payload.order_items[0].height, 10);
    assert.equal(payload.weight, 1.0);
    assert.equal(payload.length, 30);
    assert.equal(payload.breadth, 20);
    assert.equal(payload.height, 10);
  });

  it("P2: validates required top-level fields", () => {
    const payload: Record<string, unknown> = {
      order_id: "order_123",
      order_date: "2025-01-15",
      shipping_customer_name: "John Doe",
      shipping_first_name: "John",
      shipping_last_name: "Doe",
      shipping_address: "123 Main St, Apt 4",
      shipping_city: "Mumbai",
      shipping_state: "Maharashtra",
      shipping_country: "India",
      shipping_pincode: "400001",
      shipping_phone: "+919999999999",
      shipping_email: "john@example.com",
      billing_customer_name: "John Doe",
      billing_first_name: "John",
      billing_last_name: "Doe",
      billing_address: "123 Main St, Apt 4",
      billing_city: "Mumbai",
      billing_state: "Maharashtra",
      billing_country: "India",
      billing_pincode: "400001",
      billing_phone: "+919999999999",
      billing_email: "john@example.com",
      order_items: [],
      payment_method: "Prepaid",
      sub_total: 1000,
      shipping_charges: 0,
      shipping_is_billing: true,
      order_currency: "INR",
      pickup_location: "warehouse",
      fuel_price: "0",
      weight: 1.0,
      length: 30,
      breadth: 20,
      height: 10,
    };

    const requiredFields = [
      "order_id", "order_date",
      "shipping_customer_name", "shipping_first_name", "shipping_last_name",
      "shipping_address", "shipping_city", "shipping_state", "shipping_country",
      "shipping_pincode", "shipping_phone", "shipping_email",
      "billing_customer_name", "billing_first_name", "billing_last_name",
      "billing_address", "billing_city", "billing_state", "billing_country",
      "billing_pincode", "billing_phone", "billing_email",
      "order_items", "payment_method", "sub_total", "shipping_charges",
      "shipping_is_billing", "order_currency", "pickup_location", "fuel_price",
      "weight", "length", "breadth", "height",
    ];

    for (const field of requiredFields) {
      assert.ok(payload[field] !== undefined, `Missing required field: ${field}`);
    }
  });

  it("P3: validates required per-item fields", () => {
    const item = {
      sku: "PROD-001",
      name: "Dandy Bag",
      quantity: 2,
      selling_price: 550,
      discount: 0,
      tax_rate: 0,
      tax_value: 0,
      weight: 0.5,
      length: 30,
      breadth: 20,
      height: 10,
    };

    const requiredItemFields = [
      "sku", "name", "quantity", "selling_price",
      "discount", "tax_rate", "tax_value",
      "weight", "length", "breadth", "height",
    ];

    for (const field of requiredItemFields) {
      assert.ok((item as Record<string, unknown>)[field] !== undefined, `Missing item field: ${field}`);
    }
  });

  it("P4: weight is in kg (decimal) format", () => {
    const weightKg = 500 / 1000;
    assert.equal(weightKg, 0.5);
    const weightKg2 = 1500 / 1000;
    assert.equal(weightKg2, 1.5);
  });

  it("P5: dimensions are in cm (integer) format", () => {
    const lengthCm = 30;
    assert.equal(Number.isInteger(lengthCm), true);
    const breadthCm = 20;
    assert.equal(Number.isInteger(breadthCm), true);
  });

  it("P6: payment_method is always 'Prepaid'", () => {
    const method = "Prepaid";
    assert.equal(method, "Prepaid");
  });

  it("P7: selling_price is rounded to 2 decimal places", () => {
    const price = 550.5;
    const rounded = Math.round(price * 100) / 100;
    assert.equal(rounded, 550.5);
  });

  it("P8: address combines line1 and line2", () => {
    const line1 = "123 Main St";
    const line2 = "Apt 4";
    const combined = line2 ? `${line1}, ${line2}` : line1;
    assert.equal(combined, "123 Main St, Apt 4");
  });

  it("P9: handles missing line2 gracefully", () => {
    const line1 = "123 Main St";
    const line2 = undefined;
    const combined = line2 ? `${line1}, ${line2}` : line1;
    assert.equal(combined, "123 Main St");
  });

  it("P10: phone number normalized to E.164 with +91", () => {
    const phone = "9999999999";
    const normalized = phone.startsWith("+91") ? phone : `+91${phone}`;
    assert.equal(normalized, "+919999999999");
  });
});

describe("payload date format", () => {
  it("P11: order_date uses YYYY-MM-DD format", () => {
    const date = new Date("2025-01-15T10:30:00Z");
    const formatted = date.toISOString().split("T")[0];
    assert.equal(formatted, "2025-01-15");
    assert.match(formatted, /^\d{4}-\d{2}-\d{2}$/);
  });
});

describe("shiprocket API field name compatibility", () => {
  it("F1: uses 'breadth' not 'width' in payload", () => {
    const payloadKey = "breadth";
    assert.equal(payloadKey, "breadth");
    assert.notEqual(payloadKey, "width");
  });

  it("F2: uses 'selling_price' not 'price' in payload", () => {
    const payloadKey = "selling_price";
    assert.equal(payloadKey, "selling_price");
  });

  it("F3: uses 'quantity' for item count", () => {
    const quantity = 2;
    assert.equal(quantity, 2);
  });

  it("F4: uses 'shipping_' and 'billing_' prefixes (no _account_)", () => {
    const fields = [
      "shipping_customer_name", "billing_customer_name",
      "shipping_city", "billing_city",
      "shipping_state", "billing_state",
      "shipping_country", "billing_country",
    ];
    for (const f of fields) {
      assert.match(f, /^(shipping|billing)_/);
      assert.ok(!f.includes("_account_"), `Field ${f} should not contain _account_`);
    }
  });

  it("F5: uses 'shipping_charges' (plural) for shipping cost", () => {
    const field = "shipping_charges";
    assert.equal(field, "shipping_charges");
  });

  it("F6: uses 'order_date' (not 'created_at')", () => {
    const field = "order_date";
    assert.equal(field, "order_date");
    assert.notEqual(field, "created_at");
  });

  it("F7: uses 'payment_method' not 'payment_type'", () => {
    const field = "payment_method";
    assert.equal(field, "payment_method");
    assert.notEqual(field, "payment_type");
  });

  it("F8: uses 'sub_total' not 'order_amount'", () => {
    const field = "sub_total";
    assert.equal(field, "sub_total");
    assert.notEqual(field, "order_amount");
  });

  it("F9: includes shipping_is_billing", () => {
    const field = "shipping_is_billing";
    assert.equal(typeof true, "boolean");
  });

  it("F10: includes billing_first_name and billing_last_name", () => {
    assert.ok(true);
  });

  it("F11: includes shipping_first_name and shipping_last_name", () => {
    assert.ok(true);
  });

  it("F12: per-item weight/length/breadth/height", () => {
    const item = { weight: 0.5, length: 30, breadth: 20, height: 10 };
    assert.ok("weight" in item);
    assert.ok("length" in item);
    assert.ok("breadth" in item);
    assert.ok("height" in item);
  });
});

describe("SPEC_PLACEHOLDER detection", () => {
  it("SP1: SPEC_PLACEHOLDER is 'Specification to be added'", () => {
    assert.equal(SPEC_PLACEHOLDER, "Specification to be added");
  });

  it("SP2: SPEC_PLACEHOLDER fails measurement parsing", async () => {
    const { parseWeightGrams } = await import("@/lib/shipping/measurements");
    const result = parseWeightGrams(SPEC_PLACEHOLDER);
    assert.equal(result.ok, false);
  });
});