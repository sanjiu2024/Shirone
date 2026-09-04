import { strict as assert } from "node:assert";
import { test } from "node:test";

test("comment validation rejects empty and oversize", async () => {
	const comments = await import("../../src/lib/comments.ts");
	assert.throws(() => comments.normalizeContent("   "), /empty/);
	assert.throws(() => comments.normalizeContent("x".repeat(2001)), /2000/);
	assert.equal(comments.normalizeContent("  hello  "), "hello");
});
