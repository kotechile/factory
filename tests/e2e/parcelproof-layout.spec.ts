import { test, expect } from "@playwright/test";

// Deterministic layout guard: the audit tables must fit the card they live in. Vision review reads a
// clipped column as "text cut off" (the 2026-09-04 tab-clipping incident), so the failure mode is
// asserted here as a number instead: a table wider than its scroll container means a column the
// reader cannot see without scrolling, which is exactly what this page must not do.
test("parcelproof tables fit their card at 1280px", async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto("/parcelproof");
  await page.getByRole("button", { name: "Audit invoice", exact: true }).click();
  await expect(page.getByText("pp-dim-divisor").first()).toBeVisible();

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

  for (const measurement of measurements) {
    expect(
      measurement.tableWidth,
      `${measurement.region}: table is ${measurement.tableWidth}px inside a ${measurement.wrapperWidth}px card — columns are clipped`,
    ).toBeLessThanOrEqual(measurement.wrapperWidth + 1);
    expect(measurement.scrollWidth).toBeLessThanOrEqual(measurement.wrapperWidth + 1);
  }
});
