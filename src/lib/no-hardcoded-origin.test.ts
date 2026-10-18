import { readFileSync, readdirSync, statSync } from "node:fs";
import path from "node:path";
import ts from "typescript";
import { describe, expect, it } from "vitest";

/**
 * Drift guard for the deploy's public origin.
 *
 * `src/lib/site-origin.ts` is the only place a host may be decided. The 2026-10-18 defect was not a
 * wrong constant, it was 24 copies of one: the app moved to `apps.aichieve.net` and its sitemap,
 * canonical, agent descriptor and Stripe redirects kept naming the host it had left, which answered
 * 503. Nothing in the tree could see that — a literal compiles, renders and serves.
 *
 * So this test reads the source instead of trusting it: no FILE may carry a literal host of this
 * estate — not in a string, a template span or a JSX text node. Copy that needs the address calls
 * `siteOrigin()` / `siteHost()` / `siteUrl()`.
 *
 * Comments are deliberately out of scope: prose that explains the incident ("the app moved from
 * …") is history worth keeping, and a regex over raw text cannot tell it from a URL that ships.
 * Parsing the file is what makes that distinction — a host in a comment is documentation, a host in
 * a string is a defect.
 *
 * The needles are assembled from fragments on purpose: written whole, this file would fail itself.
 */

const ROOT = process.cwd();
const SCANNED_DIRS = ["src", "public", "tests"];
const CODE_FILE = /\.(ts|tsx|js|mjs|cjs)$/;
const TEXT_FILE = /\.(json|txt|xml|css)$/;

/** Hosts this estate has published the app on (historical ones included — a stale literal is the bug). */
const OWN_HOSTS = ["apps." + "gini" + "loh.com", "apps." + "aich" + "ieve.net", "factory." + "aich" + "ieve.net"];

/** An absolute URL on one of the estate's service hosts, including one invented later. */
const ESTATE_URL = new RegExp(
  "https:" + "//" + "(?:apps|factory|cms|pressflow)\\." + "(?:gini" + "loh\\.com|aich" + "ieve\\.net|wellroost\\.com)",
  "i",
);

/** The offence in one fragment, or null. Pure, so the guard can be proven to bite. */
export function hostLiteralIn(fragment: string): string | null {
  return OWN_HOSTS.find((host) => fragment.includes(host)) ?? ESTATE_URL.exec(fragment)?.[0] ?? null;
}

/**
 * String-ish fragments of a source file: string literals, template spans, JSX text. Comments are
 * not visited, so documentation may name a host while code may not.
 */
function codeFragments(fileName: string, source: string): { text: string; line: number }[] {
  const sourceFile = ts.createSourceFile(fileName, source, ts.ScriptTarget.Latest, true);
  const fragments: { text: string; line: number }[] = [];

  const visit = (node: ts.Node): void => {
    const isStringish =
      ts.isStringLiteral(node) ||
      ts.isNoSubstitutionTemplateLiteral(node) ||
      ts.isTemplateHead(node) ||
      ts.isTemplateMiddle(node) ||
      ts.isTemplateTail(node) ||
      ts.isJsxText(node);
    if (isStringish) {
      const start = sourceFile.getLineAndCharacterOfPosition(node.getStart(sourceFile));
      fragments.push({ text: (node as ts.LiteralLikeNode).text ?? node.getText(sourceFile), line: start.line + 1 });
    }
    ts.forEachChild(node, visit);
  };

  visit(sourceFile);
  return fragments;
}

/** Every offence in one file, as `<line>: <matched fragment>`. */
export function findHostLiterals(fileName: string, source: string): string[] {
  if (CODE_FILE.test(fileName)) {
    return codeFragments(fileName, source).flatMap(({ text, line }) => {
      const hit = hostLiteralIn(text);
      return hit ? [`${line}: ${hit}`] : [];
    });
  }
  return source.split("\n").flatMap((line, index) => {
    const hit = hostLiteralIn(line);
    return hit ? [`${index + 1}: ${hit}`] : [];
  });
}

function filesUnder(dir: string): string[] {
  const found: string[] = [];
  for (const entry of readdirSync(dir)) {
    const full = path.join(dir, entry);
    if (statSync(full).isDirectory()) {
      if (entry === "node_modules" || entry === ".next") continue;
      found.push(...filesUnder(full));
    } else if (CODE_FILE.test(entry) || TEXT_FILE.test(entry)) {
      found.push(full);
    }
  }
  return found;
}

describe("no hardcoded product host", () => {
  it("bites: a host in a string, a template span or JSX text is reported with its line", () => {
    const own = "apps." + "gini" + "loh.com";
    expect(findHostLiterals("x.tsx", `const url = "https://${own}/showcase";`)).toHaveLength(1);
    expect(findHostLiterals("x.tsx", "const url = `https://" + own + "/api`;")).toHaveLength(1);
    expect(findHostLiterals("x.tsx", `export const C = () => <p>factory: {own}</p>;`.replace("{own}", own))).toHaveLength(1);
    expect(findHostLiterals("x.tsx", `// history: the app used to live on https://${own}\nconst ok = 1;`)).toEqual([]);
    expect(findHostLiterals("x.tsx", 'const url = siteUrl("/showcase");')).toEqual([]);
  });

  it("finds none in src/ or public/", () => {
    const offences: string[] = [];
    for (const dir of SCANNED_DIRS) {
      for (const file of filesUnder(path.join(ROOT, dir))) {
        const relative = path.relative(ROOT, file);
        for (const offence of findHostLiterals(relative, readFileSync(file, "utf8"))) {
          offences.push(`${relative}:${offence}`);
        }
      }
    }
    expect(
      offences,
      "A host literal will survive the next domain move. Use siteOrigin()/siteHost()/siteUrl() from " +
        "src/lib/site-origin.ts.",
    ).toEqual([]);
  });
});
