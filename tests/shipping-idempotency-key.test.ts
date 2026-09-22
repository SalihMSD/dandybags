import { describe, it } from "node:test";
import assert from "node:assert/strict";

describe("idempotency token caching logic", () => {
  const cache: { token: string | null; expiresAt: number } = { token: null, expiresAt: 0 };
  let tokenFetchCount = 0;

  function fetchToken(): string {
    tokenFetchCount++;
    const token = `token_${tokenFetchCount}`;
    cache.token = token;
    cache.expiresAt = Date.now() + 3600_000;
    return token;
  }

  function getValidToken(): string {
    const now = Date.now();
    if (cache.token && cache.expiresAt > now + 300_000) {
      return cache.token;
    }
    return fetchToken();
  }

  beforeEachSync();

  function beforeEachSync() {
    cache.token = null;
    cache.expiresAt = 0;
    tokenFetchCount = 0;
  }

  it("T1: caches token within validity window", () => {
    beforeEachSync();
    const token1 = getValidToken();
    const token2 = getValidToken();

    assert.equal(token1, token2);
    assert.equal(tokenFetchCount, 1);
  });

  it("T2: refreshes token when near expiry (within 5 min buffer)", () => {
    beforeEachSync();
    cache.token = "old_token";
    cache.expiresAt = Date.now() + 200_000;
    tokenFetchCount = 0;

    const token = getValidToken();

    assert.equal(token, "token_1");
    assert.equal(tokenFetchCount, 1);
  });

  it("T3: refreshes token when expired", () => {
    beforeEachSync();
    cache.token = "old_token";
    cache.expiresAt = Date.now() - 1000;
    tokenFetchCount = 0;

    const token = getValidToken();

    assert.equal(token, "token_1");
    assert.equal(tokenFetchCount, 1);
  });

  it("T4: does not refresh when token has plenty of validity", () => {
    beforeEachSync();
    cache.token = "cached_token";
    cache.expiresAt = Date.now() + 3500_000;
    tokenFetchCount = 0;

    const token = getValidToken();

    assert.equal(token, "cached_token");
    assert.equal(tokenFetchCount, 0);
  });

  it("T5: token count increments on each refresh", () => {
    beforeEachSync();
    getValidToken();
    getValidToken();

    assert.equal(tokenFetchCount, 1);

    cache.expiresAt = Date.now() - 1;

    getValidToken();

    assert.equal(tokenFetchCount, 2);
  });
});
