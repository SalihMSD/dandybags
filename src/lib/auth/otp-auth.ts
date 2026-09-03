import { randomBytes } from "crypto";

import { verifyFirebaseIdToken } from "@/lib/firebase/admin";
import { createSession } from "@/lib/auth/session";
import { isValidPhone, normalizePhone } from "@/lib/auth/validate";
import { hashPassword } from "@/lib/db/password";
import { publicUser, type PublicUser, type UserRecord } from "@/lib/db/store";
import { mergeGuestCart } from "@/lib/db/cart";
import { createCustomer, findCustomerByEmailOrPhone, touchLastLogin } from "@/lib/db/users";
import { prisma } from "@/lib/db/prisma";

type UserLike = Pick<UserRecord, "id" | "fullName" | "email" | "phone" | "role" | "status" | "emailVerified">;

let verifyFirebaseIdTokenOverride: ((idToken: string) => Promise<{ phone_number?: string }>) | null = null;
let findCustomerByEmailOrPhoneOverride: ((email: string, phone: string) => Promise<UserLike | null>) | null = null;
let createCustomerOverride: ((data: {
  fullName: string;
  email: string;
  phone: string;
  passwordHash: string;
}) => Promise<UserLike>) | null = null;
let touchLastLoginOverride: ((userId: string) => Promise<void>) | null = null;
let mergeGuestCartOverride: ((userId: string, guestCart: unknown) => Promise<void>) | null = null;
let createSessionOverride: ((userId: string, role: string) => Promise<void>) | null = null;

export function setVerifyFirebaseIdTokenOverride(
  fn: ((idToken: string) => Promise<{ phone_number?: string }>) | null,
) {
  verifyFirebaseIdTokenOverride = fn;
}

export function setFindCustomerByEmailOrPhoneOverride(
  fn: ((email: string, phone: string) => Promise<UserLike | null>) | null,
) {
  findCustomerByEmailOrPhoneOverride = fn;
}

export function setCreateCustomerOverride(
  fn: ((data: {
    fullName: string;
    email: string;
    phone: string;
    passwordHash: string;
  }) => Promise<UserLike>) | null,
) {
  createCustomerOverride = fn;
}

export function setTouchLastLoginOverride(fn: ((userId: string) => Promise<void>) | null) {
  touchLastLoginOverride = fn;
}

export function setMergeGuestCartOverride(fn: ((userId: string, guestCart: unknown) => Promise<void>) | null) {
  mergeGuestCartOverride = fn;
}

export function setCreateSessionOverride(fn: ((userId: string, role: string) => Promise<void>) | null) {
  createSessionOverride = fn;
}

let prismaUserUpdateOverride: ((args: { where: { id: string }; data: { phoneVerifiedAt: Date } }) => Promise<unknown>) | null = null;

export function setPrismaUserUpdateOverride(
  fn: ((args: { where: { id: string }; data: { phoneVerifiedAt: Date } }) => Promise<unknown>) | null,
) {
  prismaUserUpdateOverride = fn;
}

export interface VerifyOtpResult {
  ok: boolean;
  error?: string;
  user?: PublicUser;
}

export async function verifyOtpAndLogin(
  idToken: string,
  guestCart?: unknown,
): Promise<VerifyOtpResult> {
  let decoded: { phone_number?: string };
  try {
    decoded = verifyFirebaseIdTokenOverride
      ? await verifyFirebaseIdTokenOverride(idToken)
      : await verifyFirebaseIdToken(idToken);
  } catch {
    return { ok: false, error: "Invalid OTP or phone number." };
  }

  const firebasePhone = decoded.phone_number;
  if (!firebasePhone || typeof firebasePhone !== "string") {
    return { ok: false, error: "Invalid OTP or phone number." };
  }

  const normalized = normalizePhone(firebasePhone);
  if (!isValidPhone(normalized)) {
    return { ok: false, error: "Invalid OTP or phone number." };
  }

  const user = await (findCustomerByEmailOrPhoneOverride
    ? findCustomerByEmailOrPhoneOverride("", normalized)
    : findCustomerByEmailOrPhone("", normalized));

  if (user) {
    if (user.role === "ADMIN") {
      return { ok: false, error: "Invalid OTP or phone number." };
    }
    if (user.role !== "CUSTOMER" || user.status !== "ACTIVE") {
      return { ok: false, error: "Invalid OTP or phone number." };
    }

    await (prismaUserUpdateOverride
      ? prismaUserUpdateOverride({ where: { id: user.id }, data: { phoneVerifiedAt: new Date() } })
      : prisma.user.update({
          where: { id: user.id },
          data: { phoneVerifiedAt: new Date() },
        }));

    await (touchLastLoginOverride ? touchLastLoginOverride(user.id) : touchLastLogin(user.id));

    try {
      await (mergeGuestCartOverride
        ? mergeGuestCartOverride(user.id, guestCart)
        : mergeGuestCart(user.id, guestCart));
    } catch {
      /* Existing PostgreSQL cart is unchanged if merge rolls back. */
    }

    await (createSessionOverride ? createSessionOverride(user.id, user.role) : createSession(user.id, user.role));
    return { ok: true, user: publicUser(user) };
  }

  const dummyPassword = await hashPassword(randomBytes(32).toString("hex"));
  const placeholderEmail = `${normalized}@customer.dandy.local`;

  let created: UserLike;
  try {
    created = await (createCustomerOverride
      ? createCustomerOverride({
          fullName: "",
          email: placeholderEmail,
          phone: normalized,
          passwordHash: dummyPassword,
        })
      : createCustomer({
          fullName: "",
          email: placeholderEmail,
          phone: normalized,
          passwordHash: dummyPassword,
        }));

    await (prismaUserUpdateOverride
      ? prismaUserUpdateOverride({ where: { id: created.id }, data: { phoneVerifiedAt: new Date() } })
      : prisma.user.update({
          where: { id: created.id },
          data: { phoneVerifiedAt: new Date() },
        }));
  } catch (error) {
    if (error instanceof Error && error.message.includes("P2002")) {
      return { ok: false, error: "Invalid OTP or phone number." };
    }
    return { ok: false, error: "Something went wrong. Please try again." };
  }

  await (touchLastLoginOverride ? touchLastLoginOverride(created.id) : touchLastLogin(created.id));

  try {
    await (mergeGuestCartOverride
      ? mergeGuestCartOverride(created.id, guestCart)
      : mergeGuestCart(created.id, guestCart));
  } catch {
    /* Existing PostgreSQL cart is unchanged if merge rolls back. */
  }

  await (createSessionOverride ? createSessionOverride(created.id, created.role) : createSession(created.id, created.role));
  return { ok: true, user: publicUser(created) };
}
