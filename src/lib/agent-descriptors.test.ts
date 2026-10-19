import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import path from "node:path";
import ts from "typescript";
import { describe, expect, it } from "vitest";

import { retiredProducts } from "@/products/registry";

/**
 * Drift guard for the machine-readable descriptors we PUBLISH at `/.well-known/`.
 *
 * Those files are read by agents and crawlers that never see the site's UI, so a retired product
 * named there keeps being called long after the registry flipped it to `killed`. That is exactly
 * what happened to the legacy plugin descriptor: QuarterLine was retired in September, and
 * `/.well-known/ai-plugin.json` still advertised it (plus an `openapi.json` URL that answered 404)
 * until the owner's "retire quarterline pages" call in October. Nothing in the build could see it —
 * the route compiled and served fine, and the manifest guard only covered `mcp.json`.
 *
 * So this test reads every descriptor route's SOURCE and fails when it names a retired product or
 * one of its tools. Only string-ish code is visited (via the TypeScript AST), so a comment may keep
 * the history while shipping copy may not — the same split `no-hardcoded-origin.test.ts` uses.
 *
 * Adding a descriptor is fine; advertising a retired entry in it is what fails.
 */

const ROOT = process.cwd();
const DESCRIPTOR_ROOTS = [path.join("src", "app", ".well-known"), path.join("public", ".well-known")];

/** Retired identifiers, assembled from the registry rather than typed in — a flip is enough. */
function retiredNeedles(): string[] {
  const needles: string[] = [];
  for (const product of retiredProducts) {
    needles.push(product.slug, product.name, ...product.webmcpTools);
  }
  return needles;
}

/** Every descriptor file under the well-known roots (route handlers and any static leftovers). */
function descriptorFiles(): string[] {
  const files: string[] = [];
  const walk = (dir: string): void => {
    let entries: string[];
    try {
      entries = readdirSync(dir);
    } catch {
      return; // the directory does not exist — not a defect on its own
    }
    for (const entry of entries) {
      const full = path.join(dir, entry);
      if (statSync(full).isDirectory()) walk(full);
      else if (/\.(ts|tsx|js|mjs|json)$/.test(entry)) files.push(full);
    }
  };
  for (const root of DESCRIPTOR_ROOTS) walk(path.join(ROOT, root));
  return files;
}

/** String literals, template spans and JSX text — the copy that actually ships. Comments excluded. */
function shippedFragments(fileName: string, source: string): { text: string; line: number }[] {
  const sourceFile = ts.createSourceFile(fileName, source, ts.ScriptTarget.Latest, true);
  const fragments: { text: string; line: number }[] = [];
  const visit = (node: ts.Node): void => {
    const stringish =
      ts.isStringLiteral(node) ||
      ts.isNoSubstitutionTemplateLiteral(node) ||
      ts.isTemplateHead(node) ||
      ts.isTemplateMiddle(node) ||
      ts.isTemplateTail(node) ||
      ts.isJsxText(node);
    if (stringish) {
      fragments.push({
        text: node.getText(sourceFile),
        line: sourceFile.getLineAndCharacterOfPosition(node.getStart(sourceFile)).line + 1,
      });
    }
    ts.forEachChild(node, visit);
  };
  visit(sourceFile);
  return fragments;
}

/** The first retired identifier a shipped fragment names, or null. Pure, so the guard can be proven. */
export function retiredNameIn(fragment: string, needles: string[] = retiredNeedles()): string | null {
  const haystack = fragment.toLowerCase();
  return needles.find((needle) => needle && haystack.includes(needle.toLowerCase())) ?? null;
}

describe("published /.well-known descriptors", () => {
  it("keeps the guard's own inputs real", () => {
    // A vacuous guard reads exactly like a green one: prove there is something to scan and that the
    // registry actually has a retired entry to look for.
    expect(descriptorFiles().length).toBeGreaterThan(0);
    expect(retiredNeedles()).toContain("quarterline");
  });

  it("names no retired product, slug or tool in any shipped descriptor", () => {
    const needles = retiredNeedles();
    const offences: string[] = [];

    for (const file of descriptorFiles()) {
      const relative = path.relative(ROOT, file);
      const source = readFileSync(file, "utf8");
      const fragments = /\.(ts|tsx|js|mjs)$/.test(file)
        ? shippedFragments(file, source)
        : [{ text: source, line: 0 }];
      for (const fragment of fragments) {
        const hit = retiredNameIn(fragment.text, needles);
        if (hit) offences.push(`${relative}:${fragment.line} advertises retired '${hit}'`);
      }
    }

    expect(offences, offences.join("\n")).toEqual([]);
  });

  it("serves the mcp.json descriptor from the inventory, not from a literal", () => {
    // The surviving descriptor must read the registry: a route that inlines its own product list
    // drifts the moment an entry is retired, which is the class above.
    const route = readFileSync(
      path.join(ROOT, "src", "app", ".well-known", "mcp.json", "route.ts"),
      "utf8",
    );
    expect(route).toContain("serializeMcpManifest");
  });

  it("does not resurrect the retired legacy plugin descriptor", () => {
    // Owner call 2026-10-19 ("@Simon retire quarterline pages"): the descriptor advertised one killed
    // product and an OpenAPI URL that answered 404, so it was deleted rather than rewritten. If a
    // plugin descriptor ever returns it must describe the INVENTORY — the tests above hold that line;
    // this one records that the old single-product surface is gone.
    const legacy = path.join(ROOT, "src", "app", ".well-known", "ai-plugin.json");
    expect(
      existsSync(legacy),
      "the legacy ai-plugin.json descriptor was retired by the owner on 2026-10-19 — re-mounting it " +
        "re-advertises a killed product and a 404 OpenAPI URL",
    ).toBe(false);
  });
});
