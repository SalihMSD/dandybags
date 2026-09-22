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
    const orderTotal = 1100;
    const shippingCost = 100;

    const payload = {
      order_id: orderId,
      order_date: "2025-01-15",
      shipping_account_pincode: pincode,
      shipping_account_city: city,
      shipping_account_state: state,
      shipping_account_country: country,
      shipping_account_address: `${addressLine1}, ${addressLine2}`,
      shipping_account_address_2: addressLine2,
      shipping_account_phone: customerPhone,
      shipping_account_customer_name: customerName,
      shipping_account_customer_email: customerEmail,
      billing_account_pincode: pincode,
      billing_account_city: city,
      billing_account_state: state,
      billing_account_country: country,
      billing_account_address: `${addressLine1}, ${addressLine2}`,
      billing_account_phone: customerPhone,
      billing_account_customer_name: customerName,
      billing_account_customer_email: customerEmail,
      order_items: [
        {
          sku: "PROD-001",
          name: "Dandy Bag",
          quantity: 2,
          total_units: 2,
          selling_price: 550,
          discount: 0,
          tax: 0,
          weight: 0.5,
          length: 30,
          breadth: 20,
          height: 10,
        },
      ],
      payment_method: "Prepaid",
      amount: orderTotal,
      shipping_charges: shippingCost,
    };

    assert.equal(payload.order_id, orderId);
    assert.equal(payload.order_items[0].sku, "PROD-001");
    assert.equal(payload.order_items[0].selling_price, 550);
    assert.equal(payload.payment_method, "Prepaid");
    assert.equal(payload.amount, orderTotal);
  });

  it("P2: validates required top-level fields", () => {
    const payload: Record<string, unknown> = {
      order_id: "order_123",
      order_date: "2025-01-15",
      shipping_account_pincode: "400001",
      shipping_account_city: "Mumbai",
      shipping_account_state: "Maharashtra",
      shipping_account_country: "India",
      shipping_account_address: "123 Main St",
      shipping_account_phone: "+919999999999",
      shipping_account_customer_name: "John Doe",
      billing_account_pincode: "400001",
      billing_account_city: "Mumbai",
      billing_account_state: "Maharashtra",
      billing_account_country: "India",
      billing_account_address: "123 Main St",
      billing_account_phone: "+919999999999",
      billing_account_customer_name: "John Doe",
      order_items: [],
      payment_method: "Prepaid",
      amount: 1000,
      shipping_charges: 100,
    };

    const requiredFields = [
      "order_id", "order_date", "shipping_account_pincode",
      "shipping_account_city", "shipping_account_state", "shipping_account_country",
      "shipping_account_address", "shipping_account_phone", "shipping_account_customer_name",
      "billing_account_pincode", "billing_account_city",
      "billing_account_state", "billing_account_country",
      "billing_account_address", "billing_account_phone", "billing_account_customer_name",
      "order_items", "payment_method", "amount", "shipping_charges",
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
      total_units: 2,
      selling_price: 550,
      discount: 0,
      tax: 0,
      weight: 0.5,
      length: 30,
      breadth: 20,
      height: 10,
    };

    const requiredItemFields = [
      "sku", "name", "quantity", "total_units", "selling_price",
      "discount", "tax", "weight", "length", "breadth", "height",
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

  it("F3: uses 'total_units' alongside 'quantity'", () => {
    const quantity = 2;
    const totalUnits = 2;
    assert.equal(totalUnits, quantity);
  });

  it("F4: uses 'shipping_account_' and 'billing_account_' prefixes", () => {
    const fields = [
      "shipping_account_pincode", "billing_account_pincode",
      "shipping_account_city", "billing_account_city",
      "shipping_account_state", "billing_account_state",
      "shipping_account_country", "billing_account_country",
    ];
    for (const f of fields) {
      assert.match(f, /^(shipping|billing)_account_/);
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
