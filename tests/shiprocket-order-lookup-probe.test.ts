import { describe, it } from "node:test";
import assert from "node:assert/strict";

import { configureToken, clearTokenCache, probeOrderLookup } from "@/lib/shiprocket/client";

function mockFetch(impl: (url: string, init?: RequestInit) => Promise<Response>) {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = (async (url: string | URL | Request, init?: RequestInit) =>
    impl(String(url), init)) as unknown as typeof fetch;
  return {
    restore: () => {
      globalThis.fetch = originalFetch;
    },
  };
}

describe("shiprocket order lookup probe — READ-ONLY diagnostic", () => {
  it("probes order-list for DND-DBD87242 and captures safe fields", async () => {
    configureToken("test-token", Date.now() + 60 * 60_000);
    const { restore } = mockFetch(async (url) => {
      if (url.includes("/v1/external/orders?") && url.includes("DND-DBD87242")) {
        return new Response(
          JSON.stringify({
            data: [
              {
                order_id: 123456,
                shipment_id: 16047775753,
                channel_order_id: "DND-DBD87242",
                status: "ORDER_CREATED",
                awb_code: "AWB999",
                courier_name: "DTDC",
                shipping_customer_name: "John Doe",
                shipping_phone: "9999999999",
                shipping_email: "john@example.com",
              },
            ],
          }),
          {
            status: 200,
            headers: { "content-type": "application/json" },
          },
        );
      }
      return new Response(
        JSON.stringify({ data: [] }),
        { status: 200, headers: { "content-type": "application/json" } },
      );
    });

    try {
      const result = await probeOrderLookup("DND-DBD87242");

      assert.equal(result.upstream_status, 200);
      assert.equal(result.content_type, "application/json");
      assert.equal(result.data_length, 1);
      assert.equal(result.records[0].order_id, 123456);
      assert.equal(result.records[0].shipment_id, 16047775753);
      assert.equal(result.records[0].channel_order_id, "DND-DBD87242");
      assert.equal(result.records[0].status, "ORDER_CREATED");
      assert.equal(result.records[0].awb, "AWB999");

      const serialized = JSON.stringify(result);
      assert.ok(!serialized.includes("John Doe"));
      assert.ok(!serialized.includes("9999999999"));
      assert.ok(!serialized.includes("john@example.com"));
    } finally {
      restore();
      clearTokenCache();
    }
  });

  it("probes order-list when DND-DBD87242 is absent", async () => {
    configureToken("test-token", Date.now() + 60 * 60_000);
    const { restore } = mockFetch(async (url) => {
      if (url.includes("/v1/external/orders?") && url.includes("DND-DBD87242")) {
        return new Response(
          JSON.stringify({ data: [] }),
          { status: 200, headers: { "content-type": "application/json" } },
        );
      }
      return new Response(
        JSON.stringify({ data: [] }),
        { status: 200, headers: { "content-type": "application/json" } },
      );
    });

    try {
      const result = await probeOrderLookup("DND-DBD87242");

      assert.equal(result.upstream_status, 200);
      assert.equal(result.data_length, 0);
      assert.deepEqual(result.records, []);
    } finally {
      restore();
      clearTokenCache();
    }
  });

  it("probes order-list when API returns 404", async () => {
    configureToken("test-token", Date.now() + 60 * 60_000);
    const { restore } = mockFetch(async () =>
      new Response(
        JSON.stringify({ message: "record not found" }),
        { status: 404, headers: { "content-type": "application/json" } },
      ),
    );

    try {
      const result = await probeOrderLookup("DND-DBD87242");

      assert.equal(result.upstream_status, 404);
      assert.equal(result.data_length, null);
      assert.deepEqual(result.records, []);
      assert.ok(result.error !== null);
    } finally {
      restore();
      clearTokenCache();
    }
  });

  it("probe never exposes auth token in errors", async () => {
    configureToken("secret-token", Date.now() + 60 * 60_000);
    const { restore } = mockFetch(async () => {
      throw new Error("Bearer secret-token network failure");
    });

    try {
      const result = await probeOrderLookup("DND-DBD87242");

      assert.equal(result.upstream_status, null);
      assert.ok(!result.error!.includes("secret-token"));
      assert.ok(result.error!.includes("[REDACTED]"));
    } finally {
      restore();
      clearTokenCache();
    }
  });
});
