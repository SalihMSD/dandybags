import { describe, it } from "node:test";
import assert from "node:assert/strict";

import {
  isReviewableOrder,
  allowedNextStatuses,
  canTransition,
  isOrderStatus,
  ORDER_STATUSES,
} from "../src/lib/db/order-status";

describe("order-status: isReviewableOrder", () => {
  it("T1: PAID + non-cancelled order is reviewable", () => {
    assert.equal(isReviewableOrder("DELIVERED", "PAID"), true);
    assert.equal(isReviewableOrder("CONFIRMED", "PAID"), true);
    assert.equal(isReviewableOrder("SHIPPED", "PAID"), true);
    assert.equal(isReviewableOrder("PLACED", "PAID"), true);
  });

  it("T2: CANCELLED order is NOT reviewable (even if PAID)", () => {
    assert.equal(isReviewableOrder("CANCELLED", "PAID"), false);
  });

  it("T3: PENDING payment is NOT reviewable", () => {
    assert.equal(isReviewableOrder("DELIVERED", "PENDING"), false);
  });

  it("T4: FAILED payment is NOT reviewable", () => {
    assert.equal(isReviewableOrder("DELIVERED", "FAILED"), false);
  });

  it("T5: CANCELLED + PENDING is NOT reviewable", () => {
    assert.equal(isReviewableOrder("CANCELLED", "PENDING"), false);
  });
});

describe("order-status: cancellation transition guard", () => {
  it("T6: PLACED can transition to CANCELLED", () => {
    assert.equal(canTransition("PLACED", "CANCELLED"), true);
  });

  it("T7: DELIVERED cannot transition to CANCELLED", () => {
    assert.equal(canTransition("DELIVERED", "CANCELLED"), false);
  });

  it("T8: SHIPPED cannot transition back to PLACED", () => {
    assert.equal(canTransition("SHIPPED", "PLACED"), false);
  });

  it("T9: CANCELLED has no allowed next statuses (terminal)", () => {
    assert.deepEqual(allowedNextStatuses("CANCELLED"), []);
  });

  it("T10: isOrderStatus validates known statuses", () => {
    for (const s of ORDER_STATUSES) {
      assert.equal(isOrderStatus(s), true);
    }
    assert.equal(isOrderStatus("REFUNDED"), false);
    assert.equal(isOrderStatus("returned"), false);
  });
});
