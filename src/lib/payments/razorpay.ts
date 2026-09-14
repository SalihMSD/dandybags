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

const RAZORPAY_API_BASE = "https://api.razorpay.com/v1";

export type RazorpayRefundStatus = "pending" | "processed" | "failed";

export interface RazorpayRefundResponse {
  id: string;
  status: RazorpayRefundStatus;
  amount: number;
  currency: string;
  payment_id: string;
}

export async function refundPayment(input: {
  razorpayPaymentId: string;
  amountPaise: number;
  idempotencyKey: string;
}): Promise<RazorpayRefundResponse> {
  if (!Number.isInteger(input.amountPaise) || input.amountPaise <= 0) {
    throw new Error("INVALID_AMOUNT");
  }
  if (!input.idempotencyKey || input.idempotencyKey.length < 10) {
    throw new Error("INVALID_IDEMPOTENCY_KEY");
  }
  if (razorpayIsStub()) {
    return {
      id: `refund_stub_${input.razorpayPaymentId}`,
      status: "processed",
      amount: input.amountPaise,
      currency: "INR",
      payment_id: input.razorpayPaymentId,
    };
  }

  const auth = Buffer.from(`${keyId()}:${keySecret()}`).toString("base64");
  const body = JSON.stringify({ amount: input.amountPaise });
  const response = await fetch(
    `${RAZORPAY_API_BASE}/payments/${input.razorpayPaymentId}/refund`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Basic ${auth}`,
        "X-Refund-Idempotency": input.idempotencyKey,
      },
      body,
    },
  );

  if (!response.ok) {
    const errorBody = await parseErrorResponse(response);
    throw new Error(`Razorpay API error: ${errorBody}`);
  }

  const data = (await response.json()) as {
    id?: string;
    status?: string;
    amount?: number;
    currency?: string;
    payment_id?: string;
  };

  const status = normalizeRefundStatus(data.status);
  if (!status) {
    throw new Error(`Unexpected Razorpay refund status: ${data.status}`);
  }

  return {
    id: String(data.id),
    status,
    amount: Number(data.amount ?? 0),
    currency: String(data.currency ?? "INR"),
    payment_id: String(data.payment_id ?? input.razorpayPaymentId),
  };
}

export async function fetchPaymentAmount(input: {
  razorpayPaymentId: string;
}): Promise<{ amount: number; currency: string; captured: boolean } | null> {
  if (razorpayIsStub()) {
    return { amount: 0, currency: "INR", captured: true };
  }
  try {
    const payment = await client().payments.fetch(input.razorpayPaymentId);
    return {
      amount: Number(payment.amount),
      currency: String(payment.currency || "INR"),
      captured: Boolean(payment.captured),
    };
  } catch {
    return null;
  }
}

export async function fetchRazorpayRefund(refundId: string): Promise<RazorpayRefundResponse | null> {
  if (razorpayIsStub()) {
    return null;
  }
  const auth = Buffer.from(`${keyId()}:${keySecret()}`).toString("base64");
  try {
    const response = await fetch(
      `${RAZORPAY_API_BASE}/refunds/${refundId}`,
      {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Basic ${auth}`,
        },
      },
    );
    if (!response.ok) return null;
    const data = (await response.json()) as {
      id?: string;
      status?: string;
      amount?: number;
      currency?: string;
      payment_id?: string;
    };
    const status = normalizeRefundStatus(data.status);
    if (!status) return null;
    return {
      id: String(data.id),
      status,
      amount: Number(data.amount ?? 0),
      currency: String(data.currency ?? "INR"),
      payment_id: String(data.payment_id ?? ""),
    };
  } catch {
    return null;
  }
}

function normalizeRefundStatus(status: string | undefined): RazorpayRefundStatus | null {
  if (!status) return null;
  const lower = status.toLowerCase();
  if (lower === "pending") return "pending";
  if (lower === "processed") return "processed";
  if (lower === "failed") return "failed";
  return null;
}

async function parseErrorResponse(response: Response): Promise<string> {
  try {
    const data = await response.json();
    return data?.error?.description || data?.error || JSON.stringify(data);
  } catch {
    return `HTTP ${response.status}`;
  }
}
