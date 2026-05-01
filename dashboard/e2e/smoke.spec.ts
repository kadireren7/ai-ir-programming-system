import { expect, test } from "@playwright/test";

test.describe("public smoke", () => {
  test("GET /api/health returns JSON snapshot", async ({ request }) => {
    const res = await request.get("/api/health");
    expect(res.ok()).toBeTruthy();
    const body = (await res.json()) as Record<string, unknown>;
    expect(body).toHaveProperty("status");
    expect(body).toHaveProperty("version");
    expect(body).toHaveProperty("checks");
  });

  test("GET /openapi.yaml serves OpenAPI document", async ({ request }) => {
    const res = await request.get("/openapi.yaml");
    expect(res.ok()).toBeTruthy();
    const text = await res.text();
    expect(text).toContain("openapi: 3.0.3");
    expect(text).toContain('version: "0.1.7"');
    expect(text).toContain("/api/public/scan");
  });

  test("marketing home loads", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByRole("link", { name: "Torqa" }).first()).toBeVisible();
  });

  test("login page loads", async ({ page }) => {
    await page.goto("/login");
    await expect(page.getByText("Torqa dashboard", { exact: true })).toBeVisible();
    await expect(page.getByRole("tab", { name: "Sign in" })).toBeVisible();
  });
});

test.describe("local mode (no Supabase in CI)", () => {
  test("overview is reachable when middleware skips auth", async ({ page }) => {
    await page.goto("/overview");
    await expect(
      page.getByRole("heading", { name: "Workflow governance, automated." })
    ).toBeVisible();
    await expect(page.getByRole("link", { name: /Connect a source/i }).first()).toBeVisible();
  });
});
