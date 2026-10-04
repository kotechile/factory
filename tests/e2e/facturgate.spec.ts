import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

test("facturgate renders at /facturgate", async ({ page }) => {
  await page.goto("/facturgate");
  await expect(page).toHaveTitle(/FacturGate/);
  // The hero headline is the Editorial Signature's (the older name-as-heading copy moved to the
  // sticky product header and the page title).
  await expect(
    page.getByRole("heading", { name: "Know an invoice will be rejected before it leaves" }),
  ).toBeVisible();
  await expect(page.getByText("FacturGate").first()).toBeVisible();
});

test("facturgate scores the loaded FR example 100/100 without findings", async ({ page }) => {
  await page.goto("/facturgate");
  await page.getByRole("button", { name: /Load valid FR example/ }).click();
  await page.getByRole("button", { name: /Validate & score/ }).click();

  await expect(page.getByText("100/100")).toBeVisible();
  await expect(page.getByText("No rule in the implemented set failed.")).toBeVisible();
  // The reconciliation is shown to the cent, with a zero delta.
  await expect(page.getByText("Reconciliation (recomputed from the lines)")).toBeVisible();
  await expect(page.getByText("Delta (computed − declared)")).toBeVisible();
});

test("facturgate blocks the broken example and names the failing rule", async ({ page }) => {
  await page.goto("/facturgate");
  await page.getByRole("button", { name: /Load broken example/ }).click();
  await page.getByRole("button", { name: /Validate & score/ }).click();

  await expect(page.getByText("blocked")).toBeVisible();
  await expect(page.getByText("BR-05").first()).toBeVisible();
  await expect(page.getByText("invoice.currency").first()).toBeVisible();
});

test("facturgate emits the converted EN 16931 artifact", async ({ page }) => {
  await page.goto("/facturgate");
  await page.getByRole("button", { name: /Load valid FR example/ }).click();
  await page.getByRole("button", { name: /Validate & convert/ }).click();

  await expect(page.getByText("Emitted artifact")).toBeVisible();
  await expect(page.getByText(/urn:cen\.eu:en16931:2017#compliant#urn:factur-x\.eu:1p0:en16931/).first()).toBeVisible();
  await expect(page.getByRole("button", { name: /Download/ })).toBeVisible();
});

test("facturgate surfaces the pricing block and the billing entry point", async ({ page }) => {
  await page.goto("/facturgate");

  // The pricing block reads the catalog (src/products/pricing.ts) — same numbers the API charges.
  await expect(page.getByRole("heading", { name: "Pricing" })).toBeVisible();
  await expect(page.getByText("$29.00/month")).toBeVisible();
  await expect(page.getByText("$0.10 per successful call")).toBeVisible();
  await expect(page.getByText("$0.25 per successful call")).toBeVisible();

  // A link to pricing, in the header and in the agent guide.
  await expect(page.getByRole("link", { name: /Billing & Pricing/ })).toBeVisible();
  await expect(page.getByRole("link", { name: /Get Agent Key \/ Manage Billing/ })).toBeVisible();
});

test("facturgate documents the WebMCP agent surface with the manifest and showcase links", async ({
  page,
}) => {
  await page.goto("/facturgate");

  await expect(
    page.getByRole("heading", { name: "Agent Surface & WebMCP Integration" }),
  ).toBeVisible();
  // The advertised band and the footer rate line are derived from the pricing catalog.
  await expect(page.getByText("METERED $0.05 – $0.25 / CALL")).toBeVisible();
  await expect(page.getByText(/check_eu_vat_id \(\$0\.05\) · validate_einvoice \(\$0\.10\)/)).toBeVisible();

  await expect(page.getByRole("link", { name: "/.well-known/mcp.json" }).first()).toBeVisible();
  await expect(page.getByRole("link", { name: /Factory Showcase Directory/ })).toBeVisible();

  // The snippet tabs switch, and the cURL tab names the metered endpoint and the tool selector.
  await page.getByRole("button", { name: /HTTP \/ cURL API/ }).click();
  await expect(page.getByText("POST /api/agent/calculate")).toBeVisible();
  await expect(page.locator("pre code").first()).toContainText(
    "x-webmcp-tool: validate_einvoice",
  );

  // The MCP client tab carries the server config an agent host needs.
  await page.getByRole("button", { name: /MCP Client Config/ }).click();
  await expect(page.locator("pre code").first()).toContainText(
    "https://apps.giniloh.com/.well-known/mcp.json",
  );
});

test("facturgate rule page renders its preset target", async ({ page }) => {
  await page.goto("/facturgate/calc/br-06-seller-name");
  await expect(page.getByRole("heading", { name: /BR-06 \/ BR-07/ })).toBeVisible();
  await expect(page.getByRole("button", { name: /Load valid FR example/ })).toBeVisible();
});

test("facturgate country page renders for Poland", async ({ page }) => {
  await page.goto("/facturgate/calc/ksef-fa3-pl");
  await expect(page.getByRole("heading", { name: /Poland \(KSeF\)/ })).toBeVisible();
  await expect(page.getByRole("button", { name: /Load valid PL example/ })).toBeVisible();
});

test("facturgate passes WCAG 2.1 AA accessibility (axe)", async ({ page }) => {
  await page.goto("/facturgate");
  const results = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
    .analyze();
  expect(results.violations).toEqual([]);
});
