import { describe, it, beforeEach, afterEach } from "node:test";
import assert from "node:assert/strict";

const originalEnv = process.env;

describe("Firebase Admin module", () => {
  beforeEach(() => {
    process.env.FIREBASE_PROJECT_ID = "test-project";
    process.env.FIREBASE_CLIENT_EMAIL = "test@test-project.iam.gserviceaccount.com";
    process.env.FIREBASE_PRIVATE_KEY =
      "-----BEGIN PRIVATE KEY-----\nMIIEvgIBADANBgkqhkiG9w0BAQEFAASCBKgwggSkAgEAAoIBAQC7VJTUt9Us8cKj\nMzEfYyjiWA4R4/M2bS1+fWIcPkmgEfBFt4KPT5EDg2R0JqMh2C9KJFW0eKz5Y1\n-----END PRIVATE KEY-----\n";
  });

  afterEach(() => {
    process.env = { ...originalEnv };
  });

  it("exports verifyFirebaseIdToken", async () => {
    const mod = await import("../src/lib/firebase/admin");
    assert.equal(typeof mod.verifyFirebaseIdToken, "function");
  });

  it("requiresAdminCredentials returns credentials when env vars are set", async () => {
    const mod = await import("../src/lib/firebase/admin");
    const creds = mod.requireAdminCredentials();
    assert.equal(creds.projectId, "test-project");
    assert.ok(creds.clientEmail.includes("test-project"));
    assert.ok(creds.privateKey.includes("BEGIN PRIVATE KEY"));
  });

  it("requiresAdminCredentials throws when credentials are missing", async () => {
    delete process.env.FIREBASE_PROJECT_ID;
    delete process.env.FIREBASE_CLIENT_EMAIL;
    delete process.env.FIREBASE_PRIVATE_KEY;
    let threw = false;
    try {
      const mod = await import("../src/lib/firebase/admin");
      mod.requireAdminCredentials();
    } catch (e) {
      threw = true;
      assert.ok((e as Error).message.includes("Missing Firebase Admin credentials"));
    }
    assert.equal(threw, true);
  });
});
