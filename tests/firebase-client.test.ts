import { describe, it, beforeEach, afterEach } from "node:test";
import assert from "node:assert/strict";

const mockFirebaseApp = { name: "[DEFAULT]" };
const mockAuthInstance = { currentUser: null };
const mockConfirmationResult = { confirm: async (_code: string) => ({ user: { phoneNumber: "+919876543210" } }) };

let signInWithPhoneNumberImpl: unknown;
let recaptchaVerifierInstance: { render: () => number };

beforeEach(() => {
  signInWithPhoneNumberImpl = async () => mockConfirmationResult;
  recaptchaVerifierInstance = { render: () => 0 };

  (globalThis as Record<string, unknown>).window = {
    document: { body: { appendChild: () => {} } },
    grecaptcha: { render: () => 0, execute: async () => "token" },
  };
});

afterEach(() => {
  delete (globalThis as Record<string, unknown>).window;
});

describe("Firebase client module", () => {
  it("exports getFirebaseAuth, createRecaptchaVerifier, and sendPhoneOtp", async () => {
    const mod = await import("../src/lib/firebase/client");
    assert.equal(typeof mod.getFirebaseAuth, "function");
    assert.equal(typeof mod.createRecaptchaVerifier, "function");
    assert.equal(typeof mod.sendPhoneOtp, "function");
  });
});
