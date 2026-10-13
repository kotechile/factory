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
 */

export interface LaunchVideo {
  readonly slug: string;
  /** The published YouTube video id. */
  readonly youtubeId: string;
  /** The video's own title, used as the embed's accessible name. */
  readonly title: string;
  /** Runtime in whole seconds, as YouTube reports it in `PT…S`. */
  readonly durationSeconds: number;
  /** ISO date the upload was verified against the YouTube API. */
  readonly publishedAt: string;
}

export const LAUNCH_VIDEOS: readonly LaunchVideo[] = [
  {
    slug: "spendproof",
    youtubeId: "LdSoKLTfYjs",
    title: "Introducing SpendProof: AI provider invoice ↔ tagged-usage reconciliation.",
    durationSeconds: 22,
    publishedAt: "2026-10-13",
  },
  {
    slug: "ledgerlink",
    youtubeId: "JcP9RtWZZrg",
    title: "Introducing LedgerLink: Stripe payout → GL reconciliation. One netted payout of £4,378.21",
    durationSeconds: 22,
    publishedAt: "2026-10-13",
  },
  {
    slug: "facturgate",
    youtubeId: "V-eli97M0q0",
    title: "Introducing FacturGate: the deterministic EN 16931 + CIUS-FR pre-send gate for EU e-invoices",
    durationSeconds: 22,
    publishedAt: "2026-10-13",
  },
  {
    slug: "parcelproof",
    youtubeId: "4cNR2bt3mMg",
    title: "Introducing ParcelProof: carrier invoice DIM-weight and surcharge audit for UPS, FedEx and USPS.",
    durationSeconds: 22,
    publishedAt: "2026-10-13",
  },
  {
    slug: "caseproof",
    youtubeId: "uodX_D-Gqsw",
    title: "CaseProof re-runs a warehouse-automation vendor's own numbers before you sign.",
    durationSeconds: 21,
    publishedAt: "2026-10-13",
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
