import { PRICE_PLACEHOLDER } from "./site";

export function formatInr(value: number | null | undefined) {
  if (value == null) return PRICE_PLACEHOLDER;
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(value);
}

export function discountPercent(mrp: number | null, selling: number | null) {
  if (mrp == null || selling == null || mrp <= selling) return null;
  return Math.round(((mrp - selling) / mrp) * 100);
}
