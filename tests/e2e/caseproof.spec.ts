import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

test("caseproof renders at /caseproof", async ({ page }) => {
  await page.goto("/caseproof");
  await expect(page).toHaveTitle(/CaseProof/);
  await expect(
    page.getByRole("heading", { name: /CaseProof — the buyer's side of a warehouse automation case/ }),
  ).toBeVisible();
});

test("caseproof reproduces the 14-month claim and audits it at 41 on the buyer's numbers", async ({ page }) => {
  await page.goto("/caseproof");
  // The page loads its worked case; auditing is always explicit.
  await page.getByRole("button", { name: "Audit the case" }).click();

  await expect(page.getByText("14 months · 1.2 yr").first()).toBeVisible();
  await expect(page.getByText("41 months · 3.4 yr").first()).toBeVisible();
  await expect(page.getByText("The vendor's headcount claim vs the buyer's own analysis")).toBeVisible();
  await expect(page.getByText("Blended wage → fully loaded rate")).toBeVisible();
  await expect(page.getByText("Maintenance the quote left blank")).toBeVisible();
  // The loaded rate is shown component by component against the vendor's blended wage.
  await expect(page.getByText("Turnover replacement")).toBeVisible();
  await expect(page.getByText("Fully loaded labour rate")).toBeVisible();
  // And the case clears on the buyer's numbers with nothing unstated.
  await expect(page.getByText("clears", { exact: true })).toBeVisible();
});

test("caseproof names the assumptions to confirm in writing, riskiest first", async ({ page }) => {
  await page.goto("/caseproof");
  await page.getByRole("button", { name: "Audit the case" }).click();
  await expect(page.getByText("Confirm in writing before signature")).toBeVisible();
  await expect(page.getByText("18.00 FTE", { exact: true }).first()).toBeVisible();
  await expect(page.getByText("$20.64/h").first()).toBeVisible();
  await expect(page.getByText("Action:").first()).toBeVisible();
});

test("caseproof reports a blank maintenance line as unstated and blocks the verdict", async ({ page }) => {
  await page.goto("/caseproof");
  await page.getByRole("button", { name: "Maintenance left blank" }).click();
  await page.getByRole("button", { name: "Audit the case" }).click();

  await expect(page.getByText("blocked", { exact: true })).toBeVisible();
  await expect(page.getByText("option.maintenancePctOfCapex")).toBeVisible();
  await expect(page.getByText(/an unstated line blocks a pass verdict/)).toBeVisible();
});

test("caseproof applies the section 179 phase-out above $4,090,000", async ({ page }) => {
  await page.goto("/caseproof");
  await page.getByRole("button", { name: "§179 phase-out" }).click();
  await page.getByRole("button", { name: "Audit the case" }).click();

  await expect(page.getByText(/§179 \$1,650,000\.00/)).toBeVisible();
  await expect(page.getByText(/bonus \$3,350,000\.00/)).toBeVisible();
  await expect(page.getByText(/section179\.org/).first()).toBeVisible();
});

test("caseproof compares a capex bid against a subscription and reports the crossing", async ({ page }) => {
  await page.goto("/caseproof");
  await page.getByRole("button", { name: "Capex vs subscription" }).click();
  await page.getByRole("button", { name: "Audit the case" }).click();

  await expect(page.getByText(/'bid-raas' leads until \d+\.\d% seasonal premium/)).toBeVisible();
  await expect(page.getByText(/peakFactor = 1\.4/)).toBeVisible();
  await expect(page.getByText("The bids on one cash model")).toBeVisible();
  await expect(page.getByText("Volume -10%")).toBeVisible();
  await expect(page.getByText("Capex +15%")).toBeVisible();
  await expect(page.getByText("Maintenance +25%")).toBeVisible();
});

test("caseproof rule page renders its preset target", async ({ page }) => {
  await page.goto("/caseproof/calc/section-179-2026-in-service-deadline");
  await expect(
    page.getByRole("heading", { name: /Section 179 in 2026, with the phase-out applied/ }),
  ).toBeVisible();
  await expect(page.getByRole("button", { name: "Audit the case" })).toBeVisible();
});

test("caseproof refuses an unreadable case instead of auditing it", async ({ page }) => {
  await page.goto("/caseproof");
  await page.getByLabel("Case (JSON)").fill("{ not json");
  await page.getByRole("button", { name: "Audit the case" }).click();
  await expect(page.getByText(/Nothing was audited/)).toBeVisible();
});

test("caseproof exposes the decision pack once a case is audited", async ({ page }) => {
  await page.goto("/caseproof");
  await page.getByRole("button", { name: "Audit the case" }).click();
  await expect(page.getByRole("button", { name: /Decision pack \(CSV\)/ })).toBeVisible();
});

test("caseproof passes WCAG 2.1 AA accessibility (axe)", async ({ page }) => {
  await page.goto("/caseproof");
  await page.getByRole("button", { name: "Audit the case" }).click();
  await expect(page.getByText("14 months · 1.2 yr").first()).toBeVisible();
  const results = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
    .analyze();
  expect(results.violations).toEqual([]);
});
