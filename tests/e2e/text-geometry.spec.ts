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
  {
    path: "/ratchetproof",
    setup: async (page) => {
      await page.getByRole("button", { name: "Run the audit" }).click();
      await page.getByText("AUDIT COMPLETE").waitFor();
    },
  },
];

for (const { path, setup } of PRODUCTS) {
  for (const width of [1280, 375]) {
    test(`the IDE chrome keeps its zero-egress badge clear of the file title at ${width}px on ${path}`, async ({
      page,
    }) => {
      await page.setViewportSize({ width, height: 900 });
      await page.goto(path);

      // Measured on BOXES, not text runs, and deliberately NOT skipped when clipped: the defect this
      // guards (2026-10-18, still open on 10-19) is a `truncate` title whose box ran under the badge —
      // the glyphs were clipped so the text-run guard above passed while the bar painted a collision.
      const report = await page.evaluate(() => {
        const found: string[] = [];
        let measured = 0;
        const badges = Array.from(document.querySelectorAll("span")).filter(
          (span) => span.querySelector("svg") && /ZERO EGRESS/i.test(span.textContent ?? ""),
        );

        for (const badge of badges) {
          const bar = badge.parentElement?.parentElement;
          const title = bar?.querySelector("span.truncate") as HTMLElement | null;
          if (!bar || !title) continue;
          measured += 1;
          const t = title.getBoundingClientRect();
          const b = badge.getBoundingClientRect();
          const barRect = bar.getBoundingClientRect();

          const overlapX = Math.min(t.right, b.right) - Math.max(t.left, b.left);
          const overlapY = Math.min(t.bottom, b.bottom) - Math.max(t.top, b.top);
          if (overlapX > 1 && overlapY > 1) {
            found.push(
              `"${(title.textContent ?? "").slice(0, 30)}" overlaps the badge by ${overlapX.toFixed(1)}x${overlapY.toFixed(1)}px`,
            );
          } else if (overlapY > 0 && b.left - t.right < 8) {
            found.push(`only ${(b.left - t.right).toFixed(1)}px between the title and the badge (floor is 8)`);
          }
          if (badge.scrollWidth > badge.clientWidth + 1) {
            found.push(`the badge text is clipped (${badge.scrollWidth} > ${badge.clientWidth})`);
          }
          if (bar.scrollWidth > bar.clientWidth + 1) {
            found.push(`the chrome bar overflows its box (${bar.scrollWidth} > ${bar.clientWidth})`);
          }
          if (b.right > barRect.right + 1 || b.left < barRect.left - 1) {
            found.push(`the badge sits outside the bar (${b.left.toFixed(1)}–${b.right.toFixed(1)} vs ${barRect.left.toFixed(1)}–${barRect.right.toFixed(1)})`);
          }
        }
        return { found, measured };
      });

      expect(report.found, `${path} @${width}px: ${report.found.join("; ")}`).toEqual([]);
      // Some chrome bar must have been measured, or this passes vacuously.
      expect(report.measured, `${path} @${width}px should carry a zero-egress chrome bar`).toBeGreaterThan(0);
    });
  }

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

        // A wrapping field breaks the gutter's contract: it numbers ONE logical line each, so every
        // wrapped row paints text with no number and shifts later numbers off their lines. That is
        // what the reviewer reads as "text overlaps line numbers" (caseproof-qa-2, 2026-10-18), and
        // geometry decides it here instead of a model's read of a screenshot.
        if (style.whiteSpace === "pre-wrap" || style.whiteSpace === "pre-line") {
          found.push(
            `${label}: the field soft-wraps (white-space: ${style.whiteSpace}) — long lines must scroll, not wrap, or the gutter numbers stop matching their lines`,
          );
        }

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
