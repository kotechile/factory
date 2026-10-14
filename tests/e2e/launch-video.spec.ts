// tests/e2e/launch-video.spec.ts
import { expect, test } from "@playwright/test";
import { LAUNCH_VIDEOS, launchVideoWatchUrl } from "../../src/products/launch-videos";

/**
 * The launch-video section, both halves of its contract.
 *
 * BEFORE play: the page shows our own poster and a play control, and reaches NO third party — that
 * is the point of the click-to-load facade (no Google scripts on a page view, and no third-party
 * frame for the WCAG scan to trip over).
 *
 * AFTER play: the registry's video is embedded, titled, on the privacy-enhanced host, with the
 * matching watch link. Nothing asserted the embed existed at all before this spec: an unknown or
 * stale slug makes the component render nothing, and the whole gate stayed green behind it.
 */
const THIRD_PARTY = /youtube|ytimg|googlevideo|googleapis|doubleclick|gstatic/;

for (const video of LAUNCH_VIDEOS) {
  test(`${video.slug} loads nothing from a third party until the viewer plays`, async ({ page }) => {
    const external: string[] = [];
    page.on("request", (request) => {
      if (THIRD_PARTY.test(request.url())) external.push(request.url());
    });

    await page.goto(`/${video.slug}`);

    // Our poster, our origin — not a YouTube thumbnail URL.
    await expect(page.locator(`img[src="${video.posterPath}"]`)).toBeVisible();
    // The play control carries a visible name (axe decides on the accessible name).
    const play = page.getByRole("button", { name: /^play /i });
    await expect(play).toBeVisible();
    await expect(page.locator('iframe[src*="youtube"]')).toHaveCount(0);

    expect(external, `third-party requests before play: ${external.join(", ")}`).toEqual([]);

    await play.click();

    const frame = page.locator('iframe[src*="youtube-nocookie.com/embed/"]');
    await expect(frame).toHaveCount(1);
    await expect(frame).toHaveAttribute("title", /\S{10,}/);
    await expect(frame).toHaveAttribute("src", new RegExp(video.youtubeId));

    await expect(page.getByRole("link", { name: "Watch on YouTube" })).toHaveAttribute(
      "href",
      launchVideoWatchUrl(video),
    );
  });
}
