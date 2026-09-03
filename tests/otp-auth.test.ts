import { describe, it, beforeEach, afterEach } from "node:test";
import assert from "node:assert/strict";

import {
  verifyOtpAndLogin,
  setVerifyFirebaseIdTokenOverride,
  setFindCustomerByEmailOrPhoneOverride,
  setCreateCustomerOverride,
  setTouchLastLoginOverride,
  setMergeGuestCartOverride,
  setCreateSessionOverride,
  setPrismaUserUpdateOverride,
} from "../src/lib/auth/otp-auth";

const mockDecoded = (phoneNumber?: string) => ({ phone_number: phoneNumber });

describe("verifyOtpAndLogin — Firebase ID token", () => {
  beforeEach(() => {
    setVerifyFirebaseIdTokenOverride(async () => mockDecoded("+919876543210"));
    setFindCustomerByEmailOrPhoneOverride(async () => null);
    setCreateCustomerOverride(async (data) => data as never);
    setTouchLastLoginOverride(async () => {});
    setMergeGuestCartOverride(async () => {});
    setCreateSessionOverride(async () => {});
    setPrismaUserUpdateOverride(async () => ({}));
  });

  afterEach(() => {
    setVerifyFirebaseIdTokenOverride(null);
    setFindCustomerByEmailOrPhoneOverride(null);
    setCreateCustomerOverride(null);
    setTouchLastLoginOverride(null);
    setMergeGuestCartOverride(null);
    setCreateSessionOverride(null);
    setPrismaUserUpdateOverride(null);
  });

  it("rejects invalid Firebase token", async () => {
    setVerifyFirebaseIdTokenOverride(async () => {
      throw new Error("invalid");
    });
    const result = await verifyOtpAndLogin("bad-token");
    assert.equal(result.ok, false);
    assert.equal(result.error, "Invalid OTP or phone number.");
  });

  it("rejects Firebase token with missing phone_number", async () => {
    setVerifyFirebaseIdTokenOverride(async () => mockDecoded(undefined));
    const result = await verifyOtpAndLogin("token");
    assert.equal(result.ok, false);
    assert.equal(result.error, "Invalid OTP or phone number.");
  });

  it("normalizes verified phone number", async () => {
    let captured = "";
    setFindCustomerByEmailOrPhoneOverride(async (_email, phone) => {
      captured = phone;
      return null;
    });
    setCreateCustomerOverride(async (data) => {
      captured = (data as { phone: string }).phone;
      return {
        id: "usr_new",
        fullName: "",
        email: (data as { email: string }).email,
        phone: (data as { phone: string }).phone,
        role: "CUSTOMER",
        status: "ACTIVE",
      } as never;
    });

    setVerifyFirebaseIdTokenOverride(async () => mockDecoded("+919876543210"));
    const result = await verifyOtpAndLogin("token");
    assert.equal(result.ok, true);
    assert.equal(captured, "9876543210");
  });

  it("rejects invalid phone format from Firebase token", async () => {
    setVerifyFirebaseIdTokenOverride(async () => mockDecoded("+911234"));
    const result = await verifyOtpAndLogin("token");
    assert.equal(result.ok, false);
    assert.equal(result.error, "Invalid OTP or phone number.");
  });

  it("rejects ADMIN user found by phone", async () => {
    setFindCustomerByEmailOrPhoneOverride(async () => ({
      id: "usr_admin",
      fullName: "Admin",
      email: "admin@test.com",
      phone: "9876543210",
      role: "ADMIN",
      status: "ACTIVE",
      emailVerified: true,
    }));
    const result = await verifyOtpAndLogin("token");
    assert.equal(result.ok, false);
    assert.equal(result.error, "Invalid OTP or phone number.");
  });

  it("rejects DISABLED customer found by phone", async () => {
    setFindCustomerByEmailOrPhoneOverride(async () => ({
      id: "usr_disabled",
      fullName: "Disabled",
      email: "disabled@test.com",
      phone: "9876543210",
      role: "CUSTOMER",
      status: "DISABLED",
      emailVerified: true,
    }));
    const result = await verifyOtpAndLogin("token");
    assert.equal(result.ok, false);
    assert.equal(result.error, "Invalid OTP or phone number.");
  });

  it("creates session for existing ACTIVE CUSTOMER", async () => {
    const user = {
      id: "usr_existing",
      fullName: "Existing",
      email: "existing@test.com",
      phone: "9876543210",
      role: "CUSTOMER" as const,
      status: "ACTIVE" as const,
      emailVerified: true,
    };
    setFindCustomerByEmailOrPhoneOverride(async () => user);
    let sessionCreated = false;
    setCreateSessionOverride(async (userId, role) => {
      sessionCreated = true;
      assert.equal(userId, "usr_existing");
      assert.equal(role, "CUSTOMER");
    });

    const result = await verifyOtpAndLogin("token");
    assert.equal(result.ok, true);
    assert.equal(result.user?.id, "usr_existing");
    assert.equal(sessionCreated, true);
  });

  it("creates new customer when phone not found", async () => {
    let createdData: unknown = null;
    setCreateCustomerOverride(async (data) => {
      createdData = data;
      return {
        id: "usr_new",
        fullName: "",
        email: (data as { email: string }).email,
        phone: (data as { phone: string }).phone,
        role: "CUSTOMER",
        status: "ACTIVE",
        emailVerified: false,
      } as never;
    });

    const result = await verifyOtpAndLogin("token");
    assert.equal(result.ok, true);
    assert.equal(result.user?.id, "usr_new");
    assert.equal(result.user?.role, "CUSTOMER");
    assert.equal((createdData as { phone: string }).phone, "9876543210");
    assert.ok((createdData as { email: string }).email.endsWith("@customer.dandy.local"));
  });

  it("returns generic error when customer creation fails with duplicate phone", async () => {
    setCreateCustomerOverride(async () => {
      const err = new Error("P2002: duplicate") as Error & { code?: string };
      err.code = "P2002";
      throw err;
    });

    const result = await verifyOtpAndLogin("token");
    assert.equal(result.ok, false);
    assert.equal(result.error, "Invalid OTP or phone number.");
  });

  it("returns generic error when customer creation fails with unexpected error", async () => {
    setCreateCustomerOverride(async () => {
      throw new Error("db down");
    });

    const result = await verifyOtpAndLogin("token");
    assert.equal(result.ok, false);
    assert.equal(result.error, "Something went wrong. Please try again.");
  });

  it("merges guest cart for existing customer", async () => {
    const guestCart = [{ sku: "SKU1", qty: 2 }];
    let mergedCart: unknown = undefined;
    setMergeGuestCartOverride(async (_userId, cart) => {
      mergedCart = cart;
    });

    setFindCustomerByEmailOrPhoneOverride(async () => ({
      id: "usr_existing",
      fullName: "Existing",
      email: "existing@test.com",
      phone: "9876543210",
      role: "CUSTOMER" as const,
      status: "ACTIVE" as const,
      emailVerified: true,
    }));

    const result = await verifyOtpAndLogin("token", guestCart);
    assert.equal(result.ok, true);
    assert.deepEqual(mergedCart, guestCart);
  });

  it("merges guest cart for new customer", async () => {
    const guestCart = [{ sku: "SKU2", qty: 1 }];
    let mergedCart: unknown = undefined;
    setMergeGuestCartOverride(async (_userId, cart) => {
      mergedCart = cart;
    });

    setCreateCustomerOverride(async (data) => ({
      id: "usr_new",
      fullName: "",
      email: (data as { email: string }).email,
      phone: (data as { phone: string }).phone,
      role: "CUSTOMER" as const,
      status: "ACTIVE" as const,
      emailVerified: false,
    } as never));

    const result = await verifyOtpAndLogin("token", guestCart);
    assert.equal(result.ok, true);
    assert.deepEqual(mergedCart, guestCart);
  });

  it("never returns Firebase token or internal details", async () => {
    const result = await verifyOtpAndLogin("token");
    const serialized = JSON.stringify(result);
    assert.ok(!serialized.includes("token"));
    assert.ok(!serialized.includes("firebase"));
  });
});
