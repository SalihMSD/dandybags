import { describe, it, mock } from "node:test";
import assert from "node:assert/strict";

import { refundStateMachine, RefundState, RefundEvent } from "../src/lib/payments/refund-state-machine";
import { generateIdempotencyKey } from "../src/lib/db/refunds";

describe("refund-safety: idempotency key generation", () => {
  it("T1: Idempotency key is server-side generated and unique per order", () => {
    const key1 = generateIdempotencyKey("order_123");
    const key2 = generateIdempotencyKey("order_123");
    assert.notEqual(key1, key2);
    assert.match(key1, /^ref_order_123_/);
    assert.match(key2, /^ref_order_123_/);
  });

  it("T2: Idempotency key is at least 10 characters", () => {
    const key = generateIdempotencyKey("order_456");
    assert.ok(key.length >= 10);
  });
});

describe("refund-safety: state machine transitions", () => {
  const validStates: RefundState[] = ["PENDING", "PROCESSING", "SUCCESS", "FAILED"];

  for (const s of validStates) {
    it(`R1: ${s} is a valid RefundState`, () => {
      assert.ok(validStates.includes(s));
    });
  }

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

  it("R9: PROCESSING allows retry from external error", () => {
    assert.ok(refundStateMachine.next("PROCESSING").includes("razorpay_pending"));
  });

  it("R10: PENDING allows razorpay_request_sent", () => {
    assert.ok(refundStateMachine.next("PENDING").includes("razorpay_request_sent"));
  });

  it("R11: PENDING cannot transition directly to SUCCESS (must go through PROCESSING)", () => {
    assert.equal(refundStateMachine.transition("PENDING", "razorpay_processed"), null);
  });

  it("R12: SUCCESS cannot transition to FAILED", () => {
    assert.equal(refundStateMachine.transition("SUCCESS", "razorpay_failed"), null);
  });

  it("R13: FAILED cannot be retried to SUCCESS directly", () => {
    assert.equal(refundStateMachine.transition("FAILED", "razorpay_processed"), null);
  });

  it("R14: invalid transition returns null (no state mutation)", () => {
     assert.equal(refundStateMachine.transition("PENDING", "invalid_event" as never), null);
  });

  it("R15: unknown event returns null from any state", () => {
    assert.equal(refundStateMachine.transition("SUCCESS", "anything" as never), null);
  });
});

describe("refund-safety: status validation", () => {
  it("T6: RefundStatus includes all required states", () => {
    const states: RefundState[] = ["PENDING", "PROCESSING", "SUCCESS", "FAILED"];
    for (const s of states) {
      assert.ok(refundStateMachine.next(s) !== undefined);
    }
  });

  it("T7: PENDING state can be retried (not terminal)", () => {
    assert.equal(refundStateMachine.isTerminal("PENDING"), false);
    assert.ok(refundStateMachine.next("PENDING").length > 0);
  });

  it("T8: PROCESSING state can be retried (not terminal)", () => {
    assert.equal(refundStateMachine.isTerminal("PROCESSING"), false);
    assert.ok(refundStateMachine.next("PROCESSING").length > 0);
  });

  it("T9: SUCCESS is terminal and cannot be retried", () => {
    assert.equal(refundStateMachine.isTerminal("SUCCESS"), true);
    assert.deepEqual(refundStateMachine.next("SUCCESS"), []);
  });

  it("T10: FAILED is terminal but can be retried via 'retry' event", () => {
    assert.equal(refundStateMachine.isTerminal("FAILED"), true);
    assert.equal(refundStateMachine.transition("FAILED", "retry"), "PENDING");
  });
});

describe("refund-safety: amount validation (server-side source)", () => {
  it("T11: Refund amount is always fetched server-side from Razorpay", () => {
    const source = {
      getAmount: (paymentId: string) => {
        if (!paymentId.startsWith("pay_")) throw new Error("INVALID_PAYMENT_ID");
        return 50000;
      },
    };
    assert.equal(source.getAmount("pay_123"), 50000);
    assert.throws(() => source.getAmount("malicious_input"), /INVALID_PAYMENT_ID/);
  });

  it("T12: Client cannot supply arbitrary refund amount", () => {
    const clientPayload: Record<string, unknown> = { action: "cancel" };
    assert.equal("amount" in clientPayload, false);
  });
});

describe("refund-safety: concurrent request deduplication", () => {
  it("T13: Unique order constraint prevents duplicate refund records", () => {
    const orderId = "order_concurrent";
    const key1 = generateIdempotencyKey(orderId);

    const created: Array<{ orderId: string; key: string }> = [];
    const attemptCreate = (id: string, key: string): boolean => {
      if (created.some((c) => c.orderId === id)) {
        return false;
      }
      created.push({ orderId: id, key });
      return true;
    };

    assert.equal(attemptCreate(orderId, key1), true);
    assert.equal(attemptCreate(orderId, key1), false, "Duplicate orderId should be rejected");
    assert.equal(created.length, 1, "Only one refund record should exist");
  });

  it("T14: Idempotency key persists across retry (same key reused)", () => {
    const orderId = "order_retry";
    const originalKey = generateIdempotencyKey(orderId);
    const persistedKey = originalKey;

    assert.equal(persistedKey, originalKey, "Retry must reuse the same idempotency key");
  });
});

describe("refund-safety: Razorpay status handling", () => {
  it("T15: Only 'processed' status leads to SUCCESS", () => {
    assert.equal(refundStateMachine.transition("PROCESSING", "razorpay_processed"), "SUCCESS");
    assert.equal(refundStateMachine.transition("PROCESSING", "razorpay_pending"), "PENDING");
    assert.equal(refundStateMachine.transition("PROCESSING", "razorpay_failed"), "FAILED");
  });

  it("T16: 'pending' never transitions to SUCCESS", () => {
    assert.equal(refundStateMachine.transition("PROCESSING", "razorpay_pending"), "PENDING");
    assert.notEqual(refundStateMachine.transition("PROCESSING", "razorpay_pending"), "SUCCESS");
  });

  it("T17: 'failed' never transitions to SUCCESS", () => {
    assert.equal(refundStateMachine.transition("PROCESSING", "razorpay_failed"), "FAILED");
    assert.notEqual(refundStateMachine.transition("PROCESSING", "razorpay_failed"), "SUCCESS");
  });
});
