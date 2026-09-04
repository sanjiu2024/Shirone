// tests/utils/auth-contract.test.mjs
import { strict as assert } from "node:assert";
import { test } from "node:test";

test("auth module exposes session helpers", async () => {
	const auth = await import("../../src/lib/auth.ts");
	assert.equal(typeof auth.getSessionUser, "function");
	assert.equal(typeof auth.requireAdmin, "function");
	assert.equal(auth.SESSION_COOKIE, "shirone_session");
});

test("rate limiter blocks 4th hit in a minute", async () => {
	const { checkLimit } = await import("../../src/lib/rate-limit.ts");
	const key = `test-${Date.now()}`;
	assert.equal(checkLimit(key, 3, 60_000).ok, true);
	assert.equal(checkLimit(key, 3, 60_000).ok, true);
	assert.equal(checkLimit(key, 3, 60_000).ok, true);
	const fourth = checkLimit(key, 3, 60_000);
	assert.equal(fourth.ok, false);
	assert.ok(fourth.retryAfter > 0);
});
