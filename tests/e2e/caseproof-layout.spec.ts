import { test, expect } from "@playwright/test";

// Deterministic layout guard: every table on the CaseProof audit must fit the card it lives in.
// A vision reviewer reads a clipped column as "text cut off" (the 2026-09-04 tab-clipping incident
// and the 2026-09-18 ParcelProof table clipping), so the failure mode is asserted here as a number:
// a table wider than its container means a column the reader cannot see without scrolling.
test("caseproof tables fit their card at 1280px", async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto("/caseproof");
  await page.getByRole("button", { name: "Audit the case" }).click();
  await expect(page.getByText("14 months · 1.2 yr").first()).toBeVisible();

  const measurements = await page.$$eval("table", (tables) =>
    tables.map((table) => {
      const wrapper = table.parentElement as HTMLElement;
      return {
        region: wrapper.getAttribute("aria-label") ?? "(no region label)",
        tableWidth: Math.round(table.getBoundingClientRect().width),
        wrapperWidth: Math.round(wrapper.getBoundingClientRect().width),
        scrollWidth: wrapper.scrollWidth,
      };
    }),
  );
  console.log("TABLE_MEASUREMENTS", JSON.stringify(measurements));

  expect(measurements.length).toBeGreaterThan(0);
  for (const measurement of measurements) {
    expect(
      measurement.tableWidth,
      `${measurement.region}: table is ${measurement.tableWidth}px inside a ${measurement.wrapperWidth}px card — columns are clipped`,
    ).toBeLessThanOrEqual(measurement.wrapperWidth + 1);
    expect(measurement.scrollWidth).toBeLessThanOrEqual(measurement.wrapperWidth + 1);
  }
});

// The comparison surface is the widest state the page can render (ranking + sensitivity grid), so
// the guard is re-run there too rather than only on the single-bid case.
test("caseproof comparison tables fit their card at 1280px", async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto("/caseproof");
  await page.getByRole("button", { name: "Capex vs subscription" }).click();
  await page.getByRole("button", { name: "Audit the case" }).click();
  await expect(page.getByText("The bids on one cash model")).toBeVisible();

  const measurements = await page.$$eval("table", (tables) =>
    tables.map((table) => {
      const wrapper = table.parentElement as HTMLElement;
      return {
        tableWidth: Math.round(table.getBoundingClientRect().width),
        wrapperWidth: Math.round(wrapper.getBoundingClientRect().width),
      };
    }),
  );
  for (const measurement of measurements) {
    expect(measurement.tableWidth).toBeLessThanOrEqual(measurement.wrapperWidth + 1);
  }
});
