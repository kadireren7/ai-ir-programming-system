import { test, expect } from "@playwright/test";

test.describe("enforcement webhooks settings", () => {
  test("settings page has webhooks card", async ({ page }) => {
    await page.goto("/settings");
    await expect(page.getByText("Enforcement Webhooks")).toBeVisible();
    await expect(page.getByRole("link", { name: /manage webhooks/i })).toBeVisible();
  });

  test("webhooks settings page loads", async ({ page }) => {
    await page.goto("/settings/webhooks");
    await expect(page.getByRole("heading", { name: /enforcement webhooks/i })).toBeVisible();
  });

  test("webhooks page shows add button or cloud gate", async ({ page }) => {
    await page.goto("/settings/webhooks");
    const addBtn = page.getByRole("button", { name: /add webhook/i });
    const cloudMsg = page.getByText(/cloud mode is required/i);
    const isCloud = await addBtn.isVisible().catch(() => false);
    const isDemo = await cloudMsg.isVisible().catch(() => false);
    expect(isCloud || isDemo).toBe(true);
  });
});
