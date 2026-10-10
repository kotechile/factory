import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

test("spendproof renders at /spendproof", async ({ page }) => {
  await page.goto("/spendproof");
  await expect(page).toHaveTitle(/SpendProof/);
  await expect(
    page.getByRole("heading", {
      name: "Close the AI bill against the usage you can actually attribute",
    }),
  ).toBeVisible();
  await expect(page.getByText("SpendProof").first()).toBeVisible();
});

test("spendproof withholds the close on an untagged batch and names the rule", async ({ page }) => {
  await page.goto("/spendproof");
  // The page loads its worked example; reconciling is always explicit.
  await page.getByRole("button", { name: "Reconcile the period" }).click();

  await expect(page.getByText("CLOSE WITHHELD")).toBeVisible();
  // The invoice is $3.00; the tagged ledger recomputes to $2.70 because 100,000 units carry no tag.
  await expect(page.getByText("$2.70").first()).toBeVisible();
  await expect(page.getByText("sp-untagged-spend").first()).toBeVisible();
  await expect(page.getByText(/100,000 units unattributed/)).toBeVisible();
  await expect(page.getByText("Withholding the close: sp-untagged-spend")).toBeVisible();
  // The affected bucket is reported unmatched, not quietly reconciled.
  await expect(page.getByText("unmatched").first()).toBeVisible();
});

test("spendproof closes a clean pair to zero findings", async ({ page }) => {
  await page.goto("/spendproof");
  await page.getByRole("button", { name: "Clean pair" }).click();
  await page.getByRole("button", { name: "Reconcile the period" }).click();

  await expect(page.getByText("CLOSE-READY")).toBeVisible();
  await expect(page.getByText("Zero findings: both records agree at the declared rate.")).toBeVisible();
  await expect(page.getByText("No untagged usage")).toBeVisible();
  // Nothing is withheld, so there is no blocker line at all.
  await expect(page.getByText(/Withholding the close:/)).toHaveCount(0);
});

test("spendproof flags a mid-period rate change as price drift, never a variance", async ({
  page,
}) => {
  await page.goto("/spendproof");
  await page.getByRole("button", { name: "Mid-period rate change" }).click();
  await page.getByRole("button", { name: "Reconcile the period" }).click();

  await expect(page.getByText("sp-price-drift").first()).toBeVisible();
  await expect(page.getByText("CLOSE WITHHELD")).toBeVisible();
  // No variance number is published for a two-rate period: picking a rate would invent one.
  await expect(page.getByText("not reported").first()).toBeVisible();
  await expect(page.getByText("not computable at one rate").first()).toBeVisible();
  // Scoped to the FINDINGS list: the page also lists every implemented rule id (coverage) and every
  // variance class, so an unscoped text match would always find this string. The claim is that no
  // finding of another class was raised for a two-rate period.
  const findings = page.getByRole("list", { name: "Findings" });
  await expect(findings.getByText("sp-missing-usage")).toHaveCount(0);
  await expect(findings.getByText("sp-bucket-unmatched")).toHaveCount(0);
  await expect(findings.getByText("sp-price-drift")).toHaveCount(1);
});

test("spendproof reports a boundary overlap differently from lost usage", async ({ page }) => {
  await page.goto("/spendproof");
  await page.getByRole("button", { name: "Period-boundary overlap" }).click();
  await page.getByRole("button", { name: "Reconcile the period" }).click();

  await expect(page.getByText("sp-period-overlap").first()).toBeVisible();
  const findings = page.getByRole("list", { name: "Findings" });
  await expect(findings.getByText("sp-period-overlap")).toHaveCount(1);
  await expect(findings.getByText("sp-missing-usage")).toHaveCount(0);
  await expect(page.getByText("Near period edge").first()).toBeVisible();
});

test("spendproof refuses a file it cannot read instead of reconciling part of it", async ({
  page,
}) => {
  await page.goto("/spendproof");
  await page.getByRole("button", { name: "Clear" }).click();

  await page
    .getByLabel("Invoice line items (CSV)")
    .fill(
      [
        "provider,period_start,period_end,service,model,sku,quantity,unit_price_usd_per_thousand,amount_usd,invoice_total_usd",
        "openai,2026-09-01,2026-09-30,chat.completions,gpt-4o,gpt-4o-input,1000000,0.003,,3.00",
      ].join("\n"),
    );
  await page
    .getByLabel("Tagged-usage ledger (CSV)")
    .fill(
      [
        "bucket,service,model,sku,quantity,timestamp",
        "payments,chat.completions,gpt-4o,gpt-4o-input,1000000,2026-09-10T12:00:00Z",
      ].join("\n"),
    );
  await page.getByRole("button", { name: "Reconcile the period" }).click();

  await expect(page.getByText(/sp-field-missing at invoice\[1\]\.amount_usd/)).toBeVisible();
  await expect(page.getByText(/never read as zero/)).toBeVisible();
});

test("spendproof exposes the close pack once a period is reconciled", async ({ page }) => {
  await page.goto("/spendproof");
  await page.getByRole("button", { name: "Reconcile the period" }).click();
  await expect(page.getByRole("button", { name: /Download close pack/ })).toBeVisible();
});

test("spendproof surfaces the pricing block and the billing entry point", async ({ page }) => {
  await page.goto("/spendproof");

  // The pricing block reads the catalog (src/products/pricing.ts) — the same number the API charges.
  await expect(page.getByRole("heading", { name: "Pricing" })).toBeVisible();
  await expect(page.getByText("$29.00/month")).toBeVisible();
  await expect(page.getByText("$9.00 one-off")).toBeVisible();
  // Scoped to the rate TABLE cell: the same figure is also quoted in the agent-surface copy below.
  await expect(page.getByRole("cell", { name: "$1.50 per successful call" })).toBeVisible();
  await expect(page.getByRole("link", { name: /Manage Billing & API Keys/ })).toBeVisible();
});

test("spendproof documents the WebMCP agent surface with the manifest link", async ({ page }) => {
  await page.goto("/spendproof");

  const agentSurface = page.getByText(/Agent surface:/);
  await expect(agentSurface).toBeVisible();
  await expect(agentSurface).toContainText("reconcile_ai_invoice");
  await expect(page.getByRole("link", { name: "/.well-known/mcp.json" }).first()).toBeVisible();
});

test("spendproof's extraction panel answers explicitly — it never returns a silent nothing", async ({
  page,
}) => {
  await page.goto("/spendproof");
  // The panel ships with a worked example document (a surface demonstrating a document read should
  // open on a document, not on an empty placeholder).
  await expect(page.getByLabel("Invoice document text")).not.toBeEmpty();
  await page.getByRole("button", { name: "Extract declared fields" }).click();

  // Either the deploy is configured and the declared fields come back LABELLED, or it is not and the
  // refusal names the missing env vars. Both are explicit; an empty panel would be the defect.
  const panel = page.getByRole("region", { name: "Extraction result" });
  await expect(panel).toBeVisible();
  await expect(
    panel
      .getByText(/missing in the deploy environment:/)
      .or(panel.getByText("Extracted fields"))
      .first(),
  ).toBeVisible();
});

test("spendproof passes WCAG 2.1 AA accessibility (axe)", async ({ page }) => {
  await page.goto("/spendproof");
  await page.getByRole("button", { name: "Reconcile the period" }).click();
  await expect(page.getByText("sp-untagged-spend").first()).toBeVisible();
  const results = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
    .analyze();
  expect(results.violations).toEqual([]);
});
