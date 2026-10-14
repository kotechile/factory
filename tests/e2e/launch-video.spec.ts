// tests/e2e/launch-video.spec.ts
import { expect, test } from "@playwright/test";
import { LAUNCH_VIDEOS, launchVideoWatchUrl } from "../../src/products/launch-videos";

/**
 * The page must embed the video the registry names, and the iframe must carry an accessible name.
 *
 * `tests/e2e/a11y.ts` quarantines third-party frames from the WCAG scan (YouTube audits its own
 * player chrome through it), which would otherwise leave our own embed unchecked: no spec asserted
 * the video was on the page at all, so a missing, renamed or stale entry could ship unnoticed — the
 * pages simply rendered nothing (the component returns null for an unknown slug) and every gate
 * stayed green. This is that guard.
 */
for (const video of LAUNCH_VIDEOS) {
  test(`${video.slug} embeds its published launch video`, async ({ page }) => {
    await page.goto(`/${video.slug}`);

    const frame = page.locator('iframe[src*="youtube-nocookie.com/embed/"]');
    await expect(frame).toHaveCount(1);
    // The embed's accessible name: a bare frame with no title is a WCAG failure we own.
    await expect(frame).toHaveAttribute("title", /\S{10,}/);
    await expect(frame).toHaveAttribute("src", new RegExp(`${video.youtubeId}$`));
    // The privacy-enhanced host, never a direct youtube.com embed.
    await expect(frame).not.toHaveAttribute("src", /(^|\/\/)www\.youtube\.com/);

    await expect(page.getByRole("link", { name: "Watch on YouTube" })).toHaveAttribute(
      "href",
      launchVideoWatchUrl(video),
    );
  });
}
