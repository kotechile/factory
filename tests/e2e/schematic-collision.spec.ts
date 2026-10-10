import { test, expect } from "@playwright/test";

/**
 * Deterministic guard for the hero schematic: no text may be crossed by a connector line.
 *
 * Written after the vision-QA gate (now reviewing full-resolution tiles) flagged the CaseProof hero with
 * "text 'vendor lines, buyer basis' overlaps with dashed line in diagram" — and the measurement agreed:
 * the caller-supplied caption was 26 characters in a card that fits ~23, so it spilled past the card's
 * right edge and the dashed beam out of that card ran through it. The vision gate found it; this test
 * keeps it found, because the same defect is invisible to a layout test that only checks card widths.
 *
 * Method: a bounding box is not proof for a diagonal line, so each connector path is SAMPLED along its
 * real geometry (`getPointAtLength` → `getScreenCTM` → client coordinates) and every sample is tested
 * against each text node's client rect. Any sample inside a label is a collision.
 */
const PAGES = [
  {
    path: "/facturgate",
    setup: async (page: import("@playwright/test").Page) => {
      await page.getByRole("button", { name: /Load valid FR example/ }).click();
      await page.getByRole("button", { name: /Validate & convert/ }).click();
      await page.getByText("100/100").first().waitFor();
    },
  },
  {
    path: "/parcelproof",
    setup: async (page: import("@playwright/test").Page) => {
      await page.getByRole("button", { name: "Audit invoice", exact: true }).click();
      await page.getByText("$71.50").first().waitFor();
    },
  },
  {
    path: "/caseproof",
    setup: async (page: import("@playwright/test").Page) => {
      await page.getByRole("button", { name: "Audit the case" }).click();
      await page.getByText("41 months · 3.4 yr").first().waitFor();
    },
  },
  {
    path: "/spendproof",
    setup: async (page: import("@playwright/test").Page) => {
      await page.getByRole("button", { name: "Reconcile the period" }).click();
      await page.getByText("CLOSE WITHHELD").waitFor();
    },
  },
];

for (const { path, setup } of PAGES) {
  test(`no schematic text is crossed by a connector line on ${path}`, async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 900 });
    await page.goto(path);
    await setup(page);
    await page.waitForTimeout(300);

    const collisions = await page.evaluate(() => {
      const found: string[] = [];
      for (const svg of Array.from(document.querySelectorAll("svg"))) {
        const svgRect = svg.getBoundingClientRect();
        // Only the hero artwork: a wide, short diagram. Skips icons and pill glyphs.
        if (svgRect.width < 320 || svgRect.height < 120) continue;

        const texts = Array.from(svg.querySelectorAll("text"));
        const paths = Array.from(svg.querySelectorAll("path"));
        for (const text of texts) {
          const label = (text.textContent ?? "").trim();
          if (!label) continue;
          const tRect = (text as SVGGraphicsElement).getBoundingClientRect();
          if (tRect.width < 2 || tRect.height < 2) continue;

          for (const path of paths) {
            const el = path as SVGPathElement;
            if (typeof el.getTotalLength !== "function") continue;
            let length = 0;
            try {
              length = el.getTotalLength();
            } catch {
              continue;
            }
            if (!length) continue;
            const ctm = el.getScreenCTM();
            if (!ctm) continue;

            const steps = 240;
            let inside = 0;
            for (let s = 0; s <= steps; s++) {
              const point = el.getPointAtLength((length * s) / steps);
              const x = ctm.a * point.x + ctm.c * point.y + ctm.e;
              const y = ctm.b * point.x + ctm.d * point.y + ctm.f;
              if (x > tRect.left && x < tRect.right && y > tRect.top && y < tRect.bottom) inside++;
            }
            if (inside > 0) {
              found.push(
                `"${label}" is crossed by a connector (${path.getAttribute("d") ?? ""}) at ${inside} of ${steps + 1} samples`,
              );
            }
          }
        }
      }
      return found;
    });

    expect(collisions, `${path}: ${collisions.join("; ")}`).toEqual([]);
  });
}
