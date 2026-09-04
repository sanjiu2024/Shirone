// tests/utils/db-contract.test.mjs
import { strict as assert } from "node:assert";
import { test } from "node:test";

test("db module exposes query and getPool", async () => {
	const db = await import("../../src/lib/db.ts");
	assert.equal(typeof db.query, "function");
	assert.equal(typeof db.getPool, "function");
});

test("getEnv throws on missing DB_PASSWORD", async () => {
	const saved = process.env.DB_PASSWORD;
	delete process.env.DB_PASSWORD;
	const { getEnv } = await import("../../src/lib/env.ts");
	assert.throws(() => getEnv(), /DB_PASSWORD/);
	if (saved !== undefined) process.env.DB_PASSWORD = saved;
});
