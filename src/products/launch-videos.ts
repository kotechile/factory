/**
 * Launch videos, by product slug — the single source of truth the app pages read.
 *
 * The video is produced and published by the launch-video pipeline (`skills/launch_video.md`). Each
 * entry is a PUBLISHED YouTube id, never a local file: `public/` carries no media hosting and a push
 * to main auto-deploys, so a ~33 MB master per product would bloat every deploy — and the video is
 * the thing the pipeline actually ships, so the page should point at the shipped artifact.
 *
 * Add an entry ONLY after the upload has been read back from the YouTube API (see the SOP's step 7).
 * A product with no entry renders no video rather than a broken embed, so a half-finished run can
 * never put a dead player on a live page.
 *
 * Ownership of the ids is external: the videos above are published by hand on the product channel, so
 * an entry is corrected by re-reading the four ids the owner supplied rather than by re-running the
 * upload. The pipeline's own per-slug `content/launch_videos/<slug>/youtube.json` records what
 * `youtube-upload.mjs` uploaded and is NOT rewritten here — if the two disagree, this file is what
 * the pages render and `youtube.json` is history.
 *
 * Posters in `public/launch-videos/` are 1280x720 JPEGs of each video's own opening frame, fetched
 * from YouTube's thumbnail service (`maxresdefault`) and re-encoded locally. FacturGate is the
 * exception: YouTube holds no 1280x720 thumbnail for that upload — its `snippet.thumbnails` stop at
 * `standard` (640x480) even though the source file is 1920x1080 @30fps like the others — so its
 * poster is a crisp 1280x720 re-render of THAT VIDEO'S OWN opening slide (same eyebrow, headline,
 * palette, grid and horizon stripe, set as live text rather than a 2x upscale of a 640px frame).
 * Upgrade it to the real `maxresdefault` if YouTube ever generates one.
 */

export interface LaunchVideo {
  readonly slug: string;
  /** The published YouTube video id. */
  readonly youtubeId: string;
  /**
   * The poster the page shows before play, as a public path (`/launch-videos/<slug>.jpg`, 1280x720).
   * Served from OUR origin on purpose: the embed is click-to-load, so a page view must not reach a
   * third party at all until the viewer presses play — a YouTube thumbnail URL here would defeat
   * that. `launch-videos.test.ts` fails the build when the file is missing.
   */
  readonly posterPath: string;
  /**
   * The embed's accessible name: the video's own YouTube title where that is descriptive, otherwise a
   * one-line description of the video. The hand-published uploads are titled with the product name
   * alone (`"SpendProof"`), which is not a usable accessible name for an iframe, so they carry a
   * description here.
   */
  readonly title: string;
  /** Runtime in whole seconds, as YouTube reports it in `PT…S`. */
  readonly durationSeconds: number;
  /** ISO date the upload was verified against the YouTube API. */
  readonly publishedAt: string;
}

export const LAUNCH_VIDEOS: readonly LaunchVideo[] = [
  {
    slug: "spendproof",
    youtubeId: "f9xr2ILpUEg",
    posterPath: "/launch-videos/spendproof.jpg",
    title: "Introducing SpendProof: AI provider invoice ↔ tagged-usage reconciliation.",
    durationSeconds: 23,
    publishedAt: "2026-10-24",
  },
  {
    slug: "ledgerlink",
    youtubeId: "Ski_feMOWuc",
    posterPath: "/launch-videos/ledgerlink.jpg",
    title: "Introducing LedgerLink: one Stripe payout → 344 GL journal lines, reconciled to the penny.",
    durationSeconds: 23,
    publishedAt: "2026-10-25",
  },
  {
    slug: "facturgate",
    youtubeId: "jAiN_tmlj7Y",
    posterPath: "/launch-videos/facturgate.jpg",
    title: "Introducing FacturGate: the deterministic EN 16931 + CIUS-FR pre-send gate for EU e-invoices",
    durationSeconds: 24,
    publishedAt: "2026-10-25",
  },
  {
    slug: "parcelproof",
    youtubeId: "pVItC4gjXJc",
    posterPath: "/launch-videos/parcelproof.jpg",
    title: "Introducing ParcelProof: carrier invoice DIM-weight and surcharge audit for UPS, FedEx and USPS.",
    durationSeconds: 23,
    publishedAt: "2026-10-24",
  },
  {
    slug: "caseproof",
    youtubeId: "Zh13_ukGDiM",
    posterPath: "/launch-videos/caseproof.jpg",
    title: "Introducing CaseProof: re-run the vendor's own warehouse-automation numbers.",
    durationSeconds: 23,
    publishedAt: "2026-10-25",
  },
];

export function launchVideoFor(slug: string): LaunchVideo | undefined {
  return LAUNCH_VIDEOS.find((video) => video.slug === slug);
}

/**
 * The privacy-enhanced host: youtube-nocookie sets no cookies until the viewer actually presses play,
 * so a page that merely displays the embed does not hand Google a tracking cookie.
 */
export function launchVideoEmbedUrl(video: LaunchVideo): string {
  return `https://www.youtube-nocookie.com/embed/${video.youtubeId}`;
}

export function launchVideoWatchUrl(video: LaunchVideo): string {
  return `https://youtu.be/${video.youtubeId}`;
}
