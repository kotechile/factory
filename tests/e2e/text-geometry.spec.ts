import { test, expect } from "@playwright/test";

/**
 * Deterministic text-geometry guard for the Editorial Signature surfaces.
 *
 * Two classes the vision-QA step keeps raising, both of which measurement settles and a model cannot:
 *
 *  1. **"The placeholder / field text overlaps the line-number gutter"** (spendproof-qa-4, 2026-10-09).
 *     The IDE treatment puts the gutter and the field in two adjacent boxes, so the field's text origin
 *     must sit RIGHT of the gutter's content edge. Measured here rather than argued about.
 *  2. **"Text overlaps text"** in a row (a variance figure beside a badge, a file title beside a chrome
 *     badge — spendproof-qa-3 and caseproof-qa-5/1, 2026-10-09). Flex rows do not overlap: they either
 *     fit with their gap or they wrap. Every text run's client rects are intersected here, so the claim
 *     is decided by geometry on every build instead of by a model's read of a screenshot.
 *
 * Anything whose paint is clipped (a `truncate` title, an `overflow-auto` table wrapper) is SKIPPED:
 * its client rects are the unclipped layout, which reports intersections that are not painted — the
 * false-positive source the 2026-10-04 recipe documented.
 */
const PRODUCTS: {
  path: string;
  setup: (page: import("@playwright/test").Page) => Promise<void>;
}[] = [
  {
    path: "/spendproof",
    setup: async (page) => {
      await page.getByRole("button", { name: "Reconcile the period" }).click();
      await page.getByText("CLOSE WITHHELD").waitFor();
    },
  },
  {
    path: "/caseproof",
    setup: async (page) => {
      await page.getByRole("button", { name: "Audit the case" }).click();
      await page.getByText("41 months · 3.4 yr").first().waitFor();
    },
  },
  {
    path: "/parcelproof",
    setup: async (page) => {
      await page.getByRole("button", { name: "Audit invoice", exact: true }).click();
      await page.getByText("$71.50").first().waitFor();
    },
  },
  {
    path: "/facturgate",
    setup: async (page) => {
      await page.getByRole("button", { name: /Load valid FR example/ }).click();
      await page.getByRole("button", { name: /Validate & convert/ }).click();
      await page.getByText("100/100").waitFor();
    },
  },
];

for (const { path, setup } of PRODUCTS) {
  test(`no IDE field renders its text under the line-number gutter on ${path}`, async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 900 });
    await page.goto(path);

    const violations = await page.evaluate(() => {
      const found: string[] = [];
      const textareas = Array.from(document.querySelectorAll("textarea"));
      if (textareas.length === 0) found.push("no textarea found — the guard has nothing to measure");

      for (const textarea of textareas) {
        const style = getComputedStyle(textarea);
        const rect = textarea.getBoundingClientRect();
        const paddingLeft = Number.parseFloat(style.paddingLeft || "0");
        const origin = rect.left + paddingLeft;
        const label = textarea.getAttribute("aria-label") ?? textarea.className.slice(0, 40);

        const gutterElement = textarea.previousElementSibling as HTMLElement | null;
        if (!gutterElement) {
          found.push(`${label}: no gutter element precedes the field`);
          continue;
        }
        const gutter = gutterElement.getBoundingClientRect();
        const gutterStyle = getComputedStyle(gutterElement);
        const gutterContentRight = gutter.right - Number.parseFloat(gutterStyle.paddingRight || "0");

        if (rect.left < gutter.right - 1) {
          found.push(
            `${label}: the field box starts at x=${rect.left.toFixed(1)}, left of the gutter's right edge ${gutter.right.toFixed(1)}`,
          );
        }
        if (origin <= gutter.right) {
          found.push(
            `${label}: the text origin x=${origin.toFixed(1)} is not right of the gutter edge ${gutter.right.toFixed(1)} (padding-left ${paddingLeft})`,
          );
        }

        for (const number of Array.from(gutterElement.children)) {
          const numberRect = (number as HTMLElement).getBoundingClientRect();
          if (numberRect.width === 0) continue;
          if (numberRect.right > gutterContentRight + 1) {
            found.push(
              `${label}: a gutter number overruns the gutter (${numberRect.right.toFixed(1)} > ${gutterContentRight.toFixed(1)})`,
            );
            break;
          }
        }
      }

      return { found, count: textareas.length };
    });

    expect(violations.found, `${path}: ${violations.found.join("; ")}`).toEqual([]);
    // A page that silently lost its IDE field would pass vacuously; prove the guard measured something.
    expect(violations.count, `${path} should carry at least one IDE field`).toBeGreaterThan(0);
  });

  test(`no text run collides with another on ${path}`, async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 900 });
    await page.goto(path);
    await setup(page);

    const report = await page.evaluate(() => {
      const clipped = (element: Element | null): boolean => {
        for (let el = element as HTMLElement | null; el; el = el.parentElement) {
          if (el.tagName === "HTML" || el.tagName === "BODY") continue;
          const style = getComputedStyle(el);
          if (/(auto|scroll)/.test(style.overflowX + style.overflowY)) return true;
          if (/hidden|clip/.test(style.overflowX) && el.scrollWidth > el.clientWidth + 2) return true;
        }
        return false;
      };

      const rects: { label: string; rect: DOMRect }[] = [];
      const textWalker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
      for (let node = textWalker.nextNode(); node; node = textWalker.nextNode()) {
        const text = (node.textContent ?? "").trim();
        if (!text || clipped(node.parentElement)) continue;
        const range = document.createRange();
        range.selectNodeContents(node);
        for (const rect of Array.from(range.getClientRects())) {
          if (rect.width < 2 || rect.height < 2) continue;
          rects.push({ label: text.slice(0, 40), rect });
        }
      }

      const collisions: string[] = [];
      const seen = new Set<string>();
      for (let i = 0; i < rects.length; i++) {
        for (let j = i + 1; j < rects.length; j++) {
          const a = rects[i].rect;
          const b = rects[j].rect;
          const overlapX = Math.min(a.right, b.right) - Math.max(a.left, b.left);
          const overlapY = Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top);
          if (overlapX > 3 && overlapY > 3) {
            const key = [rects[i].label, rects[j].label].sort().join("∩");
            if (seen.has(key)) continue;
            seen.add(key);
            collisions.push(
              `"${rects[i].label}" ∩ "${rects[j].label}" = ${overlapX.toFixed(1)}x${overlapY.toFixed(1)}px`,
            );
          }
        }
      }
      return { collisions, textRuns: rects.length };
    });

    expect(report.collisions, `${path}: ${report.collisions.join("; ")}`).toEqual([]);
    // Vacuity guard: a page whose text stopped being measurable must fail, not pass silently.
    expect(report.textRuns, `${path} produced no measurable text runs`).toBeGreaterThan(50);
  });
}
