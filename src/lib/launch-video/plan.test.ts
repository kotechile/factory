// src/lib/launch-video/plan.test.ts
import { describe, expect, it } from "vitest";
import { selectPendingProducts, type LedgerRow, type ProductLite } from "./plan";

const p = (slug: string, extra: Partial<ProductLite> = {}): ProductLite => ({
  slug, name: slug, status: "live", launchedAt: "2026-10-09", ...extra,
});

describe("selectPendingProducts", () => {
  it("selects a live public product with no ledger row", () => {
    expect(selectPendingProducts([p("spendproof")], []).map((x) => x.slug)).toEqual(["spendproof"]);
  });

  it("skips killed and internal products", () => {
    const rows: LedgerRow[] = [];
    const got = selectPendingProducts(
      [p("quarterline", { status: "killed" }), p("secret", { visibility: "internal" }), p("ok")],
      rows,
    );
    expect(got.map((x) => x.slug)).toEqual(["ok"]);
  });

  it("skips grandfathered and uploaded rows", () => {
    const got = selectPendingProducts(
      [p("caseproof"), p("ledgerlink")],
      [{ slug: "caseproof", status: "grandfathered", attempts: 0 },
       { slug: "ledgerlink", status: "uploaded", attempts: 1 }],
    );
    expect(got).toEqual([]);
  });

  it("retries a failed row until attempts reach the cap", () => {
    const failed: LedgerRow = { slug: "spendproof", status: "failed", attempts: 2 };
    expect(selectPendingProducts([p("spendproof")], [failed]).map((x) => x.slug)).toEqual(["spendproof"]);
    expect(selectPendingProducts([p("spendproof")], [{ ...failed, attempts: 3 }])).toEqual([]);
  });

  it("retries a row left mid-pipeline by a crashed run", () => {
    expect(
      selectPendingProducts([p("spendproof")], [{ slug: "spendproof", status: "rendering", attempts: 1 }]),
    ).toHaveLength(1);
  });

  it("returns products oldest-launched-first, deterministically", () => {
    const got = selectPendingProducts(
      [p("b", { launchedAt: "2026-10-09" }), p("a", { launchedAt: "2026-09-01" })],
      [],
    );
    expect(got.map((x) => x.slug)).toEqual(["a", "b"]);
  });
});
