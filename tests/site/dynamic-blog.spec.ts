import { expect, test } from "@playwright/test";

test("SSR server responds with dynamic shell", async ({ page }) => {
	await page.goto("/");
	await expect(page.locator("#swup-container")).toHaveCount(1);
});
