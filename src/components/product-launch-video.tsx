"use client";

// src/components/product-launch-video.tsx
import { useState } from "react";
import { Play } from "lucide-react";
import { launchVideoEmbedUrl, launchVideoFor, launchVideoWatchUrl } from "@/products/launch-videos";

/**
 * The product's launch video, click-to-load.
 *
 * The page ships a poster served from our own origin and a play control; the YouTube iframe is
 * mounted only once a viewer presses play. The earlier version embedded the player unconditionally,
 * which had two costs: every page view fetched Google's scripts and set up the player nobody had
 * asked for, and — because Playwright injects axe into every frame it can reach — YouTube's own
 * markup was pulled into our WCAG audit (its `ytm*` chrome fails `button-name` and
 * `aria-prohibited-attr`), so the product pages went red for a document we do not own.
 *
 * With the facade, a page view makes NO third-party request at all until the viewer chooses to play;
 * `tests/e2e/launch-video.spec.ts` asserts both halves (nothing external before the click, the
 * registry's video embedded after it), and the poster file is guarded by
 * `src/products/launch-videos.test.ts`.
 *
 * Renders NOTHING when the product has no published video — a page must never carry a dead player.
 */
export function ProductLaunchVideo({
  slug,
  heading = "Watch the launch video",
}: {
  slug: string;
  heading?: string;
}) {
  const [playing, setPlaying] = useState(false);
  const video = launchVideoFor(slug);
  if (!video) return null;

  const headingId = `launch-video-${slug}`;

  return (
    <section aria-labelledby={headingId} className="space-y-3">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 id={headingId} className="text-base font-semibold text-foreground">
          {heading}
        </h2>
        <span className="font-mono text-[11px] text-subtle">
          {video.durationSeconds}s · nothing estimated · no signup
        </span>
      </div>

      <div className="overflow-hidden rounded border border-border bg-card">
        <div className="relative aspect-video w-full">
          {playing ? (
            <iframe
              src={`${launchVideoEmbedUrl(video)}?autoplay=1`}
              title={video.title}
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
              allowFullScreen
              className="absolute inset-0 h-full w-full border-0"
            />
          ) : (
            <button
              type="button"
              onClick={() => setPlaying(true)}
              className="group absolute inset-0 h-full w-full cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
            >
              {/* Decorative: the button's own text carries the accessible name. */}
              <img
                src={video.posterPath}
                alt=""
                width={1280}
                height={720}
                loading="lazy"
                className="absolute inset-0 h-full w-full object-cover"
              />
              <span className="absolute inset-0 transition-colors group-hover:bg-foreground/10" />
              <span className="absolute bottom-4 left-4 flex items-center gap-2 rounded-full bg-foreground/90 px-5 py-2.5 text-sm font-semibold text-card">
                <Play className="h-4 w-4" aria-hidden="true" />
                <span>Play {video.durationSeconds}s</span>
              </span>
            </button>
          )}
        </div>
      </div>

      <p className="text-xs text-muted">
        {video.title}{" "}
        <a
          href={launchVideoWatchUrl(video)}
          target="_blank"
          rel="noreferrer"
          className="underline underline-offset-2 hover:text-foreground"
        >
          Watch on YouTube
        </a>
      </p>
    </section>
  );
}
