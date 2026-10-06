import { describe, it, mock } from "node:test";
import assert from "node:assert/strict";

import {
  ShiprocketError,
  ShiprocketNotFoundError,
  ShiprocketAuthError,
} from "@/lib/shiprocket/errors";
import type { ShiprocketShipmentDetail } from "@/lib/shiprocket/types";
import type {
  EndpointProbeResult,
  ShipmentDiagnostics,
} from "@/lib/shiprocket/client";
import {
  clearTokenCache,
  configureToken,
  probeShiprocketEndpoints,
} from "@/lib/shiprocket/client";
import {
  buildLookupResponse,
  handleShipmentLookup,
  handleShipmentProbe,
  type LookupDeps,
  type ProbeDeps,
} from "@/lib/shiprocket/diagnostic";

function makeDeps(overrides: Partial<LookupDeps> = {}): LookupDeps {
  return {
    requireAdmin: async () => ({ id: "admin1", role: "ADMIN" }),
    originOk: () => true,
    fetchShipmentByIdWithDiagnostics: async () => ({
      data: {
        id: 16047755353,
        order_id: 7890123,
        status: "ORDER_CREATED",
        awb: "AWB123456789",
        courier: "DTDC",
      },
      diagnostics: {
        upstream_status: 200,
        top_level_keys: ["data"],
        data_present: true,
        data_type: "object",
        data_keys: ["id", "order_id", "status", "awb", "courier"],
        message: null,
      },
    }),
    ...overrides,
  };
}

function makeEmptyDiagnostics(): ShipmentDiagnostics {
  return {
    upstream_status: 200,
    top_level_keys: ["data"],
    data_present: true,
    data_type: "object",
    data_keys: ["id", "order_id", "status", "awb", "courier"],
    message: null,
  };
}

const SHIPROCKET_PII_RESPONSE: ShiprocketShipmentDetail & Record<string, unknown> =
  {
    id: 16047755353,
    order_id: 7890123,
    channel_order_id: "DND-DBD87242",
    status: "ORDER_CREATED",
    awb: "AWB123456789",
    courier: "DTDC",
    shipping_customer_name: "John Doe",
    shipping_phone: "9999999999",
    shipping_email: "john@example.com",
    billing_address: "Secret billing address",
    billing_email: "billing@example.com",
    billing_phone: "8888888888",
    billing_customer_name: "Jane Doe",
  };

describe("shiprocket shipment diagnostic — buildLookupResponse", () => {
  it("D6: correctly maps fields using Shiprocket endpoint field names", () => {
    const result = buildLookupResponse({
      id: 16047755353,
      order_id: 7890123,
      status: "DISPATCHED",
      awb: "12345678901",
      courier: "Bluedart",
    });

    assert.equal(result.shipment_id, "16047755353");
    assert.equal(result.shiprocket_order_id, "7890123");
    assert.equal(result.channel_order_id, null);
    assert.equal(result.status, "DISPATCHED");
    assert.equal(result.awb_code, "12345678901");
    assert.equal(result.courier_name, "Bluedart");
  });

  it("D7: PII fields are stripped by buildLookupResponse", () => {
    const result = buildLookupResponse(
      SHIPROCKET_PII_RESPONSE as ShiprocketShipmentDetail,
    );

    const keys = Object.keys(result);
    assert.ok(!keys.includes("shipping_customer_name"));
    assert.ok(!keys.includes("shipping_phone"));
    assert.ok(!keys.includes("shipping_email"));
    assert.ok(!keys.includes("billing_address"));
    assert.ok(!keys.includes("billing_email"));
    assert.ok(!keys.includes("billing_phone"));
    assert.ok(!keys.includes("billing_customer_name"));
    assert.deepEqual(
      keys.sort(),
      [
        "awb_code",
        "channel_order_id",
        "courier_name",
        "shipment_id",
        "shiprocket_order_id",
        "status",
      ],
    );
  });

  it("D8: numeric id is converted to string", () => {
    const result = buildLookupResponse({ id: 16047775753 });
    assert.equal(result.shipment_id, "16047775753");
    assert.equal(typeof result.shipment_id, "string");
  });

  it("D9: string id is preserved as-is", () => {
    const result = buildLookupResponse({ id: "abc-def-123" });
    assert.equal(result.shipment_id, "abc-def-123");
    assert.equal(typeof result.shipment_id, "string");
  });

  it("D10: legacy field names work as fallback (shipment_id, awb_code, courier_name)", () => {
    const result = buildLookupResponse({
      shipment_id: 16012345,
      order_id: 5678,
      status: "PICKED",
      awb_code: "LEGACY-AWB",
      courier_name: "LegacyCourier",
    });

    assert.equal(result.shipment_id, "16012345");
    assert.equal(result.shiprocket_order_id, "5678");
    assert.equal(result.awb_code, "LEGACY-AWB");
    assert.equal(result.courier_name, "LegacyCourier");
    assert.equal(result.status, "PICKED");
  });

  it("D10b: null/undefined values are handled gracefully", () => {
    const result = buildLookupResponse({
      id: 123,
      order_id: undefined,
      channel_order_id: undefined,
      status: undefined,
      awb: null,
      courier: null,
    });

    assert.equal(result.shipment_id, "123");
    assert.equal(result.shiprocket_order_id, null);
    assert.equal(result.channel_order_id, null);
    assert.equal(result.status, null);
    assert.equal(result.awb_code, null);
    assert.equal(result.courier_name, null);
  });

  it("D10c: channel_order_id is null when not present (not fabricated from channel_id)", () => {
    const result = buildLookupResponse({
      id: 16047755353,
      order_id: 7890123,
      channel_id: "9876543210",
      status: "ORDER_CREATED",
    });

    assert.equal(result.channel_order_id, null, "channel_order_id must not be fabricated from channel_id");
    assert.equal(result.shipment_id, "16047755353");
    assert.equal(result.shiprocket_order_id, "7890123");
  });
});

describe("shiprocket shipment diagnostic — route handler", () => {
  describe("authentication and authorization", () => {
    it("D1: requires admin authentication", async () => {
      const deps = makeDeps({
        requireAdmin: async () => {
          throw new Error("FORBIDDEN");
        },
      });

      const res = await handleShipmentLookup(
        new Request("https://dandyonline.in/test"),
        "16047775753",
        deps,
      );

      assert.equal(res.status, 403);
      assert.equal((res.body as { error: string }).error, "Access denied.");
    });

    it("D2: same-origin protection rejects non-same-origin requests", async () => {
      const deps = makeDeps({
        originOk: () => false,
      });

      const res = await handleShipmentLookup(
        new Request("https://dandyonline.in/test"),
        "16047775753",
        deps,
      );

      assert.equal(res.status, 403);
      assert.equal((res.body as { error: string }).error, "Invalid origin.");
    });

    it("D2b: originOk failure short-circuits before requireAdmin", async () => {
      let requireAdminCalled = false;
      const deps = makeDeps({
        originOk: () => false,
        requireAdmin: async () => {
          requireAdminCalled = true;
          return { id: "admin1", role: "ADMIN" };
        },
      });

      const res = await handleShipmentLookup(
        new Request("https://dandyonline.in/test"),
        "16047775753",
        deps,
      );

      assert.equal(res.status, 403);
      assert.equal(
        requireAdminCalled,
        false,
        "requireAdmin must not be called when origin check fails",
      );
    });
  });

  describe("successful lookup", () => {
    it("D3: successful lookup returns shipment details", async () => {
      const deps = makeDeps();

      const res = await handleShipmentLookup(
        new Request("https://dandyonline.in/test"),
        "16047775753",
        deps,
      );

      assert.equal(res.status, 200);
      const body = res.body as Record<string, unknown>;
      assert.equal(body.shipment_id, "16047755353");
      assert.equal(body.shiprocket_order_id, "7890123");
      assert.equal(body.status, "ORDER_CREATED");
      assert.equal(body.awb_code, "AWB123456789");
      assert.equal(body.courier_name, "DTDC");
    });

    it("D4: Cache-Control header is no-store", async () => {
      const deps = makeDeps();

      const res = await handleShipmentLookup(
        new Request("https://dandyonline.in/test"),
        "16047775753",
        deps,
      );

      assert.equal(res.status, 200);
      assert.equal(res.headers["Cache-Control"], "no-store, max-age=0");
    });

    it("D5: passes shipmentId from params to diagnostic fetch", async () => {
      let receivedId: string | undefined;
      const deps = makeDeps({
        fetchShipmentByIdWithDiagnostics: async (id: string) => {
          receivedId = id;
          return {
            data: { id },
            diagnostics: makeEmptyDiagnostics(),
          };
        },
      });

      const res = await handleShipmentLookup(
        new Request("https://dandyonline.in/test"),
        "xyz-789",
        deps,
      );

      assert.equal(res.status, 200);
      assert.equal(receivedId, "xyz-789");
    });

    it("D5b: response includes _diagnostics field", async () => {
      const deps = makeDeps();

      const res = await handleShipmentLookup(
        new Request("https://dandyonline.in/test"),
        "16047755353",
        deps,
      );

      assert.equal(res.status, 200);
      const body = res.body as Record<string, unknown>;
      assert.ok("_diagnostics" in body, "_diagnostics must be present in response");
      const diag = body._diagnostics as ShipmentDiagnostics;
      assert.equal(diag.upstream_status, 200);
      assert.deepEqual(diag.top_level_keys, ["data"]);
      assert.equal(diag.data_present, true);
      assert.equal(diag.data_type, "object");
    });
  });

  describe("PII redaction in API response", () => {
    it("D7: PII fields are not exposed in the API response", async () => {
      const deps = makeDeps({
        fetchShipmentByIdWithDiagnostics: async () => ({
          data: SHIPROCKET_PII_RESPONSE as ShiprocketShipmentDetail,
          diagnostics: makeEmptyDiagnostics(),
        }),
      });

      const res = await handleShipmentLookup(
        new Request("https://dandyonline.in/test"),
        "16047755353",
        deps,
      );

      assert.equal(res.status, 200);
      const body = res.body as Record<string, unknown>;

      const expectedKeys = new Set([
        "shipment_id",
        "shiprocket_order_id",
        "channel_order_id",
        "status",
        "awb_code",
        "courier_name",
        "_diagnostics",
        "_probe",
      ]);
      const actualKeys = new Set(Object.keys(body));
      assert.deepEqual(actualKeys, expectedKeys, "Response should contain only expected fields + _diagnostics");

      assert.ok(!("shipping_customer_name" in body));
      assert.ok(!("shipping_phone" in body));
      assert.ok(!("shipping_email" in body));
      assert.ok(!("billing_address" in body));
      assert.ok(!("billing_email" in body));
      assert.ok(!("billing_phone" in body));
      assert.ok(!("billing_customer_name" in body));
    });

    it("D17: response contains expected public fields with correct values", async () => {
      const deps = makeDeps({
        fetchShipmentByIdWithDiagnostics: async () => ({
          data: {
            id: 16047755353,
            order_id: 7890123,
            status: "ORDER_CREATED",
            awb: "AWB123456789",
            courier: "DTDC",
            shipping_customer_name: "John Doe",
            shipping_phone: "9999999999",
            shipping_email: "john@example.com",
          } as ShiprocketShipmentDetail,
          diagnostics: makeEmptyDiagnostics(),
        }),
      });

      const res = await handleShipmentLookup(
        new Request("https://dandyonline.in/test"),
        "16047755353",
        deps,
      );
      assert.equal(res.status, 200);

      const body = res.body as Record<string, unknown>;
      assert.equal(body.shipment_id, "16047755353");
      assert.equal(body.shiprocket_order_id, "7890123");
      assert.equal(body.awb_code, "AWB123456789");
      assert.equal(body.courier_name, "DTDC");
      assert.equal(body.status, "ORDER_CREATED");
    });
  });

  describe("error handling", () => {
    it("D11: Shiprocket 404 returns 404 status", async () => {
      const deps = makeDeps({
        fetchShipmentByIdWithDiagnostics: async () => {
          throw new ShiprocketNotFoundError("Shipment not found");
        },
      });

      const res = await handleShipmentLookup(
        new Request("https://dandyonline.in/test"),
        "16047775753",
        deps,
      );

      assert.equal(res.status, 404);
      assert.equal((res.body as { error: string }).error, "Shiprocket shipment not found.");
    });

    it("D12: Shiprocket rate limit (429) preserves status code", async () => {
      const deps = makeDeps({
        fetchShipmentByIdWithDiagnostics: async () => {
          throw new ShiprocketError("Rate limit exceeded", 429);
        },
      });

      const res = await handleShipmentLookup(
        new Request("https://dandyonline.in/test"),
        "16047775753",
        deps,
      );

      assert.equal(res.status, 429);
      assert.equal((res.body as { error: string }).error, "Shiprocket API error.");
    });

    it("D13: Shiprocket generic error (500) returns 502", async () => {
      const deps = makeDeps({
        fetchShipmentByIdWithDiagnostics: async () => {
          throw new ShiprocketError("Internal server error", 500);
        },
      });

      const res = await handleShipmentLookup(
        new Request("https://dandyonline.in/test"),
        "16047775753",
        deps,
      );

      assert.equal(res.status, 502);
      assert.equal((res.body as { error: string }).error, "Shiprocket API error.");
    });

    it("D14: generic error returns 502 with Bearer token sanitized", async () => {
      const deps = makeDeps({
        fetchShipmentByIdWithDiagnostics: async () => {
          throw new Error("Bearer abc123def456 secret request failed");
        },
      });

      const res = await handleShipmentLookup(
        new Request("https://dandyonline.in/test"),
        "16047775753",
        deps,
      );

      assert.equal(res.status, 502);
      const body = res.body as { error: string };
      assert.ok(!body.error.includes("abc123def456"), "Should not leak token in error body");
      assert.ok(body.error.includes("[REDACTED]"), "Token should be sanitized");
    });

    it("D15: error response does not expose Shiprocket credentials", async () => {
      const deps = makeDeps({
        fetchShipmentByIdWithDiagnostics: async () => {
          throw new ShiprocketError(
            "Bearer abc123 password=salihforinmakes1210@gmail.com SHIPROCKET_PASSWORD=secret123 error",
            500,
          );
        },
      });

      const res = await handleShipmentLookup(
        new Request("https://dandyonline.in/test"),
        "16047775753",
        deps,
      );

      assert.equal(res.status, 502);
      const body = res.body as { error: string };
      assert.ok(!body.error.includes("secret123"), "Should not leak password");
      assert.ok(!body.error.includes("abc123"), "Should not leak token");
      assert.ok(!body.error.includes("salihforinmakes1210"), "Should not leak email");
    });

    it("D18: Shiprocket auth error (401) returns 401", async () => {
      const deps = makeDeps({
        fetchShipmentByIdWithDiagnostics: async () => {
          throw new ShiprocketAuthError("Authentication failed");
        },
      });

      const res = await handleShipmentLookup(
        new Request("https://dandyonline.in/test"),
        "16047775753",
        deps,
      );

      assert.equal(res.status, 401);
      assert.equal((res.body as { error: string }).error, "Shiprocket API error.");
    });
  });

  describe("diagnostic response for empty data", () => {
    it("D21: empty data with diagnostics reveals response structure", async () => {
      const deps = makeDeps({
        fetchShipmentByIdWithDiagnostics: async () => ({
          data: {} as ShiprocketShipmentDetail,
          diagnostics: {
            upstream_status: 200,
            top_level_keys: ["data"],
            data_present: true,
            data_type: "object",
            data_keys: [],
            message: null,
          },
        }),
      });

      const res = await handleShipmentLookup(
        new Request("https://dandyonline.in/test"),
        "16047775753",
        deps,
      );

      assert.equal(res.status, 200);
      const body = res.body as Record<string, unknown>;
      assert.equal(body.shipment_id, "");
      const diag = body._diagnostics as ShipmentDiagnostics;
      assert.equal(diag.upstream_status, 200);
      assert.equal(diag.data_present, true);
      assert.deepEqual(
        diag.data_keys,
        [],
        "Empty data object has no keys",
      );
    });

    it("D22: null data with diagnostics reveals data_present=false", async () => {
      const deps = makeDeps({
        fetchShipmentByIdWithDiagnostics: async () => ({
          data: {} as ShiprocketShipmentDetail,
          diagnostics: {
            upstream_status: 200,
            top_level_keys: ["data", "message"],
            data_present: false,
            data_type: "null",
            data_keys: null,
            message: "shipment not found",
          },
        }),
      });

      const res = await handleShipmentLookup(
        new Request("https://dandyonline.in/test"),
        "16047775753",
        deps,
      );

      assert.equal(res.status, 200);
      const body = res.body as Record<string, unknown>;
      assert.equal(body.shipment_id, "");
      const diag = body._diagnostics as ShipmentDiagnostics;
      assert.equal(diag.upstream_status, 200);
      assert.equal(diag.data_present, false);
      assert.equal(diag.data_type, "null");
      assert.equal(diag.message, "shipment not found");
    });

    it("D23: diagnostics do not expose PII in keys or message", async () => {
      const deps = makeDeps({
        fetchShipmentByIdWithDiagnostics: async () => ({
          data: {} as ShiprocketShipmentDetail,
          diagnostics: {
            upstream_status: 500,
            top_level_keys: ["data", "message"],
            data_present: false,
            data_type: "null",
            data_keys: null,
             message: "Bearer [REDACTED] request failed",
          },
        }),
      });

      const res = await handleShipmentLookup(
        new Request("https://dandyonline.in/test"),
        "16047775753",
        deps,
      );

      assert.equal(res.status, 200);
      const body = res.body as Record<string, unknown>;
      const diag = body._diagnostics as ShipmentDiagnostics;
      assert.ok(!diag.message?.includes("abc123"), "Token must be redacted in diagnostic message");
      assert.ok(diag.message?.includes("[REDACTED]"), "Token should be redacted");
      assert.ok(!JSON.stringify(diag).includes("John Doe"));
      assert.ok(!JSON.stringify(diag).includes("salihforinmakes1210"));
      assert.ok(!JSON.stringify(diag).includes("secret123"));
    });

    it("D24: diagnostics preserve upstream HTTP status for error cases", async () => {
      const deps = makeDeps({
        fetchShipmentByIdWithDiagnostics: async () => {
          throw new ShiprocketNotFoundError("Not found");
        },
      });

      const res = await handleShipmentLookup(
        new Request("https://dandyonline.in/test"),
        "16047775753",
        deps,
      );

      assert.equal(res.status, 404);
      assert.equal((res.body as { error: string }).error, "Shiprocket shipment not found.");
    });
  });

  describe("no mutation methods are called", () => {
    it("D19: lookup uses only read-only deps — mutation mocks never called", async () => {
      const createOrderFn = mock.fn(() => Promise.reject(new Error("createOrder should not be called")));
      const assignAWBFn = mock.fn(() => Promise.reject(new Error("assignAWB should not be called")));
      const schedulePickupFn = mock.fn(() => Promise.reject(new Error("schedulePickup should not be called")));
      const generateLabelFn = mock.fn(() => Promise.reject(new Error("generateLabel should not be called")));

      const deps = makeDeps();

      const res = await handleShipmentLookup(
        new Request("https://dandyonline.in/test"),
        "16047775753",
        deps,
      );

      assert.equal(res.status, 200);
      assert.equal(createOrderFn.mock.calls.length, 0);
      assert.equal(assignAWBFn.mock.calls.length, 0);
      assert.equal(schedulePickupFn.mock.calls.length, 0);
      assert.equal(generateLabelFn.mock.calls.length, 0);
    });

    it("D20: fetchShipmentByIdWithDiagnostics is called exactly once with correct shipmentId", async () => {
      let callCount = 0;
      let receivedId: string | undefined;
      const deps = makeDeps({
        fetchShipmentByIdWithDiagnostics: async (id: string) => {
          callCount++;
          receivedId = id;
          return {
            data: { id },
            diagnostics: makeEmptyDiagnostics(),
          };
        },
      });

      const res = await handleShipmentLookup(
        new Request("https://dandyonline.in/test"),
        "test-ship-123",
        deps,
      );

      assert.equal(res.status, 200);
      assert.equal(callCount, 1);
      assert.equal(receivedId, "test-ship-123");
    });
  });
});

function mockShiprocketFetch(
  impl: (url: string, init?: RequestInit) => Promise<Response>,
): { restore: () => void } {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = (async (url: string | URL | Request, init?: RequestInit) =>
    impl(String(url), init)) as unknown as typeof fetch;
  return {
    restore: () => {
      globalThis.fetch = originalFetch;
    },
  };
}

describe("shiprocket endpoint probe — probeShiprocketEndpoints (client)", () => {
  it("P1: probes shipment and order-show endpoints and captures safe metadata", async () => {
    configureToken("probe-token", Date.now() + 60 * 60_000);
    const { restore } = mockShiprocketFetch(async (url, init) => {
      const headers = (init?.headers ?? {}) as Record<string, string>;
      assert.equal(headers.Authorization, "Bearer probe-token");
      if (url.includes("/v1/external/shipments/")) {
        return new Response("{}", {
          status: 200,
          headers: { "content-type": "application/json" },
        });
      }
      return new Response(JSON.stringify({ data: { id: 123 } }), {
        status: 200,
        headers: { "content-type": "application/json" },
      });
    });

    try {
      const probes = await probeShiprocketEndpoints("16047775753");

      assert.equal(probes.length, 2);

      assert.equal(probes[0].endpoint, "/v1/external/shipments/16047775753");
      assert.equal(probes[0].upstream_status, 200);
      assert.equal(probes[0].content_type, "application/json");
      assert.equal(probes[0].body_length, 2);
      assert.equal(probes[0].is_empty_object, true);
      assert.deepEqual(probes[0].top_level_keys, []);
      assert.equal(probes[0].message, null);
      assert.equal(probes[0].error, null);

      assert.equal(probes[1].endpoint, "/v1/external/orders/show/16047775753");
      assert.equal(probes[1].upstream_status, 200);
      assert.equal(probes[1].content_type, "application/json");
      assert.equal(probes[1].is_empty_object, false);
      assert.deepEqual(probes[1].top_level_keys, ["data"]);
      assert.equal(probes[1].message, null);
      assert.equal(probes[1].error, null);
    } finally {
      restore();
      clearTokenCache();
    }
  });

  it("P2: empty body is distinct from {} (length 0, not an empty object)", async () => {
    configureToken("probe-token", Date.now() + 60 * 60_000);
    const { restore } = mockShiprocketFetch(async () =>
      new Response("", { status: 200 }),
    );

    try {
      const probes = await probeShiprocketEndpoints("16047775753");

      assert.equal(probes.length, 2);
      for (const probe of probes) {
        assert.equal(probe.upstream_status, 200);
        assert.equal(probe.body_length, 0);
        assert.equal(probe.is_empty_object, false);
        assert.deepEqual(probe.top_level_keys, []);
        assert.equal(probe.message, null);
        assert.equal(probe.error, null);
      }
    } finally {
      restore();
      clearTokenCache();
    }
  });

  it("P3: unparseable body is recorded as an error, not thrown", async () => {
    configureToken("probe-token", Date.now() + 60 * 60_000);
    const html = "<html>gateway</html>";
    const { restore } = mockShiprocketFetch(async () =>
      new Response(html, {
        status: 200,
        headers: { "content-type": "text/html" },
      }),
    );

    try {
      const probes = await probeShiprocketEndpoints("16047775753");

      assert.equal(probes.length, 2);
      for (const probe of probes) {
        assert.equal(probe.upstream_status, 200);
        assert.equal(probe.content_type, "text/html");
        assert.equal(probe.body_length, html.length);
        assert.equal(probe.is_empty_object, false);
        assert.deepEqual(probe.top_level_keys, []);
        assert.equal(probe.message, null);
        assert.equal(probe.error, "response body is not valid JSON");
      }
    } finally {
      restore();
      clearTokenCache();
    }
  });

  it("P4: redacts tokens, emails, and phone numbers in captured message", async () => {
    configureToken("probe-token", Date.now() + 60 * 60_000);
    const { restore } = mockShiprocketFetch(async () =>
      new Response(
        JSON.stringify({ message: "Bearer abc123def failed for user@example.com 9876543210" }),
        {
          status: 200,
          headers: { "content-type": "application/json" },
        },
      ),
    );

    try {
      const probes = await probeShiprocketEndpoints("16047775753");

      assert.equal(
        probes[0].message,
        "Bearer [REDACTED] failed for [EMAIL] [PHONE]",
      );
      const serialized = JSON.stringify(probes);
      assert.ok(!serialized.includes("abc123def"), "token must not leak");
      assert.ok(!serialized.includes("user@example.com"), "email must not leak");
      assert.ok(!serialized.includes("9876543210"), "phone must not leak");
    } finally {
      restore();
      clearTokenCache();
    }
  });

  it("P5: records non-2xx statuses (404/401) instead of throwing", async () => {
    configureToken("probe-token", Date.now() + 60 * 60_000);
    const { restore } = mockShiprocketFetch(async (url) => {
      if (url.includes("/v1/external/shipments/")) {
        return new Response("{}", { status: 404 });
      }
      return new Response("{}", { status: 401 });
    });

    try {
      const probes = await probeShiprocketEndpoints("16047775753");

      assert.equal(probes[0].upstream_status, 404);
      assert.equal(probes[1].upstream_status, 401);
    } finally {
      restore();
      clearTokenCache();
    }
  });

  it("P6: network failures are captured safely without exposing the token", async () => {
    configureToken("probe-token-secret", Date.now() + 60 * 60_000);
    const { restore } = mockShiprocketFetch(async () => {
      throw new Error("Bearer probe-token-secret network failure");
    });

    try {
      const probes = await probeShiprocketEndpoints("16047775753");

      assert.equal(probes.length, 2);
      for (const probe of probes) {
        assert.equal(probe.upstream_status, null);
        assert.equal(probe.content_type, null);
        assert.equal(probe.body_length, null);
        assert.equal(probe.is_empty_object, false);
        assert.deepEqual(probe.top_level_keys, []);
        assert.equal(probe.message, null);
        assert.ok(probe.error !== null);
        assert.ok(probe.error.includes("[REDACTED]"));
        assert.ok(!probe.error.includes("probe-token-secret"));
      }
    } finally {
      restore();
      clearTokenCache();
    }
  });
});

describe("shiprocket endpoint probe — handleShipmentProbe", () => {
  function makeProbeDeps(overrides: Partial<ProbeDeps> = {}): ProbeDeps {
    return {
      requireAdmin: async () => ({ id: "admin1", role: "ADMIN" }),
      originOk: () => true,
      probeShiprocketEndpoints: async () => [
        {
          endpoint: "/v1/external/shipments/16047775753",
          upstream_status: 200,
          content_type: "application/json",
          body_length: 2,
          is_empty_object: true,
          top_level_keys: [],
          message: null,
          error: null,
        },
        {
          endpoint: "/v1/external/orders/show/16047775753",
          upstream_status: 200,
          content_type: "application/json",
          body_length: 27,
          is_empty_object: false,
          top_level_keys: ["data"],
          message: null,
          error: null,
        },
      ],
      ...overrides,
    };
  }

  it("P7: requires admin authentication", async () => {
    const deps = makeProbeDeps({
      requireAdmin: async () => {
        throw new Error("FORBIDDEN");
      },
    });

    const res = await handleShipmentProbe(
      new Request("https://dandyonline.in/test"),
      "16047775753",
      deps,
    );

    assert.equal(res.status, 403);
    assert.equal((res.body as { error: string }).error, "Access denied.");
  });

  it("P8: rejects non-same-origin requests", async () => {
    const deps = makeProbeDeps({ originOk: () => false });

    const res = await handleShipmentProbe(
      new Request("https://dandyonline.in/test"),
      "16047775753",
      deps,
    );

    assert.equal(res.status, 403);
    assert.equal((res.body as { error: string }).error, "Invalid origin.");
  });

  it("P9: returns probe results for both endpoints with no-store", async () => {
    const deps = makeProbeDeps();

    const res = await handleShipmentProbe(
      new Request("https://dandyonline.in/test"),
      "16047775753",
      deps,
    );

    assert.equal(res.status, 200);
    assert.equal(res.headers["Cache-Control"], "no-store, max-age=0");
    const body = res.body as { shipment_id: string; probes: EndpointProbeResult[] };
    assert.equal(body.shipment_id, "16047775753");
    assert.equal(body.probes.length, 2);
    assert.equal(body.probes[0].endpoint, "/v1/external/shipments/16047775753");
    assert.equal(body.probes[0].is_empty_object, true);
    assert.equal(body.probes[0].body_length, 2);
    assert.equal(body.probes[1].endpoint, "/v1/external/orders/show/16047775753");
    assert.equal(body.probes[1].is_empty_object, false);
  });

  it("P10: probe response never includes the auth token or credentials", async () => {
    const deps = makeProbeDeps();

    const res = await handleShipmentProbe(
      new Request("https://dandyonline.in/test"),
      "16047775753",
      deps,
    );

    assert.equal(res.status, 200);
    const serialized = JSON.stringify(res.body);
    assert.ok(!serialized.includes("Bearer"), "Bearer token must not leak");
    assert.ok(!serialized.includes("authorization"), "auth header must not leak");
    assert.ok(!serialized.includes("probe-token"), "token must not leak");
  });

  it("P11: probe errors are sanitized before being returned", async () => {
    const deps = makeProbeDeps({
      probeShiprocketEndpoints: async () => {
        throw new Error("Bearer abc123def456 secret failure");
      },
    });

    const res = await handleShipmentProbe(
      new Request("https://dandyonline.in/test"),
      "16047775753",
      deps,
    );

    assert.equal(res.status, 502);
    const body = res.body as { error: string };
    assert.ok(!body.error.includes("abc123def456"), "token must not leak");
    assert.ok(body.error.includes("[REDACTED]"), "token should be redacted");
  });
});
