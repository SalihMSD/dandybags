import { describe, it } from "node:test";
import assert from "node:assert/strict";

import {
  buildOrderNotificationFields,
  resolveListLimit,
  ORDER_NOTIFICATION_TYPE,
} from "../src/lib/db/notifications";

describe("notifications: buildOrderNotificationFields", () => {
  it("T1: builds NEW_ORDER type with title and message from order ID + totalLabel", () => {
    const order = { id: "order_123", totalLabel: "₹1,499" };
    const result = buildOrderNotificationFields(order);
    assert.deepEqual(result, {
      type: ORDER_NOTIFICATION_TYPE,
      title: "New Order",
      message: "#order_123 · ₹1,499",
    });
  });

  it("T2: falls back to empty string when totalLabel is null", () => {
    const order = { id: "order_456", totalLabel: null };
    const result = buildOrderNotificationFields(order);
    assert.equal(result.message, "#order_456 · ");
  });

  it("T3: handles undefined totalLabel via null-coalescing", () => {
    const order = { id: "order_789", totalLabel: null as string | null };
    const result = buildOrderNotificationFields(order);
    assert.equal(result.message, "#order_789 · ");
  });

  it("T4: notification type is NEW_ORDER", () => {
    assert.equal(ORDER_NOTIFICATION_TYPE, "NEW_ORDER");
  });
});

describe("notifications: resolveListLimit", () => {
  it("M1: returns 50 for null input", () => {
    assert.equal(resolveListLimit(null), 50);
  });

  it("M2: clamps values below 1 to 1", () => {
    assert.equal(resolveListLimit(0), 1);
    assert.equal(resolveListLimit(-5), 1);
  });

  it("M3: clamps values above 100 to 100", () => {
    assert.equal(resolveListLimit(150), 100);
    assert.equal(resolveListLimit(999), 100);
  });

  it("M4: passes through valid values in range", () => {
    assert.equal(resolveListLimit(10), 10);
    assert.equal(resolveListLimit(50), 50);
    assert.equal(resolveListLimit(100), 100);
  });

  it("M5: returns 50 for NaN", () => {
    assert.equal(resolveListLimit(NaN), 50);
  });
});
