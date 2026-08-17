export function rupeesToPaise(rupees: number): number {
  return Math.round(rupees * 100);
}

export function sellingPriceToRupees(value: unknown): number | null {
  if (value == null) return null;
  const rupees = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(rupees) || rupees <= 0) return null;
  return rupees;
}

export type PayableCartItem = {
  qty: number;
  sellingPrice: unknown;
  b2cAvailable: boolean;
};

export type PayableResult =
  | { ok: true; amountPaise: number; amountRupees: number }
  | { ok: false; error: string; status: 400 };

export function calculatePayable(items: PayableCartItem[]): PayableResult {
  if (!items.length) {
    return { ok: false, error: "Your cart is empty.", status: 400 };
  }

  let amountPaise = 0;
  for (const item of items) {
    if (!item.b2cAvailable) {
      return { ok: false, error: "Your cart is empty.", status: 400 };
    }
    if (!Number.isInteger(item.qty) || item.qty < 1) {
      return { ok: false, error: "Your cart is empty.", status: 400 };
    }
    const rupees = sellingPriceToRupees(item.sellingPrice);
    if (rupees == null) {
      return { ok: false, error: "This order cannot be paid yet.", status: 400 };
    }
    amountPaise += rupeesToPaise(rupees) * item.qty;
  }

  if (amountPaise <= 0) {
    return { ok: false, error: "This order cannot be paid yet.", status: 400 };
  }

  return { ok: true, amountPaise, amountRupees: amountPaise / 100 };
}
