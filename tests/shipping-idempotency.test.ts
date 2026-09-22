import { describe, it, beforeEach } from "node:test";
import assert from "node:assert/strict";

type CallRecord = { method: string; args: any[] };

function makeMockTx() {
  const calls: CallRecord[] = [];

  const findFirstShip = (args: unknown) => {
    calls.push({ method: "shipment.findFirst", args: [args] });
    return Promise.resolve(undefined);
  };
  const createShip = (args: unknown) => {
    calls.push({ method: "shipment.create", args: [args] });
    return Promise.resolve({ id: "ship_123", providerOrderId: "sr_1" });
  };
  const updateShip = (args: unknown) => {
    calls.push({ method: "shipment.update", args: [args] });
    return Promise.resolve({ id: "ship_1", providerOrderId: "sr_1" });
  };
  const updateManyShip = (args: unknown) => {
    calls.push({ method: "shipment.updateMany", args: [args] });
    return Promise.resolve({ count: 1 });
  };
  const findFirstEvent = (args: unknown) => {
    calls.push({ method: "shipmentEvent.findFirst", args: [args] });
    return Promise.resolve(null);
  };
  const createEvent = (args: unknown) => {
    calls.push({ method: "shipmentEvent.create", args: [args] });
    return Promise.resolve({ id: "evt_1" });
  };
  const findUniqueOrder = (args: unknown) => {
    calls.push({ method: "order.findUnique", args: [args] });
    return Promise.resolve({ paymentStatus: "PAID", orderStatus: "PLACED" });
  };

  const tx = {
    shipment: { findFirst: findFirstShip, create: createShip, update: updateShip, updateMany: updateManyShip },
    shipmentEvent: { findFirst: findFirstEvent, create: createEvent },
    order: { findUnique: findUniqueOrder },
  };

  const prisma: any = {
    $transaction: async (cb: (tx: unknown) => Promise<unknown>) => cb(tx),
  };

  return {
    tx,
    prisma,
    calls,
    _setters: {
      findFirstShip,
      createShip,
      updateShip,
      updateManyShip,
      findFirstEvent,
      createEvent,
      findUniqueOrder,
    },
    setFindFirstShip: (fn: any) => { tx.shipment.findFirst = fn; },
    setCreateShip: (fn: any) => { tx.shipment.create = fn; },
    setUpdateShip: (fn: any) => { tx.shipment.update = fn; },
    setFindFirstEvent: (fn: any) => { tx.shipmentEvent.findFirst = fn; },
    setCreateEvent: (fn: any) => { tx.shipmentEvent.create = fn; },
    setUpdateManyShip: (fn: any) => { tx.shipment.updateMany = fn; },
    setFindUniqueOrder: (fn: any) => { tx.order.findUnique = fn; },
    callCount: (method: string) => calls.filter((c) => c.method === method).length,
  };
}

describe("createShipmentWithIdempotency", () => {
  let ctx: ReturnType<typeof makeMockTx>;
  let fn: any;

  beforeEach(async () => {
    ctx = makeMockTx();
    const mod = await import("@/lib/shipping/idempotency");
    fn = mod.createShipmentWithIdempotency;
  });

  it("I1: creates new shipment when none exists and order is PAID + not CANCELLED", async () => {
    let shipFindFirstCalled = false;
    ctx.setFindFirstShip((args: any) => {
      shipFindFirstCalled = true;
      assert.equal(args.where.orderId, "order_123");
      return Promise.resolve(undefined);
    });
    ctx.setFindUniqueOrder((args: any) => {
      return Promise.resolve({ paymentStatus: "PAID", orderStatus: "PLACED" });
    });
    let createCalled = false;
    ctx.setCreateShip((args: any) => {
      createCalled = true;
      assert.equal(args.data.id, "idem_123");
      return Promise.resolve({ id: "ship_123", providerOrderId: "sr_1" });
    });

    const result = await fn(ctx.prisma, {
      orderId: "order_123",
      provider: "shiprocket",
      idempotencyKey: "idem_123",
      providerOrderId: "sr_1",
      providerShipmentId: null,
      awb: null,
      courierName: null,
      trackingUrl: null,
      shippingCost: null,
      labelUrl: null,
    });

    assert.equal(result.ok, true);
    if (result.ok) {
      assert.equal(result.shipmentId, "ship_123");
      assert.equal(result.action, "created");
    }
    assert.equal(createCalled, true);
  });

  it("I2: reconciles existing shipment with matching providerOrderId and existing AWB", async () => {
    ctx.setFindFirstShip(() => Promise.resolve({
      id: "ship_existing",
      providerOrderId: "sr_1",
      awb: "AWB123",
      status: "IN_TRANSIT",
    }));

    const result = await fn(ctx.prisma, {
      orderId: "order_123",
      provider: "shiprocket",
      idempotencyKey: "idem_123",
      providerOrderId: "sr_1",
      providerShipmentId: null,
      awb: null,
      courierName: null,
      trackingUrl: null,
      shippingCost: null,
      labelUrl: null,
    });

    assert.equal(result.ok, true);
    if (result.ok) {
      assert.equal(result.shipmentId, "ship_existing");
      assert.equal(result.action, "reconciled");
    }
    assert.equal(ctx.callCount("shipment.create"), 0);
  });

  it("I3: reconciles existing shipment with matching providerOrderId, no AWB, cancelable", async () => {
    ctx.setFindFirstShip(() => Promise.resolve({
      id: "ship_existing2",
      providerOrderId: null,
      awb: null,
      status: "PENDING",
    }));
    let updateCalled = false;
    ctx.setUpdateShip((args: any) => {
      updateCalled = true;
      assert.equal(args.data.awb, "AWB456");
      return Promise.resolve({ id: "ship_existing2", providerOrderId: "sr_1" });
    });

    const result = await fn(ctx.prisma, {
      orderId: "order_123",
      provider: "shiprocket",
      idempotencyKey: "idem_new",
      providerOrderId: "sr_1",
      providerShipmentId: "sr_ship_1",
      awb: "AWB456",
      courierName: "Blue Dart",
      trackingUrl: "https://track.com/AWB456",
      shippingCost: 5000,
      labelUrl: "https://label.com/1",
    });

    assert.equal(result.ok, true);
    if (result.ok) {
      assert.equal(result.action, "reconciled");
      assert.equal(result.shipmentId, "ship_existing2");
    }
    assert.equal(updateCalled, true);
  });

  it("I4: returns existing for non-cancelable shipment without providerOrderId or awb", async () => {
    ctx.setFindFirstShip(() => Promise.resolve({
      id: "ship_terminal",
      providerOrderId: null,
      awb: null,
      status: "DELIVERED",
    }));

    const result = await fn(ctx.prisma, {
      orderId: "order_123",
      provider: "shiprocket",
      idempotencyKey: "idem_123",
      providerOrderId: "sr_1",
      providerShipmentId: null,
      awb: null,
      courierName: null,
      trackingUrl: null,
      shippingCost: null,
      labelUrl: null,
    });

    assert.equal(result.ok, true);
    if (result.ok) {
      assert.equal(result.action, "existing");
      assert.equal(result.shipmentId, "ship_terminal");
    }
  });

  it("I5: rejects order with different providerOrderId", async () => {
    ctx.setFindFirstShip(() => Promise.resolve({
      id: "ship_other",
      providerOrderId: "sr_DIFFERENT",
      awb: "AWB000",
      status: "PENDING",
    }));

    const result = await fn(ctx.prisma, {
      orderId: "order_123",
      provider: "shiprocket",
      idempotencyKey: "idem_123",
      providerOrderId: "sr_1",
      providerShipmentId: null,
      awb: null,
      courierName: null,
      trackingUrl: null,
      shippingCost: null,
      labelUrl: null,
    });

    assert.equal(result.ok, false);
    if (!result.ok) {
      assert.equal(result.action, "shipment_exists");
    }
  });

  it("I6: rejects order that is not PAID", async () => {
    ctx.setFindFirstShip(() => Promise.resolve(undefined));
    ctx.setFindUniqueOrder(() => Promise.resolve({ paymentStatus: "PENDING", orderStatus: "PLACED" }));

    const result = await fn(ctx.prisma, {
      orderId: "order_123",
      provider: "shiprocket",
      idempotencyKey: "idem_123",
      providerOrderId: "sr_1",
      providerShipmentId: null,
      awb: null,
      courierName: null,
      trackingUrl: null,
      shippingCost: null,
      labelUrl: null,
    });

    assert.equal(result.ok, false);
    if (!result.ok) {
      assert.equal(result.action, "no_eligible_order");
      assert.ok(result.error.includes("not PAID"));
    }
  });

  it("I7: rejects CANCELLED order", async () => {
    ctx.setFindFirstShip(() => Promise.resolve(undefined));
    ctx.setFindUniqueOrder(() => Promise.resolve({ paymentStatus: "PAID", orderStatus: "CANCELLED" }));

    const result = await fn(ctx.prisma, {
      orderId: "order_123",
      provider: "shiprocket",
      idempotencyKey: "idem_123",
      providerOrderId: null,
      providerShipmentId: null,
      awb: null,
      courierName: null,
      trackingUrl: null,
      shippingCost: null,
      labelUrl: null,
    });

    assert.equal(result.ok, false);
    if (!result.ok) {
      assert.equal(result.action, "no_eligible_order");
      assert.ok(result.error.includes("CANCELLED"));
    }
  });

  it("I8: rejects order not found", async () => {
    ctx.setFindFirstShip(() => Promise.resolve(undefined));
    ctx.setFindUniqueOrder(() => Promise.resolve(null));

    const result = await fn(ctx.prisma, {
      orderId: "order_missing",
      provider: "shiprocket",
      idempotencyKey: "idem_123",
      providerOrderId: null,
      providerShipmentId: null,
      awb: null,
      courierName: null,
      trackingUrl: null,
      shippingCost: null,
      labelUrl: null,
    });

    assert.equal(result.ok, false);
    if (!result.ok) {
      assert.equal(result.action, "no_eligible_order");
      assert.ok(result.error.includes("not found"));
    }
  });
});

describe("assignAwbToShipment", () => {
  let ctx: ReturnType<typeof makeMockTx>;
  let fn: any;

  beforeEach(async () => {
    ctx = makeMockTx();
    const mod = await import("@/lib/shipping/idempotency");
    fn = mod.assignAwbToShipment;
  });


  it("A1: assigns AWB when shipment exists and no AWB yet", async () => {
    let findFirstCallCount = 0;
    ctx.setFindFirstShip((args: any) => {
      findFirstCallCount++;
      if (findFirstCallCount === 1) return Promise.resolve(undefined);
      return Promise.resolve({ id: "ship_1", status: "PENDING", awb: null });
    });

    let updateCalled = false;
    ctx.setUpdateShip((args: any) => {
      updateCalled = true;
      assert.equal(args.data.awb, "AWB123");
      assert.equal(args.data.status, "AWB_ASSIGNED");
      return Promise.resolve({ id: "ship_1" });
    });

    const result = await fn(ctx.prisma, "order_123", "AWB123", "DTDC", "https://track.com/123");

    assert.equal(result.ok, true);
    assert.equal(updateCalled, true);
  });

  it("A2: returns ok when shipment already has matching AWB", async () => {
    ctx.setFindFirstShip(() => Promise.resolve({ id: "ship_1" }));

    const result = await fn(ctx.prisma, "order_123", "AWB123", "DTDC", null);

    assert.equal(result.ok, true);
    assert.equal(ctx.callCount("shipment.update"), 0);
  });

  it("A3: returns error when shipment not found", async () => {
    ctx.setFindFirstShip(() => Promise.resolve(undefined));

    const result = await fn(ctx.prisma, "order_missing", "AWB123", "DTDC", null);

    assert.equal(result.ok, false);
    assert.ok(result.error.includes("No shipment found"));
  });

  it("A4: returns error when shipment already has different AWB", async () => {
    let findFirstCallCount = 0;
    ctx.setFindFirstShip((args: any) => {
      findFirstCallCount++;
      if (findFirstCallCount === 1) return Promise.resolve(undefined);
      return Promise.resolve({ id: "ship_1", status: "PENDING", awb: "OLD_AWB" });
    });

    const result = await fn(ctx.prisma, "order_123", "NEW_AWB", "DTDC", null);

    assert.equal(result.ok, false);
    assert.ok(result.error.includes("already has AWB"));
    assert.equal(ctx.callCount("shipment.update"), 0);
  });
});

describe("recordShipmentEvent", () => {
  let ctx: ReturnType<typeof makeMockTx>;
  let fn: any;

  beforeEach(async () => {
    ctx = makeMockTx();
    const mod = await import("@/lib/shipping/idempotency");
    fn = mod.recordShipmentEvent;
  });


  it("R1: creates new event when none exists", async () => {
    ctx.setFindFirstEvent(() => Promise.resolve(null));
    let createCalled = false;
    ctx.setCreateEvent((args: any) => {
      createCalled = true;
      assert.equal(args.data.id, "evt_manual");
      assert.equal(args.data.status, "IN_TRANSIT");
      return Promise.resolve({ id: "evt_manual" });
    });
    ctx.setUpdateManyShip(() => Promise.resolve({ count: 1 }));

    const result = await fn(ctx.prisma, {
      shipmentId: "ship_123",
      status: "IN_TRANSIT",
      rawStatus: "Shipped",
      activity: "Package handed to courier",
      location: "Mumbai",
      note: null,
      occurredAt: new Date("2025-01-15T10:00:00Z"),
      eventId: "evt_manual",
    });

    assert.equal(result.ok, true);
    if (result.ok) {
      assert.equal(result.eventId, "evt_manual");
    }
    assert.equal(createCalled, true);
  });

  it("R2: deduplicates when identical event exists", async () => {
    ctx.setFindFirstEvent(() => Promise.resolve({ id: "evt_existing" }));

    const now = new Date("2025-01-15T10:00:00Z");

    let createCalled = false;
    ctx.setCreateEvent(() => {
      createCalled = true;
      return Promise.resolve({ id: "evt_1" });
    });

    const result = await fn(ctx.prisma, {
      shipmentId: "ship_123",
      status: "IN_TRANSIT",
      rawStatus: "Shipped",
      activity: "Package handed to courier",
      location: "Mumbai",
      note: null,
      occurredAt: now,
    });

    assert.equal(result.ok, true);
    if (result.ok) {
      assert.equal(result.eventId, "evt_existing");
    }
    assert.equal(createCalled, false);
  });

  it("R3: updates shipment status via updateMany", async () => {
    ctx.setFindFirstEvent(() => Promise.resolve(null));
    ctx.setCreateEvent(() => Promise.resolve({ id: "evt_2" }));

    let updateManyCalled = false;
    ctx.setUpdateManyShip((args: any) => {
      updateManyCalled = true;
      assert.equal(args.data.status, "DELIVERED");
      return Promise.resolve({ count: 1 });
    });

    await fn(ctx.prisma, {
      shipmentId: "ship_123",
      status: "DELIVERED",
      rawStatus: "Delivered",
      activity: null,
      location: null,
      note: null,
      occurredAt: new Date(),
      eventId: "evt_delivered",
    });

    assert.equal(updateManyCalled, true);
  });

  it("R4: generates event ID when not provided", async () => {
    ctx.setFindFirstEvent(() => Promise.resolve(null));
    ctx.setCreateEvent((args: any) => {
      return Promise.resolve({ id: args.data.id });
    });
    ctx.setUpdateManyShip(() => Promise.resolve({ count: 1 }));

    const result = await fn(ctx.prisma, {
      shipmentId: "ship_123",
      status: "PICKED_UP",
      rawStatus: "Picked Up",
      activity: null,
      location: "Delhi",
      note: null,
      occurredAt: new Date(),
    });

    assert.equal(result.ok, true);
    if (result.ok) {
      assert.ok(result.eventId.includes("evt_ship_123_"));
    }
  });
});

