import { expect, test } from "@playwright/test";

test.describe("schedule flow", () => {
  test("schedules page loads", async ({ page }) => {
    await page.goto("/schedules");
    await expect(page.getByRole("main")).toBeVisible();
  });

  test("schedules page has correct heading", async ({ page }) => {
    await page.goto("/schedules");
    await expect(page.getByRole("heading", { name: /schedule/i }).first()).toBeVisible();
  });

  test("schedules page shows cloud-gate or schedule list when no Supabase configured", async ({ page }) => {
    await page.goto("/schedules");
    // Either shows Supabase setup message or the create schedule UI
    const hasCloudGate = await page.getByText(/connect supabase/i).count() > 0;
    const hasSchedulesUi = (await page.getByText(/create|schedule|frequency/i).count()) > 0;
    expect(hasCloudGate || hasSchedulesUi).toBeTruthy();
  });

  test("runs page loads", async ({ page }) => {
    await page.goto("/runs");
    await expect(page.getByRole("main")).toBeVisible();
  });
});
