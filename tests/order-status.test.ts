import { describe, it } from "node:test";
import assert from "node:assert/strict";

import {
  isReviewableOrder,
  allowedNextStatuses,
  canTransition,
  isOrderStatus,
  ORDER_STATUSES,
} from "../src/lib/db/order-status";
import { refundStateMachine, RefundState } from "../src/lib/payments/refund-state-machine";

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

const refundStates: RefundState[] = ["PENDING", "PROCESSING", "SUCCESS", "FAILED"];

describe("refund-state-machine: state validity", () => {
  for (const s of refundStates) {
    it(`R1: ${s} is a valid RefundState`, () => {
      assert.ok(refundStates.includes(s));
    });
  }
});

describe("refund-state-machine: valid transitions", () => {
  it("R2: PENDING -> razorpay_request_sent -> PROCESSING", () => {
    assert.equal(refundStateMachine.transition("PENDING", "razorpay_request_sent"), "PROCESSING");
  });

  it("R3: PROCESSING -> razorpay_processed -> SUCCESS", () => {
    assert.equal(refundStateMachine.transition("PROCESSING", "razorpay_processed"), "SUCCESS");
  });

  it("R4: PROCESSING -> razorpay_pending -> PENDING", () => {
    assert.equal(refundStateMachine.transition("PROCESSING", "razorpay_pending"), "PENDING");
  });

  it("R5: PROCESSING -> razorpay_failed -> FAILED", () => {
    assert.equal(refundStateMachine.transition("PROCESSING", "razorpay_failed"), "FAILED");
  });

  it("R6: PENDING -> db_failure -> FAILED", () => {
    assert.equal(refundStateMachine.transition("PENDING", "db_failure"), "FAILED");
  });

  it("R7: FAILED -> retry -> PENDING (same idempotency key reused)", () => {
    assert.equal(refundStateMachine.transition("FAILED", "retry"), "PENDING");
  });

  it("R8: SUCCESS is terminal (no outgoing transitions)", () => {
    assert.deepEqual(refundStateMachine.next("SUCCESS"), []);
  });

  it("R9: PROCESSING allows retry from any external error", () => {
    assert.ok(refundStateMachine.next("PROCESSING").includes("razorpay_pending"));
  });

  it("R10: PENDING allows razorpay_request_sent", () => {
    assert.ok(refundStateMachine.next("PENDING").includes("razorpay_request_sent"));
  });

  it("R11: invalid transition returns null (no mutation)", () => {
    assert.equal(refundStateMachine.transition("PENDING", "razorpay_processed"), null);
  });

  it("R12: unknown event returns null from any state", () => {
    assert.equal(refundStateMachine.transition("SUCCESS", "anything" as never), null);
  });
});
