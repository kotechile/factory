// tests/e2e/a11y.ts
import AxeBuilder from "@axe-core/playwright";
import type { Page } from "@playwright/test";

/**
 * WCAG 2.1 AA scan of the page, frames included — no exclusions.
 *
 * This file briefly carried an `exclude("iframe")` while the product pages embedded the YouTube
 * player unconditionally: Playwright injects axe into every frame it can reach, cross-origin ones
 * included, so YouTube's own `ytm*` chrome was audited as part of our page and failed it
 * (`button-name`, `aria-prohibited-attr`, all critical — measured 2026-10-14, every target inside
 * `iframe → .ytmVideoInfoChannelAvatar`).
 *
 * That quarantine is gone now because the cause is gone: `product-launch-video.tsx` is click-to-load,
 * so no third-party frame exists at scan time and the scan covers the whole document again. If an
 * embed ever goes back to loading on page load, these specs go red again — which is the correct
 * signal, and the fix is the facade, not an exclusion returned to this file.
 */

export function axeScan(page: Page) {
  return new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"]);
}
