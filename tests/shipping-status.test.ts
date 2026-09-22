import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  SHIPMENT_STATUSES,
  ShipmentStatus,
  isShipmentStatus,
  isShipmentCancelable,
  isShipmentFinal,
  canTransitionShipmentStatus,
  assertShipmentStatus,
} from "@/lib/shipping/status";

describe("shipment status constants", () => {
  it("S1: SHIPMENT_STATUSES includes all expected statuses", () => {
    assert.deepEqual(
      [...SHIPMENT_STATUSES],
      ["PENDING", "CREATED", "AWB_ASSIGNED", "PICKUP_SCHEDULED", "PICKED_UP", "IN_TRANSIT", "OUT_FOR_DELIVERY", "DELIVERED", "NDR", "RTO", "CANCELLED", "FAILED", "RECONCILIATION_REQUIRED"],
    );
  });

  it("S2: PENDING is the initial status", () => {
    assert.equal(SHIPMENT_STATUSES[0], "PENDING");
  });
});

describe("shipment status validation", () => {
  it("S3: isShipmentStatus returns true for valid statuses", () => {
    for (const status of SHIPMENT_STATUSES) {
      assert.equal(isShipmentStatus(status), true, `Expected ${status} to be valid`);
    }
  });

  it("S4: isShipmentStatus returns false for invalid statuses", () => {
    assert.equal(isShipmentStatus("INVALID"), false);
    assert.equal(isShipmentStatus(""), false);
    assert.equal(isShipmentStatus("PENDING "), false);
    assert.equal(isShipmentStatus("pending"), false);
    assert.equal(isShipmentStatus("DELIVERED " as never), false);
  });

  it("S5: assertShipmentStatus returns the value for valid status", () => {
    assert.equal(assertShipmentStatus("PENDING"), "PENDING");
    assert.equal(assertShipmentStatus("DELIVERED"), "DELIVERED");
  });

  it("S6: assertShipmentStatus throws for invalid status", () => {
    assert.throws(() => assertShipmentStatus("INVALID"));
  });
});

describe("shipment cancelability", () => {
  it("S7: PENDING is cancelable", () => {
    assert.equal(isShipmentCancelable("PENDING"), true);
  });

  it("S8: AWB_ASSIGNED is cancelable", () => {
    assert.equal(isShipmentCancelable("AWB_ASSIGNED"), true);
  });

  it("S9: PICKED_UP is NOT cancelable (already in cancelable set?)", () => {
    assert.equal(isShipmentCancelable("PICKED_UP"), false);
  });

  it("S10: IN_TRANSIT is NOT cancelable", () => {
    assert.equal(isShipmentCancelable("IN_TRANSIT"), false);
  });

  it("S11: DELIVERED is NOT cancelable", () => {
    assert.equal(isShipmentCancelable("DELIVERED"), false);
  });

  it("S12: CANCELLED is NOT cancelable", () => {
    assert.equal(isShipmentCancelable("CANCELLED"), false);
  });

  it("S13: FAILED is NOT cancelable", () => {
    assert.equal(isShipmentCancelable("FAILED"), false);
  });
});

describe("shipment terminal status", () => {
  it("S14: DELIVERED is terminal (final)", () => {
    assert.equal(isShipmentFinal("DELIVERED"), true);
  });

  it("S15: CANCELLED is terminal (final)", () => {
    assert.equal(isShipmentFinal("CANCELLED"), true);
  });

  it("S16: FAILED is terminal (final)", () => {
    assert.equal(isShipmentFinal("FAILED"), true);
  });

  it("S16b: RTO is terminal (final)", () => {
    assert.equal(isShipmentFinal("RTO"), true);
  });

  it("S17: PENDING is NOT terminal", () => {
    assert.equal(isShipmentFinal("PENDING"), false);
  });

  it("S18: IN_TRANSIT is NOT terminal", () => {
    assert.equal(isShipmentFinal("IN_TRANSIT"), false);
  });
});

describe("shipment status transitions", () => {
  it("S19: PENDING -> AWB_ASSIGNED is allowed", () => {
    assert.equal(canTransitionShipmentStatus("PENDING", "AWB_ASSIGNED"), true);
  });

  it("S20: AWB_ASSIGNED -> PICKED_UP is allowed", () => {
    assert.equal(canTransitionShipmentStatus("AWB_ASSIGNED", "PICKED_UP"), true);
  });

  it("S21: PICKED_UP -> IN_TRANSIT is allowed", () => {
    assert.equal(canTransitionShipmentStatus("PICKED_UP", "IN_TRANSIT"), true);
  });

  it("S22: IN_TRANSIT -> DELIVERED is allowed", () => {
    assert.equal(canTransitionShipmentStatus("IN_TRANSIT", "DELIVERED"), true);
  });

  it("S23: IN_TRANSIT -> CANCELLED is allowed", () => {
    assert.equal(canTransitionShipmentStatus("IN_TRANSIT", "CANCELLED"), true);
  });

  it("S24: IN_TRANSIT -> FAILED is allowed", () => {
    assert.equal(canTransitionShipmentStatus("IN_TRANSIT", "FAILED"), true);
  });

  it("S25: DELIVERED -> anything is NOT allowed (terminal)", () => {
    assert.equal(canTransitionShipmentStatus("DELIVERED", "IN_TRANSIT"), false);
    assert.equal(canTransitionShipmentStatus("DELIVERED", "CANCELLED"), false);
    assert.equal(canTransitionShipmentStatus("DELIVERED", "FAILED"), false);
  });

  it("S26: CANCELLED -> anything is NOT allowed (terminal)", () => {
    assert.equal(canTransitionShipmentStatus("CANCELLED", "PENDING"), false);
    assert.equal(canTransitionShipmentStatus("CANCELLED", "IN_TRANSIT"), false);
  });

  it("S27: FAILED -> anything is NOT allowed (terminal)", () => {
    assert.equal(canTransitionShipmentStatus("FAILED", "PENDING"), false);
    assert.equal(canTransitionShipmentStatus("FAILED", "IN_TRANSIT"), false);
  });

  it("S28: same status transition is NOT allowed", () => {
    assert.equal(canTransitionShipmentStatus("PENDING", "PENDING"), false);
    assert.equal(canTransitionShipmentStatus("IN_TRANSIT", "IN_TRANSIT"), false);
  });

  it("S29: PENDING -> FAILED is allowed", () => {
    assert.equal(canTransitionShipmentStatus("PENDING", "FAILED"), true);
  });

  it("S30: PENDING -> CANCELLED is allowed", () => {
    assert.equal(canTransitionShipmentStatus("PENDING", "CANCELLED"), true);
  });
});
