// src/lib/launch-video/plan.ts
export interface ProductLite {
  slug: string;
  name: string;
  status: "live" | "beta" | "killed";
  launchedAt: string;
  visibility?: "public" | "internal";
}

export interface LedgerRow {
  slug: string;
  status: "pending" | "rendering" | "rendered" | "voiced" | "uploaded" | "failed" | "grandfathered";
  attempts: number;
}

/** Statuses that mean "done, never touch again". Everything else is retryable under the cap. */
const TERMINAL: ReadonlySet<LedgerRow["status"]> = new Set(["uploaded", "grandfathered"]);

export function selectPendingProducts(
  products: ProductLite[],
  rows: LedgerRow[],
  opts: { maxAttempts?: number } = {},
): ProductLite[] {
  const maxAttempts = opts.maxAttempts ?? 3;
  const bySlug = new Map(rows.map((r) => [r.slug, r]));
  return products
    .filter((product) => {
      if (product.status !== "live") return false;
      if (product.visibility === "internal") return false;
      const row = bySlug.get(product.slug);
      if (!row) return true;
      if (TERMINAL.has(row.status)) return false;
      return row.attempts < maxAttempts;
    })
    .sort((a, b) => a.launchedAt.localeCompare(b.launchedAt) || a.slug.localeCompare(b.slug));
}

export interface UploadedRow extends LedgerRow {
  readonly youtubeVideoId: string | null;
}

export interface EmbedPending {
  readonly slug: string;
  readonly youtubeVideoId: string;
}

/**
 * Products whose video is uploaded but which the site does not carry yet.
 *
 * This is the recovery path for the embed step: the upload is terminal (a retry would post a second
 * video), so a failed embed must not look like a failed launch. It is reported separately, and the
 * worker re-runs only the embed — cheap, idempotent, and no re-render.
 */
export function selectEmbedPending(
  products: ProductLite[],
  rows: UploadedRow[],
  embedded: string[],
): EmbedPending[] {
  const bySlug = new Map(products.map((product) => [product.slug, product]));
  const present = new Set(embedded);
  return rows
    .filter((row) => row.status === "uploaded" && !!row.youtubeVideoId && !present.has(row.slug))
    .filter((row) => {
      const product = bySlug.get(row.slug);
      // A retired or internal product keeps its video but must not gain a new embed.
      return !!product && product.status === "live" && product.visibility !== "internal";
    })
    .sort((a, b) => a.slug.localeCompare(b.slug))
    .map((row) => ({ slug: row.slug, youtubeVideoId: row.youtubeVideoId as string }));
}
