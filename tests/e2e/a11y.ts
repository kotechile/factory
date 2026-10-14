// tests/e2e/a11y.ts
import AxeBuilder from "@axe-core/playwright";
import type { Page } from "@playwright/test";

/**
 * WCAG 2.1 AA scan of OUR markup.
 *
 * Every product page embeds its launch video in a `youtube-nocookie.com` iframe. Playwright injects
 * axe into every frame the browser can reach — cross-origin ones included — so the moment an embed
 * loads a real YouTube player, YouTube's own chrome is audited as part of the page: measured
 * 2026-10-14, `button-name` + `aria-allowed-attr` + `aria-prohibited-attr` (all critical) with the
 * only targets inside `iframe → .ytmVideoInfoChannelAvatar`, i.e. markup we do not own and cannot
 * fix. Verified against HEAD without the video change: the same four pages were red before it.
 *
 * So the FRAME is quarantined, never the rules: our own document is still audited in full and a
 * violation in it still fails. What that costs is the frame element's own attributes
 * (`frame-title`), which is why `tests/e2e/launch-video.spec.ts` asserts separately that our iframe
 * carries an accessible name and points at the registry's video.
 *
 * If the third-party player's accessibility ever matters here, the fix is a click-to-load facade —
 * a product decision (and the only way to stop Google's scripts loading on every page view), not a
 * rule to disable in this file.
 */
export function axeScan(page: Page) {
  return new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
    .exclude("iframe");
}
