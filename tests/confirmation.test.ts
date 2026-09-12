import { describe, it } from "node:test";
import assert from "node:assert/strict";

import {
  CONFIRMATION_TRIGGER_ACTION,
  shouldSendConfirmation,
  mapOrderToConfirmationInput,
  type ConfirmationOrder,
  type OrderConfirmationInput,
} from "../src/lib/auth/confirmation";

function fullOrder(overrides: Partial<ConfirmationOrder> = {}): ConfirmationOrder {
  return {
    id: "DND-1234abcd",
    totalLabel: "₹1,250",
    paymentStatus: "PAID",
    shipFullName: "Ravi Kumar",
    shipPhone: "+91-9000000000",
    shipLine1: "12 Main Road",
    shipLine2: "Near bus stop",
    shipCity: "Karur",
    shipState: "Tamil Nadu",
    shipPincode: "639002",
    user: { email: "ravi@example.com" },
    items: [
      { name: "School Bag", qty: 1 },
      { name: "Pencil Box", qty: 2 },
    ],
    ...overrides,
  };
}

describe("confirmation: trigger decision", () => {
  it("M3-H1: first successful capture (marked_paid) triggers confirmation", () => {
    assert.equal(shouldSendConfirmation(CONFIRMATION_TRIGGER_ACTION), true);
  });

  it("duplicate capture (already_paid) does NOT trigger confirmation", () => {
    assert.equal(shouldSendConfirmation("already_paid"), false);
  });

  it("cancelled order (skipped_cancelled) does NOT trigger confirmation", () => {
    assert.equal(shouldSendConfirmation("skipped_cancelled"), false);
  });

  it("insufficient stock (insufficient_stock) does NOT trigger confirmation", () => {
    assert.equal(shouldSendConfirmation("insufficient_stock"), false);
  });

  it("failed payment (marked_failed) does NOT trigger confirmation", () => {
    assert.equal(shouldSendConfirmation("marked_failed"), false);
  });

  it("every non-marked_paid action does NOT trigger confirmation", () => {
    const actions = [
      "already_paid",
      "skipped_cancelled",
      "skipped_unknown_order",
      "skipped_no_order_id",
      "insufficient_stock",
      "marked_failed",
      "unhandled_event",
      "",
      "payment.captured",
    ];
    for (const a of actions) {
      assert.equal(shouldSendConfirmation(a), false, `expected false for action=${JSON.stringify(a)}`);
    }
  });

  it("shouldSendConfirmation never throws for any string", () => {
    for (const a of ["", "marked_paid", "MARKED_PAID", "already_paid", "x".repeat(5000)]) {
      assert.equal(typeof shouldSendConfirmation(a), "boolean");
    }
  });
});

describe("confirmation: input mapping", () => {
  it("maps order fields to sendOrderConfirmation input", () => {
    const input: OrderConfirmationInput = mapOrderToConfirmationInput(fullOrder());
    assert.equal(input.to, "ravi@example.com");
    assert.equal(input.orderId, "DND-1234abcd");
    assert.equal(input.paymentStatus, "PAID");
    assert.equal(input.totalLabel, "₹1,250");
    assert.deepEqual(input.items, [
      { name: "School Bag", qty: 1 },
      { name: "Pencil Box", qty: 2 },
    ]);
    assert.deepEqual(input.shippingAddress, {
      fullName: "Ravi Kumar",
      phone: "+91-9000000000",
      line1: "12 Main Road",
      line2: "Near bus stop",
      city: "Karur",
      state: "Tamil Nadu",
      pincode: "639002",
    });
  });

  it("preserves PAID status for first-capture mapping (Stage 18D revenue semantics unchanged)", () => {
    const input = mapOrderToConfirmationInput(fullOrder({ paymentStatus: "PAID" }));
    assert.equal(input.paymentStatus, "PAID");
  });

  it("drops fields not expected by sendOrderConfirmation (no landmark/slug leak)", () => {
    const input = mapOrderToConfirmationInput(fullOrder());
    assert.equal("landmark" in input, false);
    assert.equal("shipLandmark" in input, false);
    const item = input.items[0];
    assert.equal("slug" in item, false);
    assert.equal("sku" in item, false);
  });

  it("handles minimal order (no line2) without throwing", () => {
    const input = mapOrderToConfirmationInput(
      fullOrder({ shipLine2: "", items: [{ name: "Bag", qty: 1 }] })
    );
    assert.equal(input.shippingAddress.line2, "");
    assert.equal(input.items.length, 1);
  });
});
