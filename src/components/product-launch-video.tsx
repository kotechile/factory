// src/components/product-launch-video.tsx
import { launchVideoEmbedUrl, launchVideoFor, launchVideoWatchUrl } from "@/products/launch-videos";

/**
 * The product's launch video, embedded from YouTube.
 *
 * Renders NOTHING when the product has no published video — a page must never carry a dead player,
 * and `src/products/launch-videos.ts` only gains an entry once the upload has been read back from the
 * YouTube API. Safe to drop into any product page unconditionally for that reason.
 */
export function ProductLaunchVideo({
  slug,
  heading = "Watch the close happen",
}: {
  slug: string;
  heading?: string;
}) {
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
          <iframe
            src={launchVideoEmbedUrl(video)}
            title={video.title}
            loading="lazy"
            allow="accelerometer; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
            allowFullScreen
            className="absolute inset-0 h-full w-full border-0"
          />
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
