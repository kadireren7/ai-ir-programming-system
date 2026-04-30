import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";

/**
 * Accessibility gate (WCAG 2.1 AA-oriented).
 * CI runs **without** Supabase public env so middleware does not force /login — app routes render in demo mode.
 */
const ROUTES = [
  "/",
  "/login",
  "/overview",
  "/scan",
  "/scan/history",
  "/workflow-library",
  "/policies",
  "/insights",
  "/workspace",
  "/alerts",
  "/schedules",
  "/settings/api",
] as const;

const SERIOUS_IMPACTS = new Set(["critical", "serious"]);

function formatViolations(v: { id: string; impact?: string | null; help: string; nodes?: unknown[] }[]) {
  return v.map((x) => ({
    id: x.id,
    impact: x.impact,
    help: x.help,
    nodes: x.nodes?.length ?? 0,
  }));
}

async function assertRouteAccessible(page: Page, path: string) {
  const res = await page.goto(path, { waitUntil: "domcontentloaded" });
  expect(res, `navigation failed for ${path}`).not.toBeNull();
  expect(res!.status(), `HTTP ${res!.status()} for ${path}`).toBeLessThan(500);

  await expect(page.getByRole("main"), `missing <main> landmark for ${path}`).toBeVisible({ timeout: 20_000 });

  const axe = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa"])
    .analyze();

  const serious = axe.violations.filter((v) => v.impact && SERIOUS_IMPACTS.has(v.impact));
  expect(serious, `axe serious/critical violations on ${path}: ${JSON.stringify(formatViolations(serious), null, 2)}`).toEqual(
    []
  );
}

test.describe.configure({ mode: "serial" });

for (const path of ROUTES) {
  test(`a11y: ${path}`, async ({ page }) => {
    await assertRouteAccessible(page, path);
  });
}
