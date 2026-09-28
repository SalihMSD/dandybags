import { describe, it } from "node:test";
import assert from "node:assert/strict";
import type { ShipmentDeps } from "@/lib/shipping/create-shipment";
import type { ShiprocketOrderLookupResult } from "@/lib/shiprocket/types";

const SHIPMENT_FIELDS = [
  "id",
  "orderId",
  "providerOrderId",
  "providerShipmentId",
  "awb",
  "courierName",
  "status",
  "trackingUrl",
  "labelUrl",
  "shippingCost",
  "pickupScheduledAt",
  "shippedAt",
  "deliveredAt",
  "cancelledAt",
  "failureReason",
  "idempotencyKey",
  "createdAt",
  "updatedAt",
] as const;

type ShipmentRecord = Record<(typeof SHIPMENT_FIELDS)[number], unknown> & {
  id: string;
  orderId: string;
  providerOrderId: string | null;
  providerShipmentId: string | null;
  awb: string | null;
  courierName: string | null;
  status: string;
  trackingUrl: string | null;
  labelUrl: string | null;
  shippingCost: unknown;
  pickupScheduledAt: Date | null;
  shippedAt: Date | null;
  deliveredAt: Date | null;
  cancelledAt: Date | null;
  failureReason: string | null;
  idempotencyKey: string;
  createdAt: Date;
  updatedAt: Date;
};

type CallRecord = { model: string; method: string; args: unknown[] };

function createMockDb(shipments: ShipmentRecord[] = []) {
  const calls: CallRecord[] = [];
  const state = {
    orders: {} as Record<string, any>,
    shipments: {} as Record<string, ShipmentRecord>,
    events: [] as Array<Record<string, unknown>>,
  };

  const now = () => new Date();

  for (const s of shipments) {
    state.shipments[s.id] = s;
  }

  const shipment = {
    findUnique: (args: any) => {
      calls.push({ model: "shipment", method: "findUnique", args: [args] });
      const id = args.where?.id;
      let found = state.shipments[id];

      if (!found) {
        const orderId = args.where?.orderId;
        if (orderId) {
          for (const k of Object.keys(state.shipments)) {
            if (state.shipments[k].orderId === orderId) {
              found = state.shipments[k];
              break;
            }
          }
        }
      }

      if (!found) return Promise.resolve(null);

      const select = args.select || {};
      const result: Record<string, unknown> = {};
      for (const key of Object.keys(select)) {
        if (select[key] === true && key in found) {
          result[key] = (found as any)[key];
        }
      }
      return Promise.resolve(Object.keys(result).length > 0 ? result : { ...found });
    },
    findFirst: (args: any) => {
      calls.push({ model: "shipment", method: "findFirst", args: [args] });
      const orderId = args.where?.orderId;
      if (orderId) {
        for (const k of Object.keys(state.shipments)) {
          if (state.shipments[k].orderId === orderId) {
            const s = state.shipments[k];
            const select = args.select || {};
            const result: Record<string, unknown> = {};
            for (const key of Object.keys(select)) {
              if (select[key] === true && key in s) {
                result[key] = (s as any)[key];
              }
            }
            return Promise.resolve(Object.keys(result).length > 0 ? result : { ...s });
          }
        }
      }
      return Promise.resolve(null);
    },
    update: (args: any) => {
      calls.push({ model: "shipment", method: "update", args: [args] });
      const id = args.where?.id;
      const record = state.shipments[id];
      if (!record) return Promise.resolve(null);
      const data = args.data;
      for (const key of SHIPMENT_FIELDS) {
        if (data[key] !== undefined) {
          (record as any)[key] = data[key];
        }
      }
      record.updatedAt = now();
      return Promise.resolve({ id, ...data });
    },
    updateMany: (args: any) => {
      calls.push({ model: "shipment", method: "updateMany", args: [args] });
      const orderId = args.where?.orderId;
      let count = 0;
      if (orderId) {
        for (const k of Object.keys(state.shipments)) {
          if (state.shipments[k].orderId === orderId) {
            count++;
          }
        }
      }
      return Promise.resolve({ count });
    },
  };

  const shipmentEvent = {
    findFirst: () => Promise.resolve(null),
    create: (args: any) => {
      calls.push({ model: "shipmentEvent", method: "create", args: [args] });
      const event = { id: `evt_${Date.now()}`, ...args.data };
      state.events.push(event);
      return Promise.resolve({ id: event.id });
    },
  };

  const order = {
    findUnique: (args: any) => {
      calls.push({ model: "order", method: "findUnique", args: [args] });
      const found = state.orders[args.where?.id];
      return Promise.resolve(found ? { ...found, items: found.items || [] } : null);
    },
  };

  const product = {
    findMany: () => Promise.resolve([]),
  };

  const locks: Record<string, boolean> = {};

  const db: any = {
    shipment,
    shipmentEvent,
    order,
    product,
    $executeRaw: (query: TemplateStringsArray, ...values: unknown[]) => {
      const sql = query.join("");
      const key = values.find((v) => typeof v === "string" && v.startsWith("shipment:")) as string | undefined;
      const lockKey = key ?? "default";
      if (sql.includes("pg_advisory_lock")) {
        locks[lockKey] = true;
        return Promise.resolve(null);
      }
      if (sql.includes("pg_advisory_unlock")) {
        delete locks[lockKey];
        return Promise.resolve(null);
      }
      return Promise.resolve(null);
    },
    $executeRawUnsafe: () => Promise.resolve(null),
    $transaction: async (cb: (tx: unknown) => Promise<unknown>) => cb(db),
  };

  return {
    db,
    state,
    calls,
    setOrder: (id: string, data: any) => {
      state.orders[id] = data;
    },
    setShipment: (record: Partial<ShipmentRecord> & { id: string; orderId: string }) => {
      const full: ShipmentRecord = {
        providerOrderId: null,
        providerShipmentId: null,
        awb: null,
        courierName: null,
        status: "PENDING",
        trackingUrl: null,
        labelUrl: null,
        shippingCost: null,
        pickupScheduledAt: null,
        shippedAt: null,
        deliveredAt: null,
        cancelledAt: null,
        failureReason: null,
        idempotencyKey: `shp_${record.orderId}`,
        createdAt: now(),
        updatedAt: now(),
        ...record,
      } as ShipmentRecord;
      state.shipments[full.id] = full;
    },
    getCalls: (model: string, method: string) =>
      calls.filter((c) => c.model === model && c.method === method),
    callCount: (model: string, method: string) =>
      calls.filter((c) => c.model === model && c.method === method).length,
  };
}

function makeBaseDeps(db: any): ShipmentDeps {
  return {
    prisma: db,
    isShiprocketConfigured: () => true,
    createOrder: () =>
      Promise.resolve({
        order_id: "DND-TEST01",
        order_date: "2026-09-28",
        order_status: "ORDER_CREATED",
        message: "Order created successfully",
        shipment_id: 1234567890,
        awb_code: null,
      }),
    assignAWB: () => Promise.resolve({ status_code: 200, status: true, message: "ok" }),
    schedulePickup: () => Promise.resolve({ status_code: 200, status: true, message: "ok" }),
    generateLabel: () =>
      Promise.resolve({ status_code: 200, status: true, message: "ok", data: { url: "https://label.test/1" } }),
    reconcileShirocketOrder: () => Promise.resolve(null),
  };
}

function makeLookupResult(
  overrides: Partial<ShiprocketOrderLookupResult> = {},
): ShiprocketOrderLookupResult {
  return {
    providerOrderId: "16047755353",
    providerShipmentId: "16047755353",
    orderId: "7890123",
    awb: "AWB123456789",
    courierName: "DTDC",
    status: "ORDER_CREATED",
    ...overrides,
  };
}

function findUpdateWithProvider(updates: CallRecord[]): CallRecord | undefined {
  return updates.find((c) => {
    const data = (c.args[0] as any)?.data;
    return data && data.providerOrderId !== undefined;
  });
}

const PENDING_SHIPMENT = {
  id: "ship_pending_1",
  orderId: "DND-TEST01",
  providerOrderId: null,
  providerShipmentId: null,
  awb: null,
  courierName: null,
  status: "PENDING",
  trackingUrl: null,
  labelUrl: null,
  shippingCost: null,
  pickupScheduledAt: null,
  shippedAt: null,
  deliveredAt: null,
  cancelledAt: null,
  failureReason: "Shiprocket persistence error",
  idempotencyKey: "shp_DND-TEST01",
};

describe("reconcileShipmentForOrder — numeric ID conversion (BLOCKER 3)", () => {
  it("R1: numeric Shiprocket shipment_id is persisted as String", async () => {
    const ctx = createMockDb();
    ctx.setShipment({ ...PENDING_SHIPMENT });
    ctx.setOrder("DND-TEST01", { id: "DND-TEST01", paymentStatus: "PAID", orderStatus: "PLACED", items: [] });

    const deps = makeBaseDeps(ctx.db);
    let createOrderCalled = false;
    deps.createOrder = () => {
      createOrderCalled = true;
      return Promise.resolve({} as any);
    };
    deps.reconcileShirocketOrder = () =>
      Promise.resolve(
        makeLookupResult({ providerOrderId: 16047755353 as any, providerShipmentId: 16047755353 as any }),
      );

    const { reconcileShipmentForOrder } = await import("@/lib/shipping/create-shipment");
    const result = await reconcileShipmentForOrder("DND-TEST01", deps);

    assert.equal(createOrderCalled, false, "createOrder must NOT be called during reconciliation");
    if (!result.ok) {
      assert.fail(`Expected success but got: ${result.error}`);
    } else if (result.action !== "reconciled") {
      assert.fail(`Expected reconciled action, got ${result.action}`);
    } else {
      assert.equal(result.shipment.providerOrderId, "16047755353", "providerOrderId must be a String");
      assert.equal(typeof result.shipment.providerOrderId, "string", "providerOrderId must be a String");
    }

    const updates = ctx.getCalls("shipment", "update");
    const persistedCall = findUpdateWithProvider(updates);
    assert.ok(persistedCall, "Should have persisted providerOrderId");
    const data = (persistedCall!.args[0] as any).data;
    assert.equal(typeof data.providerOrderId, "string");
    assert.equal(typeof data.providerShipmentId, "string");
  });

  it("R2: Shiprocket order_id and shipment_id are mapped to correct fields", async () => {
    const ctx = createMockDb();
    ctx.setShipment({ ...PENDING_SHIPMENT });
    ctx.setOrder("DND-TEST01", { id: "DND-TEST01", paymentStatus: "PAID", orderStatus: "PLACED", items: [] });

    const deps = makeBaseDeps(ctx.db);
    deps.reconcileShirocketOrder = () =>
      Promise.resolve(
        makeLookupResult({
          providerOrderId: 16047755353,
          providerShipmentId: 16047755353,
          orderId: 7890123,
        } as any),
      );

    const { reconcileShipmentForOrder } = await import("@/lib/shipping/create-shipment");
    const result = await reconcileShipmentForOrder("DND-TEST01", deps);

    if (!result.ok) {
      assert.fail(`Expected success but got: ${result.error}`);
    } else if (result.action !== "reconciled") {
      assert.fail(`Expected reconciled action, got ${result.action}`);
    } else {
      assert.equal(result.shipment.providerOrderId, "16047755353");
    }

    const updates = ctx.getCalls("shipment", "update");
    const dataCall = findUpdateWithProvider(updates);
    assert.ok(dataCall, "Should have a providerOrderId update call");
    const data = (dataCall!.args[0] as any).data;
    assert.equal(data.providerOrderId, "16047755353");
    assert.equal(data.providerShipmentId, "16047755353");
    assert.equal(data.status, "CREATED");
    assert.equal(data.awb, "AWB123456789");
    assert.equal(data.courierName, "DTDC");
    assert.equal(data.failureReason, null);
  });
});

describe("reconcileShipmentForOrder — existing remote order attached", () => {
  it("R3: existing remote order attached without createOrder and no duplicate", async () => {
    const ctx = createMockDb();
    ctx.setShipment({ ...PENDING_SHIPMENT });
    ctx.setOrder("DND-TEST01", { id: "DND-TEST01", paymentStatus: "PAID", orderStatus: "PLACED", items: [] });

    const deps = makeBaseDeps(ctx.db);
    let createOrderCalled = false;
    deps.createOrder = () => {
      createOrderCalled = true;
      return Promise.resolve({} as any);
    };
    deps.reconcileShirocketOrder = () =>
      Promise.resolve(makeLookupResult({ providerOrderId: 16047775753 as any }));

    const { reconcileShipmentForOrder } = await import("@/lib/shipping/create-shipment");
    const result = await reconcileShipmentForOrder("DND-TEST01", deps);

    assert.equal(createOrderCalled, false, "createOrder must NOT be called");
    if (!result.ok) {
      assert.fail(`Expected success: ${result.error}`);
    } else if (result.action !== "reconciled") {
      assert.fail(`Expected reconciled action, got ${result.action}`);
    } else {
      assert.equal(result.shipment.providerOrderId, "16047775753");
      assert.equal(result.shipment.status, "CREATED");
    }
  });

  it("R4: lookup returns null → no DB mutation, no createOrder, reports manual investigation", async () => {
    const ctx = createMockDb();
    ctx.setShipment({ ...PENDING_SHIPMENT });
    ctx.setOrder("DND-TEST01", { id: "DND-TEST01", paymentStatus: "PAID", orderStatus: "PLACED", items: [] });

    const deps = makeBaseDeps(ctx.db);
    let createOrderCalled = false;
    deps.createOrder = () => {
      createOrderCalled = true;
      return Promise.resolve({} as any);
    };
    deps.reconcileShirocketOrder = () => Promise.resolve(null);

    const beforeUpdates = ctx.getCalls("shipment", "update");

    const { reconcileShipmentForOrder } = await import("@/lib/shipping/create-shipment");
    const result = await reconcileShipmentForOrder("DND-TEST01", deps);

    assert.equal(createOrderCalled, false, "createOrder must NOT be called");
    if (result.ok) {
      assert.equal(result.action, "no_remote_order");
    } else {
      assert.fail(`Expected ok result with no_remote_order: ${result.error}`);
    }

    const afterUpdates = ctx.getCalls("shipment", "update");
    assert.equal(afterUpdates.length - beforeUpdates.length, 0, "No shipment.update should have been called");
  });
});

describe("reconcileShipmentForOrder — error and ambiguity handling", () => {
  it("R5: lookup throws → no DB mutation, no createOrder, fails safely", async () => {
    const ctx = createMockDb();
    ctx.setShipment({ ...PENDING_SHIPMENT });
    ctx.setOrder("DND-TEST01", { id: "DND-TEST01", paymentStatus: "PAID", orderStatus: "PLACED", items: [] });

    const deps = makeBaseDeps(ctx.db);
    let createOrderCalled = false;
    deps.createOrder = () => {
      createOrderCalled = true;
      return Promise.resolve({} as any);
    };
    deps.reconcileShirocketOrder = () => Promise.reject(new Error("Shiprocket API is down"));

    const beforeUpdates = ctx.getCalls("shipment", "update");

    const { reconcileShipmentForOrder } = await import("@/lib/shipping/create-shipment");
    const result = await reconcileShipmentForOrder("DND-TEST01", deps);

    assert.equal(createOrderCalled, false, "createOrder must NOT be called");
    if (result.ok) {
      assert.fail("Expected failure from lookup error");
    } else {
      assert.equal(result.code, "SHIPROCKET_API_ERROR");
      assert.equal(result.statusCode, 502);
    }

    const afterUpdates = ctx.getCalls("shipment", "update");
    assert.equal(afterUpdates.length - beforeUpdates.length, 0, "No shipment.update should have been called");
  });

  it("R6: invalid providerOrderId → fails safely without writing", async () => {
    const ctx = createMockDb();
    ctx.setShipment({ ...PENDING_SHIPMENT });
    ctx.setOrder("DND-TEST01", { id: "DND-TEST01", paymentStatus: "PAID", orderStatus: "PLACED", items: [] });

    const deps = makeBaseDeps(ctx.db);
    deps.reconcileShirocketOrder = () =>
      Promise.resolve(makeLookupResult({ providerOrderId: "undefined" as any, providerShipmentId: "undefined" as any }));

    const beforeUpdates = ctx.getCalls("shipment", "update");

    const { reconcileShipmentForOrder } = await import("@/lib/shipping/create-shipment");
    const result = await reconcileShipmentForOrder("DND-TEST01", deps);

    if (result.ok) {
      assert.fail("Expected failure for invalid providerOrderId");
    } else {
      assert.equal(result.code, "INVALID_PROVIDER_ID");
    }

    const afterUpdates = ctx.getCalls("shipment", "update");
    assert.equal(afterUpdates.length - beforeUpdates.length, 0, "No shipment.update should have been called for invalid ID");
  });

  it("R7: shipment already has providerOrderId → fails with SHIPMENT_ALREADY_ATTACHED", async () => {
    const ctx = createMockDb();
    ctx.setShipment({
      ...PENDING_SHIPMENT,
      providerOrderId: "sr_already_set",
      providerShipmentId: "sr_already_set",
    });
    ctx.setOrder("DND-TEST01", { id: "DND-TEST01", paymentStatus: "PAID", orderStatus: "PLACED", items: [] });

    const deps = makeBaseDeps(ctx.db);
    deps.reconcileShirocketOrder = () => Promise.resolve(makeLookupResult());

    const { reconcileShipmentForOrder } = await import("@/lib/shipping/create-shipment");
    const result = await reconcileShipmentForOrder("DND-TEST01", deps);

    if (result.ok) {
      assert.fail("Expected failure when providerOrderId already set");
    } else {
      assert.equal(result.code, "SHIPMENT_ALREADY_ATTACHED");
      assert.equal(result.statusCode, 409);
    }
  });
});

describe("reconcileShipmentForOrder — idempotency and locking", () => {
  it("R8: repeated reconciliation is idempotent — no duplicate writes after first", async () => {
    const ctx = createMockDb();
    ctx.setShipment({ ...PENDING_SHIPMENT });
    ctx.setOrder("DND-TEST01", { id: "DND-TEST01", paymentStatus: "PAID", orderStatus: "PLACED", items: [] });

    const deps = makeBaseDeps(ctx.db);
    deps.reconcileShirocketOrder = () =>
      Promise.resolve(makeLookupResult({ providerOrderId: 16047775753 as any }));

    const { reconcileShipmentForOrder } = await import("@/lib/shipping/create-shipment");

    await reconcileShipmentForOrder("DND-TEST01", deps);

    const updatesAfterFirst = ctx.getCalls("shipment", "update");
    const firstPersist = findUpdateWithProvider(updatesAfterFirst);
    assert.ok(firstPersist, "First reconciliation should persist providerOrderId");

    const result2 = await reconcileShipmentForOrder("DND-TEST01", deps);

    if (result2.ok) {
      assert.fail("Expected second reconciliation to fail since providerOrderId is now set");
    } else {
      assert.equal(result2.code, "SHIPMENT_ALREADY_ATTACHED");
    }

    const updatesAfterSecond = ctx.getCalls("shipment", "update");
    assert.equal(
      updatesAfterSecond.length - updatesAfterFirst.length,
      0,
      "No second write should occur",
    );
  });

  it("R9: concurrent recovery — advisory lock serializes without duplicate createOrder", async () => {
    const ctx = createMockDb();
    ctx.setShipment({ ...PENDING_SHIPMENT });
    ctx.setOrder("DND-TEST01", { id: "DND-TEST01", paymentStatus: "PAID", orderStatus: "PLACED", items: [] });

    const deps = makeBaseDeps(ctx.db);
    let createOrderCount = 0;
    deps.createOrder = () => {
      createOrderCount++;
      return Promise.resolve({} as any);
    };
    let reconcileCount = 0;
    deps.reconcileShirocketOrder = () => {
      reconcileCount++;
      return Promise.resolve(makeLookupResult({ providerOrderId: 16047775753 as any }));
    };

    const { reconcileShipmentForOrder } = await import("@/lib/shipping/create-shipment");

    const results = await Promise.allSettled([
      reconcileShipmentForOrder("DND-TEST01", deps),
      reconcileShipmentForOrder("DND-TEST01", deps),
      reconcileShipmentForOrder("DND-TEST01", deps),
    ]);

    const fulfilled = results.filter((r) => r.status === "fulfilled").length;
    assert.equal(fulfilled, 3, "All concurrent reconciliations should complete (serialized by lock)");
    assert.equal(createOrderCount, 0, "createOrder must NOT be called by any concurrent reconciliation");
    assert.equal(reconcileCount, 3, "reconcileShirocketOrder should be called by each attempt");
  });
});

describe("reconcileShipmentForOrder — edge cases and config", () => {
  it("R10: not configured → returns NOT_CONFIGURED", async () => {
    const ctx = createMockDb();
    ctx.setShipment({ ...PENDING_SHIPMENT });
    ctx.setOrder("DND-TEST01", { id: "DND-TEST01", paymentStatus: "PAID", orderStatus: "PLACED", items: [] });

    const deps = makeBaseDeps(ctx.db);
    deps.isShiprocketConfigured = () => false;

    const { reconcileShipmentForOrder } = await import("@/lib/shipping/create-shipment");
    const result = await reconcileShipmentForOrder("DND-TEST01", deps);

    if (result.ok) {
      assert.fail("Expected NOT_CONFIGURED");
    } else {
      assert.equal(result.code, "NOT_CONFIGURED");
      assert.equal(result.statusCode, 503);
    }
  });

  it("R11: no local shipment exists → returns SHIPMENT_NOT_FOUND", async () => {
    const ctx = createMockDb();
    ctx.setOrder("DND-NOSHIP", { id: "DND-NOSHIP", paymentStatus: "PAID", orderStatus: "PLACED", items: [] });

    const deps = makeBaseDeps(ctx.db);
    deps.reconcileShirocketOrder = () => Promise.resolve(makeLookupResult());

    const { reconcileShipmentForOrder } = await import("@/lib/shipping/create-shipment");
    const result = await reconcileShipmentForOrder("DND-NOSHIP", deps);

    if (result.ok) {
      assert.fail("Expected SHIPMENT_NOT_FOUND");
    } else {
      assert.equal(result.code, "SHIPMENT_NOT_FOUND");
      assert.equal(result.statusCode, 404);
    }
  });

  it("R12: FAILED shipment is reconcilable", async () => {
    const ctx = createMockDb();
    ctx.setShipment({
      ...PENDING_SHIPMENT,
      id: "ship_failed_recon",
      status: "FAILED",
      providerOrderId: null,
      failureReason: "API error",
    });
    ctx.setOrder("DND-TEST01", { id: "DND-TEST01", paymentStatus: "PAID", orderStatus: "PLACED", items: [] });

    const deps = makeBaseDeps(ctx.db);
    deps.reconcileShirocketOrder = () =>
      Promise.resolve(makeLookupResult({ providerOrderId: 16047775753 as any }));

    const { reconcileShipmentForOrder } = await import("@/lib/shipping/create-shipment");
    const result = await reconcileShipmentForOrder("DND-TEST01", deps);

    if (!result.ok) {
      assert.fail(`Expected success: ${result.error}`);
    } else if (result.action !== "reconciled") {
      assert.fail(`Expected reconciled action, got ${result.action}`);
    } else {
      assert.equal(result.shipment.status, "CREATED");
      assert.equal(result.shipment.failureReason, null);
    }
  });

  it("R13: non-retryable status (DELIVERED) → fails safely", async () => {
    const ctx = createMockDb();
    ctx.setShipment({
      ...PENDING_SHIPMENT,
      id: "ship_delivered",
      status: "DELIVERED",
      providerOrderId: null,
    });
    ctx.setOrder("DND-TEST01", { id: "DND-TEST01", paymentStatus: "PAID", orderStatus: "PLACED", items: [] });

    const deps = makeBaseDeps(ctx.db);
    deps.reconcileShirocketOrder = () => Promise.resolve(makeLookupResult());

    const { reconcileShipmentForOrder } = await import("@/lib/shipping/create-shipment");
    const result = await reconcileShipmentForOrder("DND-TEST01", deps);

    if (result.ok) {
      assert.fail("Expected failure for non-retryable status");
    } else {
      assert.equal(result.code, "STATUS_NOT_RECONCILABLE");
      assert.equal(result.statusCode, 409);
    }
  });
});
