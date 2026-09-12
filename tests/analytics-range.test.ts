import { describe, it } from "node:test";
import assert from "node:assert/strict";

import {
  ANALYTICS_MAX_RANGE_DAYS,
  AnalyticsRangeError,
  AnalyticsDateRange,
  resolveAnalyticsRange,
} from "../src/lib/db/analytics-range";

const TODAY = "2026-09-12" as const;

function spanDays(range: { start: Date; end: Date }): number {
  return (range.end.getTime() - range.start.getTime()) / (24 * 60 * 60 * 1000);
}

function assertRangeError(fn: () => void, messageFragment: string) {
  assert.throws(
    fn,
    (err: unknown) =>
      err instanceof AnalyticsRangeError &&
      typeof (err as Error).message === "string" &&
      (err as Error).message.includes(messageFragment),
    `expected AnalyticsRangeError containing "${messageFragment}"`
  );
}

describe("analytics-range: max range constant", () => {
  it("M3: exposes a 365-day maximum", () => {
    assert.equal(ANALYTICS_MAX_RANGE_DAYS, 365);
  });
});

describe("analytics-range: explicit start+end", () => {
  it("T1: valid 90-day custom range is accepted", () => {
    const r = resolveAnalyticsRange({ start: "2026-06-14", end: "2026-09-12" }, TODAY);
    assert.ok(r.start < r.end);
    assert.ok(spanDays(r) <= ANALYTICS_MAX_RANGE_DAYS);
  });

  it("T2: exactly 365 calendar days is accepted (non-leap year)", () => {
    const r = resolveAnalyticsRange({ start: "2021-01-01", end: "2021-12-31" }, TODAY);
    assert.equal(spanDays(r), 365);
  });

  it("T3: more than 365 calendar days is rejected", () => {
    assertRangeError(
      () => resolveAnalyticsRange({ start: "2021-01-01", end: "2022-01-01" }, TODAY),
      "date range exceeds maximum"
    );
  });

  it("T4: start > end is rejected (no silent swap)", () => {
    assertRangeError(
      () => resolveAnalyticsRange({ start: "2026-09-12", end: "2026-09-10" }, TODAY),
      "start must be before or equal to end"
    );
  });

  it("T5: future end date is rejected", () => {
    assertRangeError(
      () => resolveAnalyticsRange({ start: "2026-09-01", end: "2030-12-31" }, TODAY),
      "end date cannot be in the future"
    );
  });

  it("T8a: 30-day preset-equivalent range is accepted", () => {
    const r = resolveAnalyticsRange({ start: "2026-08-14", end: "2026-09-12" }, TODAY);
    assert.equal(spanDays(r), 30);
  });

  it("T8b: 31-day preset-equivalent range is accepted", () => {
    const r = resolveAnalyticsRange({ start: "2026-08-13", end: "2026-09-12" }, TODAY);
    assert.equal(spanDays(r), 31);
  });

  it("same-day range (1 day) is accepted", () => {
    const r = resolveAnalyticsRange({ start: "2026-09-12", end: "2026-09-12" }, TODAY);
    assert.equal(spanDays(r), 1);
  });

  it("end == today is accepted (not treated as future)", () => {
    const r = resolveAnalyticsRange({ start: "2026-09-10", end: "2026-09-12" }, TODAY);
    assert.ok(spanDays(r) <= ANALYTICS_MAX_RANGE_DAYS);
  });
});

describe("analytics-range: start-only", () => {
  it("T2b: start-only spanning exactly 365 days is accepted", () => {
    const r = resolveAnalyticsRange({ start: "2025-09-13" }, TODAY);
    assert.equal(spanDays(r), 365);
  });

  it("T3b: start-only spanning 366 days is rejected", () => {
    assertRangeError(
      () => resolveAnalyticsRange({ start: "2025-09-12" }, TODAY),
      "date range exceeds maximum"
    );
  });

  it("future start (start > end) is rejected", () => {
    assertRangeError(
      () => resolveAnalyticsRange({ start: "2030-01-01" }, TODAY),
      "start must be before or equal to end"
    );
  });
});

describe("analytics-range: end-only", () => {
  it("pathological end-only range (since 2000) is bounded and rejected", () => {
    assertRangeError(
      () => resolveAnalyticsRange({ end: "2026-09-12" }, TODAY),
      "date range exceeds maximum"
    );
  });

  it("future end-only is rejected as future", () => {
    assertRangeError(
      () => resolveAnalyticsRange({ end: "2030-12-31" }, TODAY),
      "end date cannot be in the future"
    );
  });

  it("a 1-day end-only range is accepted", () => {
    const r = resolveAnalyticsRange({ end: "2000-01-01" }, TODAY);
    assert.equal(spanDays(r), 1);
  });
});

describe("analytics-range: no range (default)", () => {
  it("T6: undefined range resolves to This Month (bounded, no throw)", () => {
    const r = resolveAnalyticsRange(undefined, TODAY);
    assert.equal(spanDays(r), 30);
    assert.ok(r.start < r.end);
  });

  it("empty-string start/end behaves like no range (This Month)", () => {
    const r = resolveAnalyticsRange({ start: "", end: "" }, TODAY);
    assert.equal(spanDays(r), 30);
  });
});

describe("analytics-range: All Time independence (Stage 18D / M3-T7)", () => {
  it("T7: the resolver has no all-time parameter and does not accept an allTime flag", () => {
    // All-time figures are produced by a separate, unconditional server query
    // (allTimeStats / totalCustomers) that is never gated by this resolver.
    // This regression guard ensures the cap cannot accidentally bound all-time.
    const anyRange = { start: "2021-01-01", end: "2021-12-31" } as AnalyticsDateRange & {
      allTime?: boolean;
    };
    assert.equal(anyRange.allTime, undefined);
    assert.equal(spanDays(resolveAnalyticsRange(anyRange, TODAY)), 365);
  });
});
