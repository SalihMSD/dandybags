import { randomInt } from "crypto";

type OtpRecord = {
  phone: string;
  code: string;
  expiresAt: number;
  verified: boolean;
};

const store = new Map<string, OtpRecord>();
const rateLimit = new Map<string, number[]>();

const OTP_TTL_MS = 5 * 60 * 1000;
const RATE_LIMIT_WINDOW_MS = 15 * 60 * 1000;
const RATE_LIMIT_MAX = 3;

export function generateTrackingId(): string {
  return `trk_${Math.random().toString(36).slice(2)}${Date.now().toString(36)}`;
}

export function requestOtp(phone: string): { ok: true; trackingId: string; expiresAt: number } | { ok: false; error: string } {
  const normalized = phone.replace(/\D/g, "").slice(-10);
  if (normalized.length !== 10) {
    return { ok: false as const, error: "Enter a valid 10-digit mobile number." };
  }

  const now = Date.now();
  const attempts = rateLimit.get(normalized) || [];
  const recent = attempts.filter((t) => now - t < RATE_LIMIT_WINDOW_MS);
  if (recent.length >= RATE_LIMIT_MAX) {
    return { ok: false as const, error: "Too many OTP requests. Please try again later." };
  }
  recent.push(now);
  rateLimit.set(normalized, recent);

  cleanup();
  const trackingId = generateTrackingId();
  const code = randomInt(100000, 1000000).toString();
  store.set(trackingId, {
    phone: normalized,
    code,
    expiresAt: now + OTP_TTL_MS,
    verified: false,
  });

  return { ok: true as const, trackingId, expiresAt: now + OTP_TTL_MS };
}

export function verifyOtp(trackingId: string, code: string): { ok: true; phone: string } | { ok: false; error: string } {
  cleanup();
  const record = store.get(trackingId);
  if (!record) {
    return { ok: false as const, error: "Invalid or expired tracking session." };
  }
  if (record.expiresAt < Date.now()) {
    store.delete(trackingId);
    return { ok: false as const, error: "OTP has expired. Please request a new one." };
  }
  if (record.code !== code) {
    return { ok: false as const, error: "Invalid OTP. Please try again." };
  }
  record.verified = true;
  record.code = "";
  return { ok: true as const, phone: record.phone };
}

export function isTrackingVerified(trackingId: string): boolean {
  cleanup();
  const record = store.get(trackingId);
  if (!record) return false;
  if (record.expiresAt < Date.now()) {
    store.delete(trackingId);
    return false;
  }
  return record.verified;
}

export function getVerifiedPhone(trackingId: string): string | null {
  cleanup();
  const record = store.get(trackingId);
  if (!record || !record.verified) return null;
  if (record.expiresAt < Date.now()) {
    store.delete(trackingId);
    return null;
  }
  return record.phone;
}

function cleanup() {
  const now = Date.now();
  for (const [key, record] of store) {
    if (record.expiresAt < now) store.delete(key);
  }
}
