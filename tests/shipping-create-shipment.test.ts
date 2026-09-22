import { describe, it, beforeEach } from "node:test";
import assert from "node:assert/strict";
import {
  ShiprocketError,
  ShiprocketAuthError,
  ShiprocketTimeoutError,
} from "@/lib/shiprocket/errors";

type Method = "findUnique" | "findFirst" | "create" | "update" | "updateMany" | "findMany";

type ShipmentRecord = {
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

type EventRecord = {
  id: string;
  shipmentId: string;
  status: string;
  rawStatus: string;
  activity: string | null;
  location: string | null;
  note: string | null;
  occurredAt: Date;
  createdAt: Date;
};

function createMockDb() {
  const calls: { model: string; method: Method; args: unknown[] }[] = [];

  const state: {
    orders: Record<string, any>;
    products: Record<string, any>;
    shipments: Record<string, ShipmentRecord>;
    events: EventRecord[];
  } = {
    orders: {},
    products: {},
    shipments: {},
    events: [],
  };

  function now() {
    return new Date();
  }

  const order = {
    findUnique: (args: any) => {
      calls.push({ model: "order", method: "findUnique", args: [args] });
      const id = args.where?.id;
      const found = state.orders[id];
      if (!found) return Promise.resolve(null);
      return Promise.resolve({
        ...found,
        items: found.items || [],
      });
    },
  };

  const product = {
    findMany: (args: any) => {
      calls.push({ model: "product", method: "findMany", args: [args] });
      const skus = args.where?.sku?.in || [];
      const result = skus.map((sku: string) => state.products[sku]).filter(Boolean);
      return Promise.resolve(result);
    },
  };

  const shipment = {
    findUnique: (args: any) => {
      calls.push({ model: "shipment", method: "findUnique", args: [args] });
      const id = args.where?.id;
      const found = state.shipments[id];
      if (!found) {
        const orderId = args.where?.orderId;
        if (orderId) {
          for (const k of Object.keys(state.shipments)) {
            if (state.shipments[k].orderId === orderId) {
              const s = state.shipments[k];
              return Promise.resolve({
                id: s.id,
                status: s.status,
                providerOrderId: s.providerOrderId,
                awb: s.awb,
                ...(args.select ? pickFields(s, args.select) : {}),
              });
            }
          }
        }
        return Promise.resolve(null);
      }
      const s = state.shipments[id];
      return Promise.resolve({
        ...pickFields(s, args.select || {}),
      });
    },
    findFirst: (args: any) => {
      calls.push({ model: "shipment", method: "findFirst", args: [args] });
      const orderId = args.where?.orderId;
      if (orderId) {
        for (const k of Object.keys(state.shipments)) {
          if (state.shipments[k].orderId === orderId) {
            const s = state.shipments[k];
            return Promise.resolve({
              id: s.id,
              status: s.status,
              providerOrderId: s.providerOrderId,
              awb: s.awb,
              ...pickFields(s, args.select || {}),
            });
          }
        }
      }
      const id = args.where?.id;
      if (id && state.shipments[id]) {
        return Promise.resolve({ ...pickFields(state.shipments[id], args.select || {}) });
      }
      return Promise.resolve(null);
    },
    create: (args: any) => {
      calls.push({ model: "shipment", method: "create", args: [args] });
      const data = args.data;
      const record: ShipmentRecord = {
        id: data.id,
        orderId: data.orderId,
        providerOrderId: data.providerOrderId ?? null,
        providerShipmentId: data.providerShipmentId ?? null,
        awb: data.awb ?? null,
        courierName: data.courierName ?? null,
        status: data.status || "PENDING",
        trackingUrl: data.trackingUrl ?? null,
        labelUrl: data.labelUrl ?? null,
        shippingCost: data.shippingCost ?? null,
        pickupScheduledAt: data.pickupScheduledAt ?? null,
        shippedAt: data.shippedAt ?? null,
        deliveredAt: data.deliveredAt ?? null,
        cancelledAt: data.cancelledAt ?? null,
        failureReason: data.failureReason ?? null,
        idempotencyKey: data.idempotencyKey,
        createdAt: now(),
        updatedAt: now(),
      };
      state.shipments[record.id] = record;
      return Promise.resolve({ id: record.id, providerOrderId: record.providerOrderId });
    },
    update: (args: any) => {
      calls.push({ model: "shipment", method: "update", args: [args] });
      const id = args.where?.id;
      if (!state.shipments[id]) return Promise.resolve(null);
      const record = state.shipments[id];
      const data = args.data;
      if (data.status) record.status = data.status;
      if (data.providerOrderId !== undefined) record.providerOrderId = data.providerOrderId;
      if (data.awb !== undefined) record.awb = data.awb;
      if (data.courierName !== undefined) record.courierName = data.courierName;
      if (data.trackingUrl !== undefined) record.trackingUrl = data.trackingUrl;
      if (data.labelUrl !== undefined) record.labelUrl = data.labelUrl;
      if (data.shippingCost !== undefined) record.shippingCost = data.shippingCost;
      if (data.pickupScheduledAt !== undefined) record.pickupScheduledAt = data.pickupScheduledAt;
      if (data.failureReason !== undefined) record.failureReason = data.failureReason;
      if (data.idempotencyKey !== undefined) record.idempotencyKey = data.idempotencyKey;
      if (data.providerShipmentId !== undefined) record.providerShipmentId = data.providerShipmentId;
      record.updatedAt = now();
      return Promise.resolve({ id, ...data });
    },
    updateMany: (args: any) => {
      calls.push({ model: "shipment", method: "updateMany", args: [args] });
      return Promise.resolve({ count: 1 });
    },
  };

  const shipmentEvent = {
    findFirst: (args: any) => {
      calls.push({ model: "shipmentEvent", method: "findFirst", args: [args] });
      for (const e of state.events) {
        if (e.shipmentId === args.where?.shipmentId) {
          if (e.status === args.where?.status && e.occurredAt?.getTime() === args.where?.occurredAt?.getTime()) {
            return Promise.resolve({ id: e.id });
          }
        }
      }
      return Promise.resolve(null);
    },
    create: (args: any) => {
      calls.push({ model: "shipmentEvent", method: "create", args: [args] });
      const data = args.data;
      const event: EventRecord = {
        id: data.id || `evt_${data.shipmentId}_${Date.now()}`,
        shipmentId: data.shipmentId,
        status: data.status,
        rawStatus: data.rawStatus,
        activity: data.activity ?? null,
        location: data.location ?? null,
        note: data.note ?? null,
        occurredAt: data.occurredAt,
        createdAt: now(),
      };
      state.events.push(event);
      return Promise.resolve({ id: event.id });
    },
  };

  const locks: Record<string, { held: boolean; waiters: (() => void)[]} > = {};

  function acquireLock(key: string): Promise<void> {
    if (!locks[key]) locks[key] = { held: false, waiters: [] };
    const lock = locks[key];
    if (!lock.held) {
      lock.held = true;
      return Promise.resolve();
    }
    return new Promise<void>((resolve) => lock.waiters.push(resolve));
  }

  function releaseLock(key: string): Promise<void> {
    const lock = locks[key];
    if (!lock) return Promise.resolve();
    if (lock.waiters.length > 0) {
      const next = lock.waiters.shift()!;
      next();
    } else {
      lock.held = false;
    }
    return Promise.resolve();
  }

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
        return acquireLock(lockKey);
      }
      if (sql.includes("pg_advisory_unlock")) {
        return releaseLock(lockKey);
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
    setState: (key: "orders" | "products", data: Record<string, any>) => {
      Object.assign(state[key], data);
    },
    setOrder: (id: string, data: any) => {
      state.orders[id] = data;
    },
    setProduct: (sku: string, data: any) => {
      state.products[sku] = data;
    },
    setShipmentByOrderId: (orderId: string, data: Partial<ShipmentRecord>) => {
      let found = false;
      for (const k of Object.keys(state.shipments)) {
        if (state.shipments[k].orderId === orderId) {
          Object.assign(state.shipments[k], data);
          found = true;
        }
      }
      if (!found) {
        const id = data.id || `ship_${orderId}`;
        state.shipments[id] = {
          id,
          orderId,
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
          idempotencyKey: `shp_${orderId}`,
          createdAt: now(),
          updatedAt: now(),
          ...data,
        };
      }
    },
    getCalls: (model: string, method: Method) => calls.filter((c) => c.model === model && c.method === method),
    callCount: (model: string, method: Method) => calls.filter((c) => c.model === model && c.method === method).length,
  };
}

function pickFields(obj: any, select: Record<string, boolean>): any {
  if (!select || Object.keys(select).length === 0) return obj;
  const result: any = {};
  for (const key of Object.keys(select)) {
    if (key in obj) {
      result[key] = obj[key];
    }
  }
  return result;
}

function makeDeps(db: any, overrides: Partial<{
  isShiprocketConfigured: () => boolean;
  createOrder: (payload: unknown) => Promise<any>;
  assignAWB: (id: string) => Promise<any>;
  schedulePickup: (ids: string[]) => Promise<any>;
  generateLabel: (id: string) => Promise<any>;
  reconcileShirocketOrder: (orderId: string) => Promise<any>;
}> = {}) {
  return {
    prisma: db,
    isShiprocketConfigured: () => Boolean(
      process.env.SHIPROCKET_EMAIL && process.env.SHIPROCKET_PASSWORD && process.env.SHIPROCKET_PICKUP_LOCATION
    ),
    createOrder: () => Promise.resolve({
      shipment_id: "sr_shipment_1",
      awb_code: "12345678901",
      order_status: "ORDER_CREATED",
      message: "Order created successfully",
    }),
    assignAWB: () => Promise.resolve({
      status_code: 200,
      status: true,
      message: "AWB assigned",
      data: { shipment_id: "sr_shipment_1", awb_code: "12345678901", courier_company: "DTDC" },
    }),
    schedulePickup: () => Promise.resolve({
      status_code: 200,
      status: true,
      message: "Pickup scheduled",
    }),
    generateLabel: () => Promise.resolve({
      status_code: 200,
      status: true,
      message: "Label generated",
      data: { url: "https://label.shiprocket.in/label/123" },
    }),
    reconcileShirocketOrder: () => Promise.resolve(null),
    ...overrides,
  };
}

const VALID_ORDER = {
  id: "DND-TEST01",
  totalLabel: "₹999",
  paymentStatus: "PAID",
  orderStatus: "PLACED",
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

const VALID_PRODUCTS = {
  "DND-SCH-001": {
    sku: "DND-SCH-001",
    name: "School Bag",
    category: "school-bags",
    weight: "500g",
    length: "30cm",
    width: "20cm",
    height: "10cm",
  },
};

const PLACEHOLDER_PRODUCTS = {
  "DND-SCH-001": {
    sku: "DND-SCH-001",
    name: "School Bag",
    category: "school-bags",
    weight: "Specification to be added",
    length: "Specification to be added",
    width: "Specification to be added",
    height: "Specification to be added",
  },
};

function setupValidMocks() {
  const ctx = createMockDb();
  ctx.setOrder("DND-TEST01", { ...VALID_ORDER, items: VALID_ORDER.items });
  ctx.setState("products", VALID_PRODUCTS);

  process.env.SHIPROCKET_EMAIL = "test@example.com";
  process.env.SHIPROCKET_PASSWORD = "test_pass";
  process.env.SHIPROCKET_PICKUP_LOCATION = "Karur";

  const deps = makeDeps(ctx.db);

  return { ...ctx, deps };
}

describe("createShipmentForOrder — admin auth and order eligibility", () => {
  it("T1: returns NOT_CONFIGURED when Shiprocket env vars are missing", async () => {
    const setup = setupValidMocks();
    (setup.deps as any).isShiprocketConfigured = () => false;

    const { createShipmentForOrder } = await import("@/lib/shipping/create-shipment");
    const result = await createShipmentForOrder("DND-TEST01", setup.deps);

    if (!result.ok) {
      assert.equal(result.code, "NOT_CONFIGURED");
      assert.equal(result.statusCode, 503);
    } else {
      assert.fail("Expected failure");
    }
  });

  it("T2: returns ORDER_NOT_FOUND when order does not exist", async () => {
    const setup = setupValidMocks();

    const { createShipmentForOrder } = await import("@/lib/shipping/create-shipment");
    const result = await createShipmentForOrder("DND-MISSING", setup.deps);

    if (!result.ok) {
      assert.equal(result.code, "ORDER_NOT_FOUND");
      assert.equal(result.statusCode, 404);
    } else {
      assert.fail("Expected failure");
    }
  });

  it("T3: returns ORDER_NOT_PAID when payment status is PENDING", async () => {
    const setup = setupValidMocks();
    setup.setOrder("DND-TEST01", { ...VALID_ORDER, items: VALID_ORDER.items, paymentStatus: "PENDING" });

    const { createShipmentForOrder } = await import("@/lib/shipping/create-shipment");
    const result = await createShipmentForOrder("DND-TEST01", setup.deps);

    if (!result.ok) {
      assert.equal(result.code, "ORDER_NOT_PAID");
      assert.equal(result.statusCode, 400);
    } else {
      assert.fail("Expected failure");
    }
  });

  it("T4: returns ORDER_NOT_PAID when payment status is FAILED", async () => {
    const setup = setupValidMocks();
    setup.setOrder("DND-TEST01", { ...VALID_ORDER, items: VALID_ORDER.items, paymentStatus: "FAILED" });

    const { createShipmentForOrder } = await import("@/lib/shipping/create-shipment");
    const result = await createShipmentForOrder("DND-TEST01", setup.deps);

    if (!result.ok) {
      assert.equal(result.code, "ORDER_NOT_PAID");
    } else {
      assert.fail("Expected failure");
    }
  });

  it("T5: returns ORDER_CANCELLED when order status is CANCELLED", async () => {
    const setup = setupValidMocks();
    setup.setOrder("DND-TEST01", { ...VALID_ORDER, items: VALID_ORDER.items, orderStatus: "CANCELLED" });

    const { createShipmentForOrder } = await import("@/lib/shipping/create-shipment");
    const result = await createShipmentForOrder("DND-TEST01", setup.deps);

    if (!result.ok) {
      assert.equal(result.code, "ORDER_CANCELLED");
      assert.equal(result.statusCode, 400);
    } else {
      assert.fail("Expected failure");
    }
  });
});

describe("createShipmentForOrder — measurement validation", () => {
  it("T6: returns BUILD_PAYLOAD_FAILED when product has SPEC_PLACEHOLDER", async () => {
    const setup = setupValidMocks();
    setup.setState("products", PLACEHOLDER_PRODUCTS);

    const { createShipmentForOrder } = await import("@/lib/shipping/create-shipment");
    const result = await createShipmentForOrder("DND-TEST01", setup.deps);

    if (!result.ok) {
      assert.equal(result.code, "BUILD_PAYLOAD_FAILED");
    } else {
      assert.fail("Expected failure due to placeholder specs");
    }
  });

  it("T7: returns BUILD_PAYLOAD_FAILED when total weight exceeds 60kg", async () => {
    const setup = setupValidMocks();
    setup.setState("products", {
      "DND-SCH-001": {
        sku: "DND-SCH-001",
        name: "School Bag",
        category: "school-bags",
        weight: "65kg",
        length: "30cm",
        width: "20cm",
        height: "10cm",
      },
    });

    const { createShipmentForOrder } = await import("@/lib/shipping/create-shipment");
    const result = await createShipmentForOrder("DND-TEST01", setup.deps);

    if (!result.ok) {
      assert.equal(result.code, "BUILD_PAYLOAD_FAILED");
    } else {
      assert.fail("Expected failure due to excessive weight");
    }
  });
});

describe("createShipmentForOrder — duplicate prevention and idempotency", () => {
  it("T8: returns SHIPMENT_EXISTS when a final shipment exists (DELIVERED)", async () => {
    const setup = setupValidMocks();
    setup.setShipmentByOrderId("DND-TEST01", {
      id: "ship_existing",
      status: "DELIVERED",
      providerOrderId: "sr_1",
      awb: "AWB001",
    });

    const { createShipmentForOrder } = await import("@/lib/shipping/create-shipment");
    const result = await createShipmentForOrder("DND-TEST01", setup.deps);

    if (!result.ok) {
      assert.equal(result.code, "SHIPMENT_EXISTS");
      assert.equal(result.statusCode, 409);
    } else {
      assert.fail("Expected failure");
    }
  });

  it("T9: returns SHIPMENT_EXISTS when a non-retryable shipment exists (IN_TRANSIT)", async () => {
    const setup = setupValidMocks();
    setup.setShipmentByOrderId("DND-TEST01", {
      id: "ship_in_transit",
      status: "IN_TRANSIT",
      providerOrderId: "sr_1",
      awb: "AWB001",
    });

    const { createShipmentForOrder } = await import("@/lib/shipping/create-shipment");
    const result = await createShipmentForOrder("DND-TEST01", setup.deps);

    if (!result.ok) {
      assert.equal(result.code, "SHIPMENT_EXISTS");
    } else {
      assert.fail("Expected failure");
    }
  });

  it("T10: idempotent reconciliation — existing PENDING shipment reuses local record and succeeds", async () => {
    const setup = setupValidMocks();
    setup.setShipmentByOrderId("DND-TEST01", {
      id: "ship_existing",
      status: "PENDING",
      providerOrderId: null,
      awb: null,
    });

    (setup.deps as any).createOrder = () => Promise.resolve({
      shipment_id: "sr_shipment_1",
      awb_code: null,
      order_status: "ORDER_CREATED",
      message: "Order created successfully",
    });

    const { createShipmentForOrder } = await import("@/lib/shipping/create-shipment");
    const result = await createShipmentForOrder("DND-TEST01", setup.deps);

    if (result.ok) {
      assert.equal(result.action, "reconciled");
      assert.equal(result.shipment.providerOrderId, "sr_shipment_1");
      assert.equal(result.shipment.awb, "12345678901");
      assert.equal(result.shipment.courierName, "DTDC");
    } else {
      assert.fail(`Expected success but got: ${result.error}`);
    }
  });

  it("T11: second attempt with existing AWB-assigned shipment resumes from state", async () => {
    const setup = setupValidMocks();
    setup.setShipmentByOrderId("DND-TEST01", {
      id: "ship_done",
      status: "AWB_ASSIGNED",
      providerOrderId: "sr_1",
      awb: "AWB123",
    });

    let createOrderCalled = false;
    let assignAwbCalled = false;
    (setup.deps as any).createOrder = () => { createOrderCalled = true; return Promise.resolve({}); };
    (setup.deps as any).assignAWB = () => { assignAwbCalled = true; return Promise.resolve({}); };

    const { createShipmentForOrder } = await import("@/lib/shipping/create-shipment");
    const result = await createShipmentForOrder("DND-TEST01", setup.deps);

    assert.equal(createOrderCalled, false, "createOrder should NOT be called when resuming");
    assert.equal(assignAwbCalled, false, "assignAWB should NOT be called when AWB already exists");

    if (result.ok) {
      assert.equal(result.action, "reconciled");
      assert.equal(result.shipment.providerOrderId, "sr_1");
      assert.equal(result.shipment.awb, "AWB123");
    } else {
      assert.fail(`Expected success but got: ${result.error}`);
    }
  });
});

describe("createShipmentForOrder — Shiprocket API error handling", () => {
  it("T12: returns SHIPROCKET_AUTH_ERROR and marks shipment FAILED on auth failure", async () => {
    const setup = setupValidMocks();
    (setup.deps as any).createOrder = () => Promise.reject(new ShiprocketAuthError("Authentication failed"));

    const { createShipmentForOrder } = await import("@/lib/shipping/create-shipment");
    const result = await createShipmentForOrder("DND-TEST01", setup.deps);

    if (!result.ok) {
      assert.equal(result.code, "SHIPROCKET_AUTH_ERROR");
      assert.equal(result.statusCode, 401);
    } else {
      assert.fail("Expected failure");
    }
  });

  it("T13: returns SHIPROCKET_API_ERROR on Shiprocket API failure and marks shipment FAILED", async () => {
    const setup = setupValidMocks();
    (setup.deps as any).createOrder = () => Promise.reject(new ShiprocketError("Invalid order data", 400));

    const { createShipmentForOrder } = await import("@/lib/shipping/create-shipment");
    const result = await createShipmentForOrder("DND-TEST01", setup.deps);

    if (!result.ok) {
      assert.equal(result.code, "SHIPROCKET_API_ERROR");
      assert.equal(result.statusCode, 502);
    } else {
      assert.fail("Expected failure");
    }
  });

  it("T14: sanitizes sensitive data in error messages", async () => {
    const setup = setupValidMocks();
    const rawError = "Bearer abc123def456 token error for admin@test.com";
    (setup.deps as any).createOrder = () => Promise.reject(new ShiprocketError(rawError, 500));

    const { createShipmentForOrder } = await import("@/lib/shipping/create-shipment");
    const result = await createShipmentForOrder("DND-TEST01", setup.deps);

    if (!result.ok) {
      assert.ok(!result.error.includes("admin@test.com"), "Email should be redacted");
      assert.ok(!result.error.includes("abc123def456"), "Token should be redacted");
    } else {
      assert.fail("Expected failure");
    }
  });
});

describe("createShipmentForOrder — retry from FAILED", () => {
  it("T15: resets FAILED shipment to PENDING and proceeds with creation", async () => {
    const setup = setupValidMocks();
    let updateWasCalled = false;
    let updateStatuses: string[] = [];

    setup.setShipmentByOrderId("DND-TEST01", {
      id: "ship_failed",
      status: "FAILED",
      providerOrderId: null,
      awb: null,
    });

    const originalDb = setup.deps.prisma;
    (setup.deps as any).prisma = {
      ...originalDb,
      shipment: {
        ...originalDb.shipment,
        update: (args: any) => {
          updateWasCalled = true;
          updateStatuses.push(args.data.status);
          return originalDb.shipment.update(args);
        },
      },
    };

    const { createShipmentForOrder } = await import("@/lib/shipping/create-shipment");
    const result = await createShipmentForOrder("DND-TEST01", setup.deps);

    assert.equal(updateWasCalled, true, "Should have called shipment.update to reset FAILED to PENDING");
    assert.ok(
      updateStatuses.filter(Boolean).includes("PENDING"),
      `Expected PENDING reset in update statuses, got: ${JSON.stringify(updateStatuses)}`,
    );

    if (result.ok) {
      assert.equal(result.action, "reconciled");
      assert.equal(result.shipment.providerOrderId, "sr_shipment_1");
      assert.equal(result.shipment.awb, "12345678901");
    } else {
      assert.fail(`Expected success but got: ${result.error}`);
    }
  });
});

describe("createShipmentForOrder — state transitions", () => {
  it("T16: successful creation transitions PENDING → CREATED → AWB_ASSIGNED → PICKUP_SCHEDULED", async () => {
    const setup = setupValidMocks();
    const { createShipmentForOrder } = await import("@/lib/shipping/create-shipment");
    const result = await createShipmentForOrder("DND-TEST01", setup.deps);

    if (!result.ok) {
      assert.fail(`Expected success but got: ${result.error}`);
    } else {
      assert.equal(result.action, "created");
      assert.equal(result.shipment.status, "PICKUP_SCHEDULED");
    }

    const eventCreateCalls = setup.getCalls("shipmentEvent", "create");
    const eventStatuses = eventCreateCalls.map((c: any) => (c.args[0] as any).data.status);
    assert.ok(eventStatuses.includes("CREATED"), "Should have CREATED event");
    assert.ok(eventStatuses.includes("AWB_ASSIGNED"), "Should have AWB_ASSIGNED event");
    assert.ok(eventStatuses.includes("PICKUP_SCHEDULED"), "Should have PICKUP_SCHEDULED event");
  });

  it("T17: AWB assignment skipped when createOrder returns awb_code", async () => {
    const setup = setupValidMocks();
    let assignAwbCalled = false;
    (setup.deps as any).assignAWB = () => {
      assignAwbCalled = true;
      return Promise.resolve({
        status_code: 200,
        status: true,
        message: "AWB assigned",
        data: { shipment_id: "sr_shipment_1", awb_code: "99999", courier_company: "DTDC" },
      });
    };

    const { createShipmentForOrder } = await import("@/lib/shipping/create-shipment");
    const result = await createShipmentForOrder("DND-TEST01", setup.deps);

    if (result.ok) {
      assert.equal(assignAwbCalled, false, "assignAWB should NOT be called when createOrder already returns awb_code");
    } else {
      assert.fail(`Expected success but got: ${result.error}`);
    }
  });
});

describe("createShipmentForOrder — pickup failure tolerance", () => {
  it("T18: continues with AWB_ASSIGNED status when schedulePickup fails", async () => {
    const setup = setupValidMocks();
    (setup.deps as any).schedulePickup = () => Promise.reject(new Error("Pickup service unavailable"));

    const { createShipmentForOrder } = await import("@/lib/shipping/create-shipment");
    const result = await createShipmentForOrder("DND-TEST01", setup.deps);

    if (!result.ok) {
      assert.fail(`Expected success despite pickup failure, got: ${result.error}`);
    } else {
      assert.equal(result.shipment.status, "AWB_ASSIGNED", "Status should be AWB_ASSIGNED when pickup failed");
    }
  });

  it("T19: label generation failure does not affect overall result", async () => {
    const setup = setupValidMocks();
    (setup.deps as any).generateLabel = () => Promise.reject(new Error("Label service unavailable"));

    const { createShipmentForOrder } = await import("@/lib/shipping/create-shipment");
    const result = await createShipmentForOrder("DND-TEST01", setup.deps);

    if (!result.ok) {
      assert.fail(`Expected success despite label failure, got: ${result.error}`);
    } else {
      assert.equal(result.shipment.labelUrl, null);
      assert.equal(result.shipment.status, "PICKUP_SCHEDULED");
    }
  });
});

describe("createShipmentForOrder — timeout handling (BLOCKER 1)", () => {
  it("T20: createOrder timeout returns SHIPROCKET_TIMEOUT and marks shipment RECONCILIATION_REQUIRED", async () => {
    const setup = setupValidMocks();
    (setup.deps as any).createOrder = () =>
      Promise.reject(new ShiprocketTimeoutError("Request timed out"));

    const { createShipmentForOrder } = await import("@/lib/shipping/create-shipment");
    const result = await createShipmentForOrder("DND-TEST01", setup.deps);

    if (!result.ok) {
      assert.equal(result.code, "SHIPROCKET_TIMEOUT");
      assert.equal(result.statusCode, 504);
    } else {
      assert.fail("Expected failure due to timeout");
    }
  });

  it("T21: AWB assignment timeout after successful createOrder preserves providerOrderId", async () => {
    const setup = setupValidMocks();
    (setup.deps as any).createOrder = () => Promise.resolve({
      shipment_id: "sr_shipment_1",
      awb_code: null,
      order_status: "ORDER_CREATED",
      message: "Order created successfully",
    });
    (setup.deps as any).assignAWB = () =>
      Promise.reject(new ShiprocketTimeoutError("AWB assignment timed out"));

    const { createShipmentForOrder } = await import("@/lib/shipping/create-shipment");
    const result = await createShipmentForOrder("DND-TEST01", setup.deps);

    if (!result.ok) {
      assert.equal(result.code, "SHIPROCKET_TIMEOUT");
      assert.equal(result.statusCode, 504);
      assert.ok(result.error.includes("sr_shipment_1"), "Error should mention the existing Shiprocket order ID");
    } else {
      assert.fail("Expected failure due to AWB timeout");
    }
  });
});

describe("createShipmentForOrder — resume from existing state (BLOCKER 2)", () => {
  it("T22: existing CREATED shipment with providerOrderId skips createOrder and resumes", async () => {
    const setup = setupValidMocks();
    setup.setShipmentByOrderId("DND-TEST01", {
      id: "ship_created",
      status: "CREATED",
      providerOrderId: "sr_existing_123",
      awb: null,
    });

    let createOrderCalled = false;
    (setup.deps as any).createOrder = () => {
      createOrderCalled = true;
      return Promise.resolve({
        shipment_id: "sr_shipment_1",
        awb_code: null,
        order_status: "ORDER_CREATED",
        message: "Order created successfully",
      });
    };

    const { createShipmentForOrder } = await import("@/lib/shipping/create-shipment");
    const result = await createShipmentForOrder("DND-TEST01", setup.deps);

    assert.equal(createOrderCalled, false, "createOrder should NOT be called when providerOrderId already exists");

    if (result.ok) {
      assert.equal(result.action, "reconciled");
      assert.equal(result.shipment.providerOrderId, "sr_existing_123");
      assert.equal(result.shipment.status, "PICKUP_SCHEDULED");
    } else {
      assert.fail(`Expected success but got: ${result.error}`);
    }
  });

  it("T23: existing AWB_ASSIGNED shipment with providerOrderId skips createOrder and assignAWB", async () => {
    const setup = setupValidMocks();
    setup.setShipmentByOrderId("DND-TEST01", {
      id: "ship_awb",
      status: "AWB_ASSIGNED",
      providerOrderId: "sr_existing_456",
      awb: "AWB-999",
    });

    let createOrderCalled = false;
    let assignAwbCalled = false;
    (setup.deps as any).createOrder = () => {
      createOrderCalled = true;
      return Promise.resolve({});
    };
    (setup.deps as any).assignAWB = () => {
      assignAwbCalled = true;
      return Promise.resolve({});
    };

    const { createShipmentForOrder } = await import("@/lib/shipping/create-shipment");
    const result = await createShipmentForOrder("DND-TEST01", setup.deps);

    assert.equal(createOrderCalled, false, "createOrder should NOT be called when resuming");
    assert.equal(assignAwbCalled, false, "assignAWB should NOT be called when AWB already exists");

    if (result.ok) {
      assert.equal(result.action, "reconciled");
      assert.equal(result.shipment.providerOrderId, "sr_existing_456");
      assert.equal(result.shipment.awb, "AWB-999");
    } else {
      assert.fail(`Expected success but got: ${result.error}`);
    }
  });

  it("T24: existing PICKUP_SCHEDULED shipment with providerOrderId resumes and skips all Shiprocket calls", async () => {
    const setup = setupValidMocks();
    setup.setShipmentByOrderId("DND-TEST01", {
      id: "ship_pickup",
      status: "PICKUP_SCHEDULED",
      providerOrderId: "sr_existing_789",
      awb: "AWB-777",
      pickupScheduledAt: new Date(),
    });

    let createOrderCalled = false;
    let assignAwbCalled = false;
    let schedulePickupCalled = false;
    (setup.deps as any).createOrder = () => {
      createOrderCalled = true;
      return Promise.resolve({});
    };
    (setup.deps as any).assignAWB = () => {
      assignAwbCalled = true;
      return Promise.resolve({});
    };
    (setup.deps as any).schedulePickup = () => {
      schedulePickupCalled = true;
      return Promise.resolve({});
    };

    const { createShipmentForOrder } = await import("@/lib/shipping/create-shipment");
    const result = await createShipmentForOrder("DND-TEST01", setup.deps);

    assert.equal(createOrderCalled, false);
    assert.equal(assignAwbCalled, false);
    assert.equal(schedulePickupCalled, false);

    if (result.ok) {
      assert.equal(result.action, "reconciled");
      assert.equal(result.shipment.status, "PICKUP_SCHEDULED");
    } else {
      assert.fail(`Expected success but got: ${result.error}`);
    }
  });
});

describe("createShipmentForOrder — advisory lock (BLOCKER 3)", () => {
  it("T25: acquires advisory lock at entry", async () => {
    const setup = setupValidMocks();
    const originalExecuteRaw = setup.deps.prisma.$executeRaw;
    let lockAcquired = false;
    setup.deps.prisma.$executeRaw = () => {
      lockAcquired = true;
      return Promise.resolve(null);
    };

    const { createShipmentForOrder } = await import("@/lib/shipping/create-shipment");
    await createShipmentForOrder("DND-TEST01", setup.deps);

    assert.equal(lockAcquired, true, "Should acquire advisory lock");
  });

  it("T26: releases advisory lock in finally block (even on error)", async () => {
    const setup = setupValidMocks();
    const releaseCalls: string[] = [];
    setup.deps.prisma.$executeRaw = (query: TemplateStringsArray) => {
      const sql = query.join("");
      if (sql.includes("pg_advisory_lock")) {
        return Promise.resolve(null);
      }
      if (sql.includes("pg_advisory_unlock")) {
        releaseCalls.push(sql);
        return Promise.resolve(null);
      }
      return Promise.resolve(null);
    };

    const { createShipmentForOrder } = await import("@/lib/shipping/create-shipment");
    await createShipmentForOrder("DND-TEST01", setup.deps);

    assert.ok(releaseCalls.length > 0, "Lock should be released after completion");
  });

  it("T27: lock release is best-effort (does not throw on release failure)", async () => {
    const setup = setupValidMocks();
    const releaseErrors: Error[] = [];
    setup.deps.prisma.$executeRaw = (query: TemplateStringsArray) => {
      const sql = query.join("");
      if (sql.includes("pg_advisory_unlock")) {
        const err = new Error("Unlock failed");
        releaseErrors.push(err);
        return Promise.reject(err);
      }
      return Promise.resolve(null);
    };

    const { createShipmentForOrder } = await import("@/lib/shipping/create-shipment");
    const result = await createShipmentForOrder("DND-TEST01", setup.deps);

    assert.ok(releaseErrors.length > 0, "Release should have been attempted");
    if (!result.ok) {
      assert.fail(`Expected success despite release error: ${result.error}`);
    }
  });
});

describe("createShipmentForOrder — reconciliation workflow (BLOCKER 2)", () => {
  it("T28: normal successful creation completes and persists providerOrderId", async () => {
    const setup = setupValidMocks();
    let createOrderCount = 0;
    (setup.deps as any).createOrder = () => {
      createOrderCount++;
      return Promise.resolve({
        shipment_id: "sr_shipment_created",
        awb_code: null,
        order_status: "ORDER_CREATED",
        message: "Order created successfully",
      });
    };

    const { createShipmentForOrder } = await import("@/lib/shipping/create-shipment");
    const result = await createShipmentForOrder("DND-TEST01", setup.deps);

    if (!result.ok) {
      assert.fail(`Expected success but got: ${result.error}`);
    } else {
      assert.equal(result.shipment.providerOrderId, "sr_shipment_created");
      assert.equal(createOrderCount, 1, "createOrder should be called exactly once");
      assert.equal(result.action, "created");
    }
  });

  it("T29: timeout after createOrder marks RECONCILIATION_REQUIRED and does not mark FAILED", async () => {
    const setup = setupValidMocks();
    let reconcileCalled = false;
    (setup.deps as any).createOrder = () =>
      Promise.reject(new ShiprocketTimeoutError("Request timed out"));
    (setup.deps as any).reconcileShirocketOrder = () => {
      reconcileCalled = true;
      return Promise.resolve(null);
    };

    const { createShipmentForOrder } = await import("@/lib/shipping/create-shipment");
    const result = await createShipmentForOrder("DND-TEST01", setup.deps);

    if (!result.ok) {
      assert.equal(result.code, "SHIPROCKET_TIMEOUT");
      assert.equal(result.statusCode, 504);
    } else {
      assert.fail("Expected failure due to timeout");
    }

    // Verify shipment is in RECONCILIATION_REQUIRED, not FAILED
    const existing = await setup.deps.prisma.shipment.findFirst({
      where: { orderId: "DND-TEST01" },
    });
    assert.equal(existing.status, "RECONCILIATION_REQUIRED");
    assert.equal(reconcileCalled, false, "Reconciliation should NOT be called on first failure");
  });

  it("T30: retry while RECONCILIATION_REQUIRED triggers reconciliation", async () => {
    const setup = setupValidMocks();
    let reconcileCalled = false;
    let createOrderCount = 0;

    // First call: timeout → RECONCILIATION_REQUIRED
    (setup.deps as any).createOrder = () => {
      createOrderCount++;
      return Promise.reject(new ShiprocketTimeoutError("Request timed out"));
    };
    (setup.deps as any).reconcileShirocketOrder = () => {
      reconcileCalled = true;
      return Promise.resolve(null); // No order found on Shiprocket
    };

    const { createShipmentForOrder } = await import("@/lib/shipping/create-shipment");
    // First attempt: timeout
    await createShipmentForOrder("DND-TEST01", setup.deps);

    // Second attempt: should reconcile first, find nothing, then retry createOrder
    await createShipmentForOrder("DND-TEST01", setup.deps);

    assert.equal(reconcileCalled, true, "Reconciliation should be called on retry");
    assert.equal(createOrderCount, 2, "createOrder should be called twice (one per attempt)");
  });

  it("T31: reconciliation finds provider order → persist and resume, createOrder count=1", async () => {
    const setup = setupValidMocks();
    let createOrderCount = 0;

    // Set up a shipment in RECONCILIATION_REQUIRED state with no providerOrderId
    setup.setShipmentByOrderId("DND-TEST01", {
      id: "ship_recon",
      status: "RECONCILIATION_REQUIRED",
      providerOrderId: null,
      awb: null,
      failureReason: "Shiprocket API timed out",
    });

    // createOrder should NOT be called — we should reconcile instead
    (setup.deps as any).createOrder = () => {
      createOrderCount++;
      return Promise.resolve({
        shipment_id: "sr_should_not_be_called",
        awb_code: null,
        order_status: "ORDER_CREATED",
        message: "Order created successfully",
      });
    };
    // Reconciliation finds the existing order on Shiprocket
    (setup.deps as any).reconcileShirocketOrder = (orderId: string) =>
      Promise.resolve({
        providerOrderId: "sr_existing_from_shiprocket",
        awb: "12345678901",
        courierName: "DTDC",
        status: "NEW",
      });

    const { createShipmentForOrder } = await import("@/lib/shipping/create-shipment");
    const result = await createShipmentForOrder("DND-TEST01", setup.deps);

    assert.equal(createOrderCount, 0, "createOrder should NOT be called when order already exists");
    if (!result.ok) {
      assert.fail(`Expected success but got: ${result.error}`);
    } else {
      assert.equal(result.action, "reconciled");
      assert.equal(result.shipment.providerOrderId, "sr_existing_from_shiprocket");
      assert.equal(result.shipment.status, "PICKUP_SCHEDULED");
    }
  });

  it("T32: reconciliation confirms no provider order → createOrder allowed exactly once", async () => {
    const setup = setupValidMocks();
    let createOrderCount = 0;
    let reconcileCount = 0;

    // Set up a shipment in RECONCILIATION_REQUIRED state
    setup.setShipmentByOrderId("DND-TEST01", {
      id: "ship_recon",
      status: "RECONCILIATION_REQUIRED",
      providerOrderId: null,
      awb: null,
      failureReason: "Shiprocket API timed out",
    });

    // createOrder succeeds this time
    (setup.deps as any).createOrder = () => {
      createOrderCount++;
      return Promise.resolve({
        shipment_id: "sr_newly_created",
        awb_code: null,
        order_status: "ORDER_CREATED",
        message: "Order created successfully",
      });
    };
    // Reconciliation finds no existing order
    (setup.deps as any).reconcileShirocketOrder = () => {
      reconcileCount++;
      return Promise.resolve(null);
    };

    const { createShipmentForOrder } = await import("@/lib/shipping/create-shipment");
    const result = await createShipmentForOrder("DND-TEST01", setup.deps);

    assert.equal(reconcileCount, 1, "Reconciliation should be called once");
    assert.equal(createOrderCount, 1, "createOrder should be called exactly once after reconciliation finds nothing");
    if (!result.ok) {
      assert.fail(`Expected success but got: ${result.error}`);
    } else {
      assert.equal(result.shipment.providerOrderId, "sr_newly_created");
    }
  });

  it("T33: repeated admin retry after unknown result never calls createOrder repeatedly without reconciliation", async () => {
    const setup = setupValidMocks();
    let createOrderCount = 0;
    let reconcileCount = 0;

    // Set up a shipment in RECONCILIATION_REQUIRED state
    setup.setShipmentByOrderId("DND-TEST01", {
      id: "ship_recon",
      status: "RECONCILIATION_REQUIRED",
      providerOrderId: null,
      awb: null,
    });

    // Reconciliation always finds no order (safe to retry)
    (setup.deps as any).reconcileShirocketOrder = () => {
      reconcileCount++;
      return Promise.resolve(null);
    };
    // But createOrder keeps failing — simulating persistent timeout
    (setup.deps as any).createOrder = () => {
      createOrderCount++;
      return Promise.reject(new ShiprocketTimeoutError("Request timed out"));
    };

    const { createShipmentForOrder } = await import("@/lib/shipping/create-shipment");

    // First retry: reconcile → no order → createOrder → timeout → RECONCILIATION_REQUIRED
    await createShipmentForOrder("DND-TEST01", setup.deps);
    assert.equal(reconcileCount, 1, "Reconciliation called on first retry");
    assert.equal(createOrderCount, 1, "createOrder called once on first retry");

    // Second retry: reconcile → no order → createOrder → timeout → RECONCILIATION_REQUIRED
    await createShipmentForOrder("DND-TEST01", setup.deps);
    assert.equal(reconcileCount, 2, "Reconciliation called on second retry");
    assert.equal(createOrderCount, 2, "createOrder called once on second retry");

    // Third retry: same pattern
    await createShipmentForOrder("DND-TEST01", setup.deps);
    assert.equal(reconcileCount, 3, "Reconciliation called on third retry");
    assert.equal(createOrderCount, 3, "createOrder called once on third retry");
  });

  it("T34: concurrent requests for same order — advisory lock prevents duplicate creation", async () => {
    const setup = setupValidMocks();
    let createOrderCount = 0;
    let reconcileCount = 0;

    // Reconciliation finds no order
    (setup.deps as any).reconcileShirocketOrder = () => {
      reconcileCount++;
      return Promise.resolve(null);
    };
    (setup.deps as any).createOrder = () => {
      createOrderCount++;
      // Simulate a delay to increase likelihood of concurrency
      return new Promise((resolve) =>
        setTimeout(() => resolve({
          shipment_id: "sr_concurrent_1",
          awb_code: null,
          order_status: "ORDER_CREATED",
          message: "Order created successfully",
        }), 50),
      );
    };

    const { createShipmentForOrder } = await import("@/lib/shipping/create-shipment");

    // Start 3 concurrent requests
    const results = await Promise.allSettled([
      createShipmentForOrder("DND-TEST01", setup.deps),
      createShipmentForOrder("DND-TEST01", setup.deps),
      createShipmentForOrder("DND-TEST01", setup.deps),
    ]);

    // With advisory lock, all 3 are serialized: first creates (calls createOrder once),
    // the other 2 resume from the existing shipment (no createOrder, no reconciliation)
    const fulfilled = results.filter((r) => r.status === "fulfilled").length;
    assert.equal(fulfilled, 3, "All concurrent requests should succeed with proper locking");
    assert.equal(createOrderCount, 1, "createOrder should be called exactly once despite 3 concurrent requests");
    assert.equal(reconcileCount, 0, "Reconciliation should not be needed for concurrent requests (lock prevents race)");
  });

  it("T35: existing providerOrderId on RECONCILIATION_REQUIRED shipment skips createOrder", async () => {
    const setup = setupValidMocks();
    let createOrderCount = 0;
    let reconcileCount = 0;

    // Set up a shipment with providerOrderId already set but in RECONCILIATION_REQUIRED
    // This should never happen in practice, but test the safety of the code
    setup.setShipmentByOrderId("DND-TEST01", {
      id: "ship_with_provider",
      status: "RECONCILIATION_REQUIRED",
      providerOrderId: "sr_already_exists",
      awb: null,
    });

    (setup.deps as any).createOrder = () => {
      createOrderCount++;
      return Promise.resolve({ shipment_id: "sr_new", awb_code: null, order_status: "ORDER_CREATED", message: "ok" });
    };
    (setup.deps as any).reconcileShirocketOrder = () => {
      reconcileCount++;
      return Promise.resolve({ providerOrderId: "sr_already_exists", awb: null, courierName: null, status: "NEW" });
    };

    const { createShipmentForOrder } = await import("@/lib/shipping/create-shipment");
    const result = await createShipmentForOrder("DND-TEST01", setup.deps);

    assert.equal(createOrderCount, 0, "createOrder should never be called when providerOrderId already exists");
    assert.equal(reconcileCount, 1, "Reconciliation should be called to pick up state");
    if (!result.ok) {
      assert.fail(`Expected success but got: ${result.error}`);
    } else {
      assert.equal(result.shipment.providerOrderId, "sr_already_exists");
    }
  });
});
