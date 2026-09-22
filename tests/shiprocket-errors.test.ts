import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  ShiprocketError,
  ShiprocketAuthError,
  ShiprocketApiError,
  ShiprocketValidationError,
  ShiprocketTimeoutError,
  normalizeShiprocketError,
} from "@/lib/shiprocket/errors";

describe("ShiprocketError", () => {
  it("E1: extends Error with correct message", () => {
    const err = new ShiprocketError("Something went wrong");
    assert.ok(err instanceof Error);
    assert.equal(err.message, "Something went wrong");
    assert.equal(err.name, "ShiprocketError");
  });

  it("E2: accepts status code via constructor", () => {
    const err = new ShiprocketError("Wrapper", 500, undefined);
    assert.equal(err.statusCode, 500);
  });
});

describe("ShiprocketAuthError", () => {
  it("E3: extends ShiprocketError", () => {
    const err = new ShiprocketAuthError("Invalid token");
    assert.ok(err instanceof ShiprocketError);
    assert.ok(err instanceof Error);
    assert.equal(err.name, "ShiprocketAuthError");
  });

  it("E4: includes status code 401", () => {
    const err = new ShiprocketAuthError("Unauthorized");
    assert.equal(err.status, 401);
  });
});

describe("ShiprocketApiError", () => {
  it("E5: extends ShiprocketError", () => {
    const err = new ShiprocketApiError("Server error", 500);
    assert.ok(err instanceof ShiprocketError);
    assert.equal(err.name, "ShiprocketApiError");
  });

  it("E6: stores status code", () => {
    const err = new ShiprocketApiError("Not found", 404);
    assert.equal(err.status, 404);
  });

  it("E7: default status code is 500", () => {
    const err = new ShiprocketApiError("Server error");
    assert.equal(err.status, 500);
  });
});

describe("ShiprocketValidationError", () => {
  it("E8: extends ShiprocketError", () => {
    const err = new ShiprocketValidationError("Missing weight");
    assert.ok(err instanceof ShiprocketError);
    assert.equal(err.name, "ShiprocketValidationError");
  });

  it("E9: includes field info", () => {
    const err = new ShiprocketValidationError("Missing weight", { field: "weight" });
    assert.equal(err.field, "weight");
  });

  it("E10: field is optional", () => {
    const err = new ShiprocketValidationError("Bad input");
    assert.equal(err.field, undefined);
  });
});

describe("error type narrowing", () => {
  it("E11: instanceof works for branching", () => {
    const errors: Error[] = [
      new ShiprocketAuthError("auth"),
      new ShiprocketApiError("api", 503),
      new ShiprocketValidationError("validation"),
      new ShiprocketError("base"),
      new Error("plain"),
    ];

    let authCount = 0;
    let apiCount = 0;
    let validationCount = 0;
    let baseCount = 0;
    let plainCount = 0;

    for (const err of errors) {
      if (err instanceof ShiprocketAuthError) {
        authCount++;
      } else if (err instanceof ShiprocketApiError) {
        apiCount++;
      } else if (err instanceof ShiprocketValidationError) {
        validationCount++;
      } else if (err instanceof ShiprocketError) {
        baseCount++;
      } else {
        plainCount++;
      }
    }

    assert.equal(authCount, 1);
    assert.equal(apiCount, 1);
    assert.equal(validationCount, 1);
    assert.equal(baseCount, 1);
    assert.equal(plainCount, 1);
  });
});

describe("ShiprocketTimeoutError", () => {
  it("E12: extends ShiprocketError with status 408", () => {
    const err = new ShiprocketTimeoutError();
    assert.ok(err instanceof ShiprocketError);
    assert.equal(err.name, "ShiprocketTimeoutError");
    assert.equal(err.statusCode, 408);
  });

  it("E13: accepts custom message", () => {
    const err = new ShiprocketTimeoutError("Request to /v1/external/orders timed out");
    assert.equal(err.message, "Request to /v1/external/orders timed out");
  });
});

describe("normalizeShiprocketError — PII sanitization", () => {
  it("N1: redacts bearer tokens", () => {
    const input = "Bearer abc123def456 error from shiprocket";
    const result = normalizeShiprocketError(input);
    assert.ok(!result.includes("abc123def456"));
    assert.ok(result.includes("Bearer [REDACTED]"));
  });

  it("N2: redacts email addresses", () => {
    const input = "Invalid request for admin@test.com";
    const result = normalizeShiprocketError(input);
    assert.ok(!result.includes("admin@test.com"));
    assert.ok(result.includes("[EMAIL]"));
  });

  it("N3: redacts Indian phone numbers with +91", () => {
    const input = "Contact 91-9876543210 for details";
    const result = normalizeShiprocketError(input);
    assert.ok(!result.includes("9876543210"));
    assert.ok(result.includes("[PHONE]"));
  });

  it("N4: redacts Indian phone numbers without country code", () => {
    const input = "Phone: 9876543210";
    const result = normalizeShiprocketError(input);
    assert.ok(!result.includes("9876543210"));
  });

  it("N5: redacts Authorization headers", () => {
    const input = "Authorization: Bearer xyz789token123";
    const result = normalizeShiprocketError(input);
    assert.ok(!result.includes("xyz789token123"));
  });

  it("N6: preserves generic error context (status, messages)", () => {
    const input = "Shiprocket API error: 422 Validation failed for order DND-123";
    const result = normalizeShiprocketError(input);
    assert.ok(result.includes("422"));
    assert.ok(result.includes("Validation failed"));
    assert.ok(result.includes("DND-123"));
  });

  it("N7: does not crash on empty or non-string input", () => {
    assert.equal(normalizeShiprocketError(""), "");
    assert.equal(normalizeShiprocketError("plain text"), "plain text");
  });

  it("N8: redacts raw response bodies containing multiple PII types", () => {
    const input = "Error 422 for user@example.com phone 9876543210 with Bearer secret_token_123";
    const result = normalizeShiprocketError(input);
    assert.ok(!result.includes("user@example.com"));
    assert.ok(!result.includes("9876543210"));
    assert.ok(!result.includes("secret_token_123"));
    assert.ok(result.includes("[EMAIL]"));
    assert.ok(result.includes("[PHONE]"));
    assert.ok(result.includes("Bearer [REDACTED]"));
  });
});
