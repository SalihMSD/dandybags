export type WeightParseResult =
  | { ok: true; grams: number }
  | { ok: false; error: string };

export type DimensionParseResult =
  | { ok: true; centimeters: number }
  | { ok: false; error: string };

const WEIGHT_PATTERN = /^\s*(\d+(?:\.\d+)?)\s*(g|kg)\s*$/i;
const DIMENSION_PATTERN = /^\s*(\d+(?:\.\d+)?)\s*(cm|m)\s*$/i;

export function parseWeightGrams(value: string | null | undefined): WeightParseResult {
  if (!value || typeof value !== "string") {
    return { ok: false, error: "Weight value is missing or not a string" };
  }

  const trimmed = value.trim();
  if (!trimmed) {
    return { ok: false, error: "Weight value is empty" };
  }

  const match = trimmed.match(WEIGHT_PATTERN);
  if (!match) {
    return { ok: false, error: `Unrecognized weight format: "${value}"` };
  }

  const num = parseFloat(match[1]);
  const unit = match[2].toLowerCase();

  if (Number.isNaN(num) || num <= 0 || !Number.isFinite(num)) {
    return { ok: false, error: `Invalid weight number: "${value}"` };
  }

  if (unit === "kg") {
    const grams = Math.round(num * 1000);
    if (!Number.isInteger(grams) || grams <= 0) {
      return { ok: false, error: `Invalid weight value after conversion: "${value}"` };
    }
    return { ok: true, grams };
  }

  return { ok: true, grams: num };
}

export function parseDimensionCm(value: string | null | undefined): DimensionParseResult {
  if (!value || typeof value !== "string") {
    return { ok: false, error: "Dimension value is missing or not a string" };
  }

  const trimmed = value.trim();
  if (!trimmed) {
    return { ok: false, error: "Dimension value is empty" };
  }

  const match = trimmed.match(DIMENSION_PATTERN);
  if (!match) {
    return { ok: false, error: `Unrecognized dimension format: "${value}"` };
  }

  const num = parseFloat(match[1]);
  const unit = match[2].toLowerCase();

  if (Number.isNaN(num) || num <= 0 || !Number.isFinite(num)) {
    return { ok: false, error: `Invalid dimension number: "${value}"` };
  }

  if (unit === "m") {
    const cm = Math.round(num * 100);
    if (!Number.isInteger(cm) || cm <= 0) {
      return { ok: false, error: `Invalid dimension value after conversion: "${value}"` };
    }
    return { ok: true, centimeters: cm };
  }

  if (!Number.isInteger(num) && !Number.isInteger(num * 10)) {
    return { ok: false, error: `Dimension must have at most 1 decimal place: "${value}"` };
  }

  return { ok: true, centimeters: num };
}

export type ProductMeasurements = {
  weightGrams: number;
  lengthCm: number;
  widthCm: number;
  heightCm: number;
};

export type ParseProductMeasurementsResult =
  | { ok: true; measurements: ProductMeasurements }
  | { ok: false; errors: string[] };

export function parseProductMeasurements(
  weight: string | null | undefined,
  length: string | null | undefined,
  width: string | null | undefined,
  height: string | null | undefined,
): ParseProductMeasurementsResult {
  const errors: string[] = [];

  const w = parseWeightGrams(weight);
  const l = parseDimensionCm(length);
  const wd = parseDimensionCm(width);
  const h = parseDimensionCm(height);

  if (!w.ok) {
    errors.push(`weight: ${w.error}`);
  }
  if (!l.ok) {
    errors.push(`length: ${l.error}`);
  }
  if (!wd.ok) {
    errors.push(`width: ${wd.error}`);
  }
  if (!h.ok) {
    errors.push(`height: ${h.error}`);
  }

  if (errors.length > 0) {
    return { ok: false, errors };
  }

  return {
    ok: true,
    measurements: {
      weightGrams: (w as { grams: number }).grams,
      lengthCm: (l as { centimeters: number }).centimeters,
      widthCm: (wd as { centimeters: number }).centimeters,
      heightCm: (h as { centimeters: number }).centimeters,
    },
  };
}
