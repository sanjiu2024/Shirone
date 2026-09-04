import { expect, test } from "@playwright/test";

test("SSR server responds with dynamic shell", async ({ page }) => {
	await page.goto("/");
	await expect(page.locator("#swup-container")).toHaveCount(1);
});

test("non-admin visiting /admin is redirected to login", async ({ page }) => {
	await page.goto("/admin/");
	await expect(page).toHaveURL(/login/);
});
