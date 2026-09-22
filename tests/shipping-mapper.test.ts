import { describe, it, beforeEach, afterEach } from "node:test";
import assert from "node:assert/strict";
import { buildShiprocketPayload, type OrderSnapshot, type ProductCatalogEntry } from "@/lib/shipping/mapper";

const VALID_ORDER: OrderSnapshot = {
  id: "DND-TEST01",
  totalLabel: "₹999",
  shipFullName: "Test User",
  shipPhone: "9999999999",
  shipEmail: "test@example.com",
  shipLine1: "123 Test Street",
  shipLine2: "Apt 4",
  shipCity: "Mumbai",
  shipState: "Maharashtra",
  shipPincode: "400001",
  shipLandmark: "Near park",
  shipCountry: "India",
  items: [{ sku: "DND-SCH-001", name: "School Bag", qty: 1, unitPrice: { toString: () => "500" } }],
};

const VALID_PRODUCTS: ProductCatalogEntry[] = [
  {
    sku: "DND-SCH-001",
    name: "School Bag",
    category: "school-bags",
    weight: "500g",
    length: "30cm",
    width: "20cm",
    height: "10cm",
  },
];

const VALID_PICKUP = "warehouse";

let savedEmail: string | undefined;
let savedPassword: string | undefined;
let savedPickup: string | undefined;

beforeEach(() => {
  savedEmail = process.env.SHIPROCKET_EMAIL;
  savedPassword = process.env.SHIPROCKET_PASSWORD;
  savedPickup = process.env.SHIPROCKET_PICKUP_LOCATION;
  process.env.SHIPROCKET_EMAIL = "test@example.com";
  process.env.SHIPROCKET_PASSWORD = "test_pass";
  process.env.SHIPROCKET_PICKUP_LOCATION = "warehouse";
});

afterEach(() => {
  if (savedEmail !== undefined) process.env.SHIPROCKET_EMAIL = savedEmail;
  else delete process.env.SHIPROCKET_EMAIL;
  if (savedPassword !== undefined) process.env.SHIPROCKET_PASSWORD = savedPassword;
  else delete process.env.SHIPROCKET_PASSWORD;
  if (savedPickup !== undefined) process.env.SHIPROCKET_PICKUP_LOCATION = savedPickup;
  else delete process.env.SHIPROCKET_PICKUP_LOCATION;
});

describe("shipment mapper — shipEmail validation", () => {
  it("M1: valid shipEmail passes validation and builds payload", () => {
    const result = buildShiprocketPayload(VALID_ORDER, VALID_PRODUCTS, VALID_PICKUP);
    assert.equal(result.ok, true);
    if (result.ok) {
      assert.equal(result.payload.shipping_email, "test@example.com");
      assert.equal(result.payload.billing_email, "test@example.com");
      assert.ok(result.idempotencyKey.startsWith("shp_"), "idempotencyKey should be generated");
    }
  });

  it("M2: missing shipEmail returns clear validation error", () => {
    const orderNoEmail = { ...VALID_ORDER, shipEmail: null };
    const result = buildShiprocketPayload(orderNoEmail, VALID_PRODUCTS, VALID_PICKUP);
    assert.equal(result.ok, false);
    if (!result.ok) {
      assert.ok(result.errors.some((e) => e.includes("shipEmail")), `Expected shipEmail error, got: ${result.errors.join("; ")}`);
    }
  });

  it("M3: empty-string shipEmail returns clear validation error", () => {
    const orderEmptyEmail = { ...VALID_ORDER, shipEmail: "" };
    const result = buildShiprocketPayload(orderEmptyEmail, VALID_PRODUCTS, VALID_PICKUP);
    assert.equal(result.ok, false);
    if (!result.ok) {
      assert.ok(result.errors.some((e) => e.includes("shipEmail")), `Expected shipEmail error, got: ${result.errors.join("; ")}`);
    }
  });
});
