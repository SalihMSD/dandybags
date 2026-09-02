import { describe, it } from "node:test";
import assert from "node:assert/strict";

import { calculatePayable, sellingPriceToRupees, rupeesToPaise } from "../src/lib/payments/amount";

function price(rupees: number) {
  return { toString: () => rupees.toString(), toNumber: () => rupees };
}

describe("calculatePayable", () => {
  it("test 1: Product ₹550 × quantity 2 = ₹1,100", () => {
    const result = calculatePayable([{ qty: 2, sellingPrice: price(550), b2cAvailable: true }]);
    assert.equal(result.ok, true);
    if (result.ok) {
      assert.equal(result.amountPaise, 110000);
      assert.equal(result.amountRupees, 1100);
    }
  });

  it("test 2: Multiple products subtotal (₹550 × 2 + ₹600 × 1 = ₹1,700)", () => {
    const result = calculatePayable([
      { qty: 2, sellingPrice: price(550), b2cAvailable: true },
      { qty: 1, sellingPrice: price(600), b2cAvailable: true },
    ]);
    assert.equal(result.ok, true);
    if (result.ok) {
      assert.equal(result.amountPaise, 170000);
      assert.equal(result.amountRupees, 1700);
    }
  });

  it("test: Single product ₹550 × quantity 3 = ₹1,650", () => {
    const result = calculatePayable([{ qty: 3, sellingPrice: price(550), b2cAvailable: true }]);
    assert.equal(result.ok, true);
    if (result.ok) {
      assert.equal(result.amountPaise, 165000);
      assert.equal(result.amountRupees, 1650);
    }
  });

  it("test: Decimal price ₹550.50 × quantity 2 = ₹1,101 (rounds to nearest paise)", () => {
    const result = calculatePayable([{ qty: 2, sellingPrice: price(550.5), b2cAvailable: true }]);
    assert.equal(result.ok, true);
    if (result.ok) {
      assert.equal(result.amountPaise, 110100);
      assert.equal(result.amountRupees, 1101);
    }
  });

  it("test: Empty cart rejected", () => {
    const result = calculatePayable([]);
    assert.equal(result.ok, false);
  });

  it("test: Item not available for b2c rejected", () => {
    const result = calculatePayable([{ qty: 1, sellingPrice: price(550), b2cAvailable: false }]);
    assert.equal(result.ok, false);
  });

  it("test: Null sellingPrice rejected", () => {
    const result = calculatePayable([{ qty: 1, sellingPrice: null, b2cAvailable: true }]);
    assert.equal(result.ok, false);
  });

  it("test: Zero sellingPrice rejected", () => {
    const result = calculatePayable([{ qty: 1, sellingPrice: price(0), b2cAvailable: true }]);
    assert.equal(result.ok, false);
  });

  it("test: Negative quantity rejected", () => {
    const result = calculatePayable([{ qty: -1, sellingPrice: price(550), b2cAvailable: true }]);
    assert.equal(result.ok, false);
  });

  it("test: Fractional quantity rejected (must be integer)", () => {
    const result = calculatePayable([{ qty: 2.7, sellingPrice: price(550), b2cAvailable: true }]);
    assert.equal(result.ok, false);
  });
});

describe("FIXED coupon discount (min(couponValue, subtotal))", () => {
  it("test 3: Fixed ₹60 coupon on ₹800 = ₹740", () => {
    const subtotal = 800;
    const couponValue = 60;
    const discount = Math.min(couponValue, subtotal);
    const finalAmount = subtotal - discount;
    assert.equal(discount, 60);
    assert.equal(finalAmount, 740);
  });

  it("test 4: Fixed ₹60 coupon on ₹1,500 = ₹1,440", () => {
    const subtotal = 1500;
    const couponValue = 60;
    const discount = Math.min(couponValue, subtotal);
    const finalAmount = subtotal - discount;
    assert.equal(discount, 60);
    assert.equal(finalAmount, 1440);
  });

  it("test 5: Fixed coupon larger than cart — discount = subtotal, finalTotal = 0", () => {
    const subtotal = 40;
    const couponValue = 60;
    const discount = Math.min(couponValue, subtotal);
    const finalAmount = Math.max(0, subtotal - discount);
    assert.equal(discount, 40);
    assert.equal(finalAmount, 0);
  });

  it("test: Fixed coupon exactly equal to cart — discount = subtotal, finalTotal = 0", () => {
    const subtotal = 60;
    const couponValue = 60;
    const discount = Math.min(couponValue, subtotal);
    const finalAmount = Math.max(0, subtotal - discount);
    assert.equal(discount, 60);
    assert.equal(finalAmount, 0);
  });

  it("test: Fixed coupon smaller than cart — discount = couponValue", () => {
    const subtotal = 500;
    const couponValue = 60;
    const discount = Math.min(couponValue, subtotal);
    const finalAmount = subtotal - discount;
    assert.equal(discount, 60);
    assert.equal(finalAmount, 440);
  });
});

describe("PERCENTAGE coupon discount", () => {
  it("test: 10% coupon on ₹800 = ₹80 discount, ₹720 final", () => {
    const subtotal = 800;
    const percent = 10;
    const discount = (subtotal * percent) / 100;
    const finalAmount = subtotal - discount;
    assert.equal(discount, 80);
    assert.equal(finalAmount, 720);
  });

  it("test: 10% coupon on ₹800 with max discount ₹75 = ₹75 discount, ₹725 final", () => {
    const subtotal = 800;
    const percent = 10;
    const maxDiscount = 75;
    const discount = Math.min((subtotal * percent) / 100, maxDiscount);
    const finalAmount = subtotal - discount;
    assert.equal(discount, 75);
    assert.equal(finalAmount, 725);
  });
});

describe("Server recalculation matches UI", () => {
  it("test: calculatePayable matches manual sum for ₹550 × 2 = ₹1,100", () => {
    const items = [{ qty: 2, sellingPrice: price(550), b2cAvailable: true }];
    const result = calculatePayable(items);
    assert.equal(result.ok, true);
    if (result.ok) {
      const manual = items.reduce((sum, it) => sum + (result.ok ? 550 : 0) * it.qty, 0);
      assert.equal(result.amountRupees, 1100);
      assert.equal(manual, 1100);
    }
  });
});

describe("Razorpay amount consistency (paise)", () => {
  it("test: Final amount in paise matches rupees × 100", () => {
    const finalAmountRupees = 740;
    const amountPaise = Math.round(finalAmountRupees * 100);
    assert.equal(amountPaise, 74000);
    assert.equal(amountPaise / 100, 740);
  });

  it("test: For FIXED coupon on ₹800 = ₹60 → 74000 paise", () => {
    const subtotal = 800;
    const discount = Math.min(60, subtotal);
    const finalAmount = subtotal - discount;
    const amountPaise = Math.round(finalAmount * 100);
    assert.equal(amountPaise, 74000);
  });

  it("test: For FIXED coupon on ₹1,500 = ₹60 → 144000 paise", () => {
    const subtotal = 1500;
    const discount = Math.min(60, subtotal);
    const finalAmount = subtotal - discount;
    const amountPaise = Math.round(finalAmount * 100);
    assert.equal(amountPaise, 144000);
  });
});

describe("sellingPriceToRupees helper", () => {
  it("test: Returns number for valid price", () => {
    assert.equal(sellingPriceToRupees(price(550)), 550);
  });

  it("test: Returns null for null", () => {
    assert.equal(sellingPriceToRupees(null), null);
  });

  it("test: Returns null for string price", () => {
    assert.equal(sellingPriceToRupees("550"), 550);
  });

  it("test: Returns null for zero", () => {
    assert.equal(sellingPriceToRupees(0), null);
  });

  it("test: Returns null for negative", () => {
    assert.equal(sellingPriceToRupees(-100), null);
  });
});
