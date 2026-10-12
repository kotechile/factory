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
