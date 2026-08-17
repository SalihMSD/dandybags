import { createHmac, timingSafeEqual } from "crypto";
import Razorpay from "razorpay";

function keyId() {
  return (process.env.RAZORPAY_KEY_ID || "").trim();
}

function keySecret() {
  return (process.env.RAZORPAY_KEY_SECRET || "").trim();
}

const STUB_KEY_ID = "rzp_test_stub";

export function razorpayIsStub() {
  return keyId() === STUB_KEY_ID && process.env.NODE_ENV !== "production";
}

export function razorpayConfigured() {
  const id = keyId();
  const secret = keySecret();
  if (!id || !secret) return false;
  if (id === STUB_KEY_ID) return process.env.NODE_ENV !== "production";
  return true;
}

export function getRazorpayKeyId() {
  if (!razorpayConfigured()) {
    throw new Error("RAZORPAY_NOT_CONFIGURED");
  }
  return keyId();
}

function client() {
  if (!razorpayConfigured()) {
    throw new Error("RAZORPAY_NOT_CONFIGURED");
  }
  return new Razorpay({
    key_id: keyId(),
    key_secret: keySecret(),
  });
}

export async function createRazorpayTestOrder(input: { amountPaise: number; receipt: string }) {
  if (!Number.isInteger(input.amountPaise) || input.amountPaise <= 0) {
    throw new Error("INVALID_AMOUNT");
  }
  if (razorpayIsStub()) {
    const receipt = input.receipt.replace(/[^A-Za-z0-9]/g, "").slice(0, 14);
    return {
      id: `order_stub_${receipt || "dandy"}`,
      amount: input.amountPaise,
      currency: "INR",
    };
  }
  const order = await client().orders.create({
    amount: input.amountPaise,
    currency: "INR",
    receipt: input.receipt.slice(0, 40),
  });
  return {
    id: String(order.id),
    amount: Number(order.amount),
    currency: String(order.currency || "INR"),
  };
}

export function verifyRazorpaySignature(input: {
  razorpayOrderId: string;
  razorpayPaymentId: string;
  razorpaySignature: string;
}) {
  const secret = keySecret();
  if (!secret) return false;
  const payload = `${input.razorpayOrderId}|${input.razorpayPaymentId}`;
  const expected = createHmac("sha256", secret).update(payload).digest("hex");
  const a = Buffer.from(expected);
  const b = Buffer.from(String(input.razorpaySignature || ""));
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}
