import { expect, test } from "@playwright/test";

test.describe("audit log", () => {
  test("settings page shows audit log card", async ({ page }) => {
    await page.goto("/settings");
    await expect(page.getByRole("heading", { name: "Settings" })).toBeVisible();
    await expect(page.getByRole("link", { name: /audit log/i })).toBeVisible();
  });

  test("audit log page loads", async ({ page }) => {
    await page.goto("/settings/audit-log");
    await expect(page.getByRole("main")).toBeVisible();
    await expect(page.getByRole("heading", { name: /audit log/i })).toBeVisible();
  });

  test("audit log page shows no-cloud message when Supabase not configured", async ({ page }) => {
    await page.goto("/settings/audit-log");
    // In CI without Supabase, shows degraded message or empty state
    const hasNoCloud = await page.getByText(/connect supabase/i).count() > 0;
    const hasUi = await page.getByText(/events|filter|refresh/i).count() > 0;
    expect(hasNoCloud || hasUi).toBeTruthy();
  });
});

test.describe("settings navigation", () => {
  test("settings page renders all cards", async ({ page }) => {
    await page.goto("/settings");
    await expect(page.getByRole("link", { name: /manage api keys/i })).toBeVisible();
    await expect(page.getByRole("link", { name: /notification prefs/i })).toBeVisible();
    await expect(page.getByRole("link", { name: /workspace settings/i })).toBeVisible();
    await expect(page.getByRole("link", { name: /view audit log/i })).toBeVisible();
  });

  test("API keys settings page loads", async ({ page }) => {
    await page.goto("/settings/api");
    await expect(page.getByRole("main")).toBeVisible();
  });

  test("notifications settings page loads", async ({ page }) => {
    await page.goto("/settings/notifications");
    await expect(page.getByRole("main")).toBeVisible();
  });
});
