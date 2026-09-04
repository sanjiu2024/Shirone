// tests/utils/posts-contract.test.mjs
import { strict as assert } from "node:assert";
import { test } from "node:test";

test("posts repo validates input", async () => {
	const posts = await import("../../src/lib/posts.ts");
	assert.equal(typeof posts.listPublished, "function");
	assert.throws(
		() => posts.validatePostInput({ slug: "", title: "", content_md: "" }),
		/slug/,
	);
	assert.throws(
		() =>
			posts.validatePostInput({
				slug: "ok",
				title: "t",
				content_md: "x".repeat(2_000_000),
			}),
		/content/,
	);
});
