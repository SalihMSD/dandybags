import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { parseWeightGrams, parseDimensionCm, parseProductMeasurements } from "@/lib/shipping/measurements";
import { SPEC_PLACEHOLDER } from "@/lib/site";

describe("parseWeightGrams", () => {
  it("W1: parses grams value correctly", () => {
    const result = parseWeightGrams("500g");
    assert.equal(result.ok, true);
    if (result.ok) {
      assert.equal(result.grams, 500);
    }
  });

  it("W2: parses kilograms to grams", () => {
    const result = parseWeightGrams("1.5kg");
    assert.equal(result.ok, true);
    if (result.ok) {
      assert.equal(result.grams, 1500);
    }
  });

  it("W3: parses large kg value", () => {
    const result = parseWeightGrams("10kg");
    assert.equal(result.ok, true);
    if (result.ok) {
      assert.equal(result.grams, 10000);
    }
  });

  it("W4: handles whitespace around value", () => {
    const result = parseWeightGrams("  250g  ");
    assert.equal(result.ok, true);
    if (result.ok) {
      assert.equal(result.grams, 250);
    }
  });

  it("W5: returns error for null/undefined", () => {
    assert.equal(parseWeightGrams(null).ok, false);
    assert.equal(parseWeightGrams(undefined).ok, false);
  });

  it("W6: returns error for empty string", () => {
    assert.equal(parseWeightGrams("").ok, false);
    assert.equal(parseWeightGrams("   ").ok, false);
  });

  it("W7: returns error for unrecognized format", () => {
    const result = parseWeightGrams("500");
    assert.equal(result.ok, false);
  });

  it("W8: returns error for negative/zero weight", () => {
    assert.equal(parseWeightGrams("0g").ok, false);
    assert.equal(parseWeightGrams("-100g").ok, false);
  });

  it("W9: returns error for SPEC_PLACEHOLDER", () => {
    const result = parseWeightGrams(SPEC_PLACEHOLDER);
    assert.equal(result.ok, false);
  });

  it("W10: case-insensitive unit parsing", () => {
    const result = parseWeightGrams("1.5KG");
    assert.equal(result.ok, true);
    if (result.ok) {
      assert.equal(result.grams, 1500);
    }
  });
});

describe("parseDimensionCm", () => {
  it("D1: parses cm value correctly", () => {
    const result = parseDimensionCm("30cm");
    assert.equal(result.ok, true);
    if (result.ok) {
      assert.equal(result.centimeters, 30);
    }
  });

  it("D2: parses m to cm", () => {
    const result = parseDimensionCm("1.5m");
    assert.equal(result.ok, true);
    if (result.ok) {
      assert.equal(result.centimeters, 150);
    }
  });

  it("D3: parses large m value", () => {
    const result = parseDimensionCm("2m");
    assert.equal(result.ok, true);
    if (result.ok) {
      assert.equal(result.centimeters, 200);
    }
  });

  it("D4: handles decimal cm with one decimal place", () => {
    const result = parseDimensionCm("30.5cm");
    assert.equal(result.ok, true);
    if (result.ok) {
      assert.equal(result.centimeters, 30.5);
    }
  });

  it("D5: returns error for null/undefined", () => {
    assert.equal(parseDimensionCm(null).ok, false);
    assert.equal(parseDimensionCm(undefined).ok, false);
  });

  it("D6: returns error for empty string", () => {
    assert.equal(parseDimensionCm("").ok, false);
  });

  it("D7: returns error for unrecognized format", () => {
    assert.equal(parseDimensionCm("30").ok, false);
  });

  it("D8: returns error for negative/zero dimension", () => {
    assert.equal(parseDimensionCm("0cm").ok, false);
    assert.equal(parseDimensionCm("-10cm").ok, false);
  });

  it("D9: returns error for SPEC_PLACEHOLDER", () => {
    const result = parseDimensionCm(SPEC_PLACEHOLDER);
    assert.equal(result.ok, false);
  });

  it("D10: returns error for more than 1 decimal place", () => {
    const result = parseDimensionCm("30.55cm");
    assert.equal(result.ok, false);
  });
});

describe("parseProductMeasurements", () => {
  it("PM1: parses all valid measurements", () => {
    const result = parseProductMeasurements("500g", "30cm", "20cm", "10cm");
    assert.equal(result.ok, true);
    if (result.ok) {
      assert.deepEqual(result.measurements, {
        weightGrams: 500,
        lengthCm: 30,
        widthCm: 20,
        heightCm: 10,
      });
    }
  });

  it("PM2: parses mixed units correctly", () => {
    const result = parseProductMeasurements("1.5kg", "1.5m", "50cm", "25cm");
    assert.equal(result.ok, true);
    if (result.ok) {
      assert.deepEqual(result.measurements, {
        weightGrams: 1500,
        lengthCm: 150,
        widthCm: 50,
        heightCm: 25,
      });
    }
  });

  it("PM3: returns all errors when all measurements are invalid", () => {
    const result = parseProductMeasurements(
      SPEC_PLACEHOLDER,
      SPEC_PLACEHOLDER,
      SPEC_PLACEHOLDER,
      SPEC_PLACEHOLDER,
    );
    assert.equal(result.ok, false);
    if (!result.ok) {
      assert.equal(result.errors.length, 4);
      assert.ok(result.errors[0].includes("weight"));
      assert.ok(result.errors[1].includes("length"));
      assert.ok(result.errors[2].includes("width"));
      assert.ok(result.errors[3].includes("height"));
    }
  });

  it("PM4: returns empty errors array on success", () => {
    const result = parseProductMeasurements("500g", "30cm", "20cm", "10cm");
    assert.equal(result.ok, true);
  });

  it("PM5: handles null values", () => {
    const result = parseProductMeasurements(null, null, null, null);
    assert.equal(result.ok, false);
    if (!result.ok) {
      assert.equal(result.errors.length, 4);
    }
  });

  it("PM6: handles undefined values", () => {
    const result = parseProductMeasurements(undefined, undefined, undefined, undefined);
    assert.equal(result.ok, false);
    if (!result.ok) {
      assert.equal(result.errors.length, 4);
    }
  });

  it("PM7: only weight error is returned when only weight is invalid", () => {
    const result = parseProductMeasurements(SPEC_PLACEHOLDER, "30cm", "20cm", "10cm");
    assert.equal(result.ok, false);
    if (!result.ok) {
      assert.equal(result.errors.length, 1);
      assert.ok(result.errors[0].includes("weight"));
    }
  });

  it("PM8: whitespace-only values treated as empty", () => {
    const result = parseProductMeasurements("   ", "30cm", "20cm", "10cm");
    assert.equal(result.ok, false);
    if (!result.ok) {
      assert.ok(result.errors.find((e) => e.includes("weight")));
    }
  });
});
