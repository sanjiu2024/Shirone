// NOTE (Baota live-DB requirement): the "SSR server responds" test renders `/`
// through [...permalink] -> listPublished, so it needs MySQL + `node db/migrate.mjs`
// (see tests/DB-E2E-NOTES.md). The 401 + admin-redirect fragments are DB-less
// (auth/validation short-circuit before any DB query) and run locally.
import { expect, test } from "@playwright/test";

// LIVE-DB ONLY (Baota): requires MySQL + migrated schema; 500s without DB.
test("SSR server responds with dynamic shell", async ({ page }) => {
	await page.goto("/");
	await expect(page.locator("#swup-container")).toHaveCount(1);
});

test("unauthenticated comment post returns 401", async ({ request }) => {
	// Trailing slash required: astro.config sets trailingSlash "always",
	// so the slash-less route 404s before reaching the handler.
	const res = await request.post("/api/comments/", {
		data: { postId: 1, content: "hi" },
	});
	expect(res.status()).toBe(401);
});

test("non-admin visiting /admin is redirected to login", async ({ page }) => {
	await page.goto("/admin/");
	await expect(page).toHaveURL(/login/);
});
