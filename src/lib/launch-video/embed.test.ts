// src/lib/launch-video/embed.test.ts
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  accessibleName,
  embeddedIdFor,
  embeddedSlugs,
  insertEntry,
  isUsablePoster,
  isoDate,
  parseIsoDuration,
  REGISTRY_ARRAY_MARKER,
  renderEntry,
  replaceEntry,
  verifyVideoResource,
} from "./embed";

const REGISTRY = join(process.cwd(), "src", "products", "launch-videos.ts");

describe("parseIsoDuration", () => {
  it("reads the shapes YouTube actually returns", () => {
    expect(parseIsoDuration("PT23S")).toBe(23);
    expect(parseIsoDuration("PT1M23S")).toBe(83);
    expect(parseIsoDuration("PT1H2M3S")).toBe(3723);
  });

  it("rounds a fractional runtime up — a 22.4s video is not a 22s video", () => {
    expect(parseIsoDuration("PT22.4S")).toBe(23);
  });

  it("refuses a duration it cannot trust", () => {
    expect(() => parseIsoDuration("23")).toThrowError(/ISO-8601/);
    expect(() => parseIsoDuration("PT0S")).toThrowError(/not positive/);
    expect(() => parseIsoDuration("PT0M0S")).toThrowError(/not positive/);
  });
});

describe("verifyVideoResource", () => {
  const done = {
    items: [{
      id: "qeow4cdaiv8",
      snippet: { title: "Introducing SpendProof: AI provider invoice reconciliation." },
      contentDetails: { duration: "PT23S" },
      status: { uploadStatus: "processed", privacyStatus: "public" },
    }],
  };

  it("accepts a processed, playable upload", () => {
    expect(verifyVideoResource(done, "qeow4cdaiv8")).toEqual({
      youtubeId: "qeow4cdaiv8",
      title: "Introducing SpendProof: AI provider invoice reconciliation.",
      durationSeconds: 23,
      privacyStatus: "public",
    });
  });

  it("refuses a private video instead of embedding a dead player", () => {
    const priv = {
      items: [{ ...done.items[0], status: { uploadStatus: "processed", privacyStatus: "private" } }],
    };
    expect(() => verifyVideoResource(priv, "qeow4cdaiv8")).toThrowError(/private/);
  });

  it("refuses an upload YouTube has not finished processing", () => {
    const processing = {
      items: [{ ...done.items[0], status: { uploadStatus: "uploaded", privacyStatus: "public" } }],
    };
    expect(() => verifyVideoResource(processing, "qeow4cdaiv8")).toThrowError(/has not finished processing|uploadStatus/);
  });

  it("refuses an id the API does not return", () => {
    expect(() => verifyVideoResource({ items: [] }, "qeow4cdaiv8")).toThrowError(/no video/);
  });

  it("refuses to invent a runtime or a title", () => {
    const noDuration = { items: [{ ...done.items[0], contentDetails: {} }] };
    expect(() => verifyVideoResource(noDuration, "qeow4cdaiv8")).toThrowError(/contentDetails.duration/);
    const noTitle = { items: [{ ...done.items[0], snippet: {} }] };
    expect(() => verifyVideoResource(noTitle, "qeow4cdaiv8")).toThrowError(/snippet.title/);
  });
});

describe("accessibleName", () => {
  it("keeps a descriptive upload title", () => {
    expect(
      accessibleName({
        youtubeTitle: "Introducing LedgerLink: Stripe payout → GL reconciliation.",
        productName: "LedgerLink",
        tagline: "Stripe Payout → GL Reconciliation Engine",
      }),
    ).toBe("Introducing LedgerLink: Stripe payout → GL reconciliation.");
  });

  it("falls back to the product's own tagline when the title is just the name", () => {
    // the hand-published uploads are titled "SpendProof", which names nothing
    expect(
      accessibleName({ youtubeTitle: "SpendProof", productName: "SpendProof", tagline: "AI Invoice Reconciliation." }),
    ).toBe("Introducing SpendProof: AI Invoice Reconciliation");
  });

  it("still produces a name when the product has no tagline", () => {
    expect(accessibleName({ youtubeTitle: "CaseProof", productName: "CaseProof", tagline: "" })).toBe(
      "Introducing CaseProof",
    );
  });
});

describe("renderEntry", () => {
  it("formats an entry exactly like the hand-written ones", () => {
    expect(
      renderEntry({
        slug: "ratchetproof",
        youtubeId: "abcDEF12345",
        title: "Introducing RatchetProof",
        durationSeconds: 25,
        publishedAt: "2026-10-24",
      }),
    ).toBe(
      [
        "  {",
        '    slug: "ratchetproof",',
        '    youtubeId: "abcDEF12345",',
        '    posterPath: "/launch-videos/ratchetproof.jpg",',
        '    title: "Introducing RatchetProof",',
        "    durationSeconds: 25,",
        '    publishedAt: "2026-10-24",',
        "  },",
      ].join("\n"),
    );
  });

  it("escapes a quote rather than producing a file that will not parse", () => {
    const text = renderEntry({
      slug: "caseproof",
      youtubeId: "MiNmsr1i9Lo",
      title: 'The "before you sign" run',
      durationSeconds: 23,
      publishedAt: "2026-10-24",
    });
    expect(text).toContain('title: "The \\"before you sign\\" run",');
  });

  it("refuses an id or slug that would break the page", () => {
    const base = { slug: "x", youtubeId: "MiNmsr1i9Lo", title: "t", durationSeconds: 20, publishedAt: "2026-10-24" };
    expect(() => renderEntry({ ...base, slug: "Not A Slug" })).toThrowError(/product slug/);
    expect(() => renderEntry({ ...base, youtubeId: "short" })).toThrowError(/11-character/);
    expect(() => renderEntry({ ...base, durationSeconds: 0 })).toThrowError(/runtime/);
    expect(() => renderEntry({ ...base, publishedAt: "24/10/2026" })).toThrowError(/YYYY-MM-DD/);
  });
});

describe("insertEntry", () => {
  const entry = {
    slug: "ratchetproof",
    youtubeId: "abcDEF12345",
    title: "Introducing RatchetProof",
    durationSeconds: 25,
    publishedAt: "2026-10-24",
  } as const;

  it("adds the new slug at the top of the real registry without disturbing the rest", () => {
    const source = readFileSync(REGISTRY, "utf8");
    const before = embeddedSlugs(source);
    const next = insertEntry(source, entry);
    const after = embeddedSlugs(next);

    expect(after[0]).toBe("ratchetproof");
    expect(after.slice(1)).toEqual(before);
    expect(next.startsWith(source.slice(0, source.indexOf(REGISTRY_ARRAY_MARKER)))).toBe(true);
    // inserted as the array's first element, and the array still closes
    expect(next).toContain(`${REGISTRY_ARRAY_MARKER}\n  {\n    slug: "ratchetproof",`);
    expect(next).toContain("];");
    expect(next.length).toBe(source.length + renderEntry(entry).length + 1);
  });

  it("refuses to repoint a slug that is already published", () => {
    const source = readFileSync(REGISTRY, "utf8");
    expect(() => insertEntry(source, { ...entry, slug: "spendproof" })).toThrowError(/already embedded/);
  });

  it("fails loudly when the array moved", () => {
    expect(() => insertEntry("export const NOPE = [];", entry)).toThrowError(/no longer declares/);
  });
});

describe("poster guards", () => {
  it("treats anything under 1280×720 as unusable — YouTube serves a placeholder, not an error", () => {
    expect(isUsablePoster(120, 90)).toBe(false);
    expect(isUsablePoster(640, 480)).toBe(false);
    expect(isUsablePoster(1280, 720)).toBe(true);
    expect(isUsablePoster(1920, 1080)).toBe(true);
  });

  it("dates entries in the form the test pins", () => {
    expect(isoDate(new Date("2026-10-24T18:30:00Z"))).toBe("2026-10-24");
  });
});

describe("replaceEntry", () => {
  const next = {
    slug: "spendproof",
    youtubeId: "f9xr2ILpUEg",
    title: "Introducing SpendProof: AI provider invoice reconciliation.",
    durationSeconds: 22,
    publishedAt: "2026-10-24",
  } as const;

  it("repoints only that entry, and leaves every other entry byte-identical", () => {
    const source = readFileSync(REGISTRY, "utf8");
    const out = replaceEntry(source, next);
    expect(embeddedIdFor(out, "spendproof")).toBe("f9xr2ILpUEg");
    expect(embeddedIdFor(out, "ledgerlink")).toBe(embeddedIdFor(source, "ledgerlink"));
    // exactly the same number of entries, and the old id is gone
    expect(embeddedSlugs(out)).toEqual(embeddedSlugs(source));
    expect(out).not.toContain("qeow4cdaiv8");
    // the other three fields moved too
    expect(out).toContain("durationSeconds: 22,");
    expect(out).toContain('publishedAt: "2026-10-24",');
  });

  it("keeps the slug and poster path untouched", () => {
    const out = replaceEntry(readFileSync(REGISTRY, "utf8"), next);
    expect(out).toContain('posterPath: "/launch-videos/spendproof.jpg",');
  });

  it("refuses a slug that is not embedded yet, and a malformed entry", () => {
    const source = readFileSync(REGISTRY, "utf8");
    expect(() => replaceEntry(source, { ...next, slug: "ratchetproof" })).toThrowError(/not embedded yet/);
    expect(() => replaceEntry(source, { ...next, youtubeId: "short" })).toThrowError(/11-character/);
  });

  it("reads the published id back for the superseded record", () => {
    const source = readFileSync(REGISTRY, "utf8");
    expect(embeddedIdFor(source, "spendproof")).toMatch(/^[A-Za-z0-9_-]{11}$/);
    expect(embeddedIdFor(source, "not-a-product")).toBeUndefined();
  });
});
