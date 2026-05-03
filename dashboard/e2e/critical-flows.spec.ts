import { expect, test } from "@playwright/test";

const MINIMAL_N8N = JSON.stringify({
  name: "E2E Test Workflow",
  nodes: [
    { id: "1", name: "Start", type: "n8n-nodes-base.start", parameters: {}, position: [0, 0] },
    { id: "2", name: "HTTP Request", type: "n8n-nodes-base.httpRequest", parameters: { url: "https://example.com" }, position: [200, 0] },
  ],
  connections: {},
  active: true,
});

test.describe("scan flow", () => {
  test("scan page renders input form", async ({ page }) => {
    await page.goto("/scan");
    await expect(page.getByRole("heading", { name: "Scan" })).toBeVisible();
    await expect(page.locator("#scan-json")).toBeVisible();
    await expect(page.getByRole("button", { name: /run scan/i })).toBeVisible();
  });

  test("scan page accepts JSON and returns results", async ({ page }) => {
    await page.goto("/scan");

    await page.locator("#scan-json").fill(MINIMAL_N8N);
    await page.getByRole("button", { name: /run scan/i }).click();

    await expect(page.getByRole("heading", { name: /scan results/i })).toBeVisible({ timeout: 15_000 });
  });

  test("scan page shows validation error for invalid JSON", async ({ page }) => {
    await page.goto("/scan");

    await page.locator("#scan-json").fill("{ not valid json }");
    await page.getByRole("button", { name: /run scan/i }).click();

    await expect(page.getByText(/invalid json/i)).toBeVisible({ timeout: 5_000 });
  });

  test("scan page shows error when textarea is empty", async ({ page }) => {
    await page.goto("/scan");

    await page.getByRole("button", { name: /run scan/i }).click();

    await expect(page.getByLabel(/paste json/i)).toBeVisible({ timeout: 5_000 });
  });
});

test.describe("scan history", () => {
  test("scan history page loads", async ({ page }) => {
    await page.goto("/scan/history");
    await expect(page.getByRole("main")).toBeVisible();
    await expect(page.getByRole("heading", { name: /history/i })).toBeVisible();
  });
});

test.describe("reports", () => {
  test("reports page loads", async ({ page }) => {
    await page.goto("/reports");
    await expect(page.getByRole("main")).toBeVisible();
  });
});

test.describe("sources", () => {
  test("sources / integrations page loads", async ({ page }) => {
    await page.goto("/sources");
    await expect(page.getByRole("main")).toBeVisible();
  });
});

test.describe("workflows", () => {
  test("workflows page loads", async ({ page }) => {
    await page.goto("/workflows");
    await expect(page.getByRole("main")).toBeVisible();
  });

  test("workflow library page loads", async ({ page }) => {
    await page.goto("/workflow-library");
    await expect(page.getByRole("main")).toBeVisible();
  });
});
