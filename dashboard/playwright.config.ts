import { defineConfig, devices } from "@playwright/test";

/**
 * Smoke E2E against a running Next server. CI runs `npm run build` first, then
 * Playwright starts `next start` via webServer (no Turbopack).
 *
 * a11y-axe.spec.ts is excluded here — it runs under playwright.a11y.config.ts
 * (dashboard-accessibility.yml) which provides the correct serial mode, retry count,
 * and PLAYWRIGHT_A11Y_BUILT env var. Running it here would double-execute it under
 * the wrong config and cause flaky 120 s webServer timeout failures.
 */
export default defineConfig({
  testDir: "./e2e",
  testIgnore: ["**/a11y-axe.spec.ts"],
  fullyParallel: true,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: process.env.CI ? "github" : "list",
  use: {
    baseURL: process.env.PLAYWRIGHT_BASE_URL ?? "http://127.0.0.1:3000",
    trace: "on-first-retry",
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: {
    command: "npm run start",
    url: "http://127.0.0.1:3000/api/health",
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
});
