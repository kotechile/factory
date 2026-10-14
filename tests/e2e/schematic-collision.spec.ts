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

/**
 * The second class this file decides: a caption CROSSING (or crowding) the border of the box it sits in.
 *
 * `facturgate-qa-1` failed the vision gate twice on 2026-10-14 — "text 'FR · CII / UBL / JSON' overlaps
 * the bottom border of the Invoice Payload box" — on the hero artwork this repo has not touched since
 * 2026-10-04, on a tile that PASSED the same gate earlier the same day. Measurement at 1280x900: the
 * caption's glyph ink box sits 4.58 px above that border (top 34.1, bottom 4.6, left 8.2, right 9.4 px
 * of clearance), i.e. fully inside its frame. A model reading a screenshot cannot settle that, so the
 * geometry does.
 *
 * Association is STRUCTURAL, not a nearest-box guess: each node in these diagrams is a `<g>` holding its
 * own frame `<rect>` and its captions, so a caption is measured against the largest rect drawn directly
 * in its own group. An earlier version associated by "the rect the caption's centre falls in" and was
 * NOT trustworthy — it silently skipped a caption that had been pushed OUT of its frame, which is exactly
 * the regression it exists to catch (proved by shrinking that rect to 46 and watching it stay green).
 *
 * Method: the INK box per glyph (`getExtentOfChar` → screen CTM), because a descender is what crosses a
 * border, not the layout box; a caption whose layout box does not touch its frame at all is skipped.
 *
 * Threshold evidence (worst clearance per product at 1280x900, measured 2026-10-14): facturgate 4.58,
 * ledgerlink 6.77, spendproof 8.35, parcelproof 13.04, caseproof 13.16 px — so 3 px fails a crossing or
 * a regression that eats the gap, without failing today's tightest legitimate caption.
 *
 * The hero artwork renders unconditionally, so this class needs no product setup — and it therefore also
 * covers /ledgerlink, which the connector list above omits.
 */
const HERO_PATHS = ["/facturgate", "/parcelproof", "/caseproof", "/spendproof", "/ledgerlink"];

for (const path of HERO_PATHS) {
  test(`no schematic caption crosses the border of its own box on ${path}`, async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 900 });
    await page.goto(path);
    await page.waitForTimeout(300);

    const crossings = await page.evaluate(() => {
      const MIN_CLEARANCE_PX = 3;
      const found: string[] = [];

      for (const svg of Array.from(document.querySelectorAll("svg"))) {
        const svgRect = svg.getBoundingClientRect();
        // Only the hero artwork: a wide, short diagram. Skips icons and pill glyphs.
        if (svgRect.width < 320 || svgRect.height < 120) continue;

        for (const group of Array.from(svg.querySelectorAll("g"))) {
          const frames = Array.from(group.querySelectorAll(":scope > rect"));
          if (frames.length === 0) continue;

          // The node's frame is the largest rect drawn directly in this group (a pill also draws a
          // 16x16 badge tile beside its label, and a node may draw a small icon square).
          let frame: Element | null = null;
          let largest = 0;
          for (const candidate of frames) {
            const box = (candidate as SVGGraphicsElement).getBBox();
            const area = box.width * box.height;
            if (area > largest) {
              largest = area;
              frame = candidate;
            }
          }
          if (!frame) continue;
          const frameRect = frame.getBoundingClientRect();

          for (const node of Array.from(group.querySelectorAll(":scope > text"))) {
            const label = (node.textContent ?? "").trim();
            if (!label) continue;
            const text = node as SVGTextElement;

            // Skip a caption that has nothing to do with this frame (no overlap at all).
            const layout = text.getBoundingClientRect();
            const touchesFrame =
              layout.right > frameRect.left &&
              layout.left < frameRect.right &&
              layout.bottom > frameRect.top &&
              layout.top < frameRect.bottom;
            if (!touchesFrame) continue;

            const ctm = text.getScreenCTM();
            const chars = text.getNumberOfChars();
            if (!ctm || !chars) continue;

            let ink = { top: Infinity, bottom: -Infinity, left: Infinity, right: -Infinity };
            for (let i = 0; i < chars; i++) {
              const extent = text.getExtentOfChar(i);
              const corners = [
                new DOMPoint(extent.x, extent.y).matrixTransform(ctm),
                new DOMPoint(extent.x + extent.width, extent.y + extent.height).matrixTransform(ctm),
              ];
              for (const point of corners) {
                ink = {
                  top: Math.min(ink.top, point.y),
                  bottom: Math.max(ink.bottom, point.y),
                  left: Math.min(ink.left, point.x),
                  right: Math.max(ink.right, point.x),
                };
              }
            }
            if (!Number.isFinite(ink.top)) continue;

            const gaps = {
              top: ink.top - frameRect.top,
              bottom: frameRect.bottom - ink.bottom,
              left: ink.left - frameRect.left,
              right: frameRect.right - ink.right,
            };
            const worst = Math.min(...Object.values(gaps));
            if (worst < MIN_CLEARANCE_PX) {
              found.push(
                `"${label}" clears its own frame by ${worst.toFixed(2)}px ` +
                  `(top ${gaps.top.toFixed(1)}, bottom ${gaps.bottom.toFixed(1)}, ` +
                  `left ${gaps.left.toFixed(1)}, right ${gaps.right.toFixed(1)}); ` +
                  `needs >= ${MIN_CLEARANCE_PX}px`,
              );
            }
          }
        }
      }
      return found;
    });

    expect(crossings, `${path}: ${crossings.join("; ")}`).toEqual([]);
  });
}
