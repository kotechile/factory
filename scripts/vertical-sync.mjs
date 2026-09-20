#!/usr/bin/env node
// Vertical-menu sync: keep the software factory's recon rotation queue honest against the
// editorial factory's vertical registry (the source of truth for which audiences the factory
// already publishes into).
//
// Regenerates the inventory block inside context/vertical_coverage.md between
//   <!-- BEGIN:vertical-inventory (generated) --> ... <!-- END:vertical-inventory -->
// and reports drift against the hand-maintained verdict block
//   <!-- BEGIN:vertical-verdicts --> ... <!-- END:vertical-verdicts -->
//
// Why: a manually copied registry drifts silently (see the 2026-09-10 manifest lesson in
// skills/self_improvement_eval.md — a hand-written listing with no producer script published a
// tool name that was registered nowhere).
//
// Registry sources, in precedence order:
//   1. EDITORIAL_VERTICALS=<path>            explicit override (live or vendored file)
//   2. context/editorial_verticals.json      vendored snapshot committed in THIS repo, with
//                                            provenance (source repo head, file commit, sha256,
//                                            fetch time). This is the default so the ledger can be
//                                            regenerated inside the deploy container, where the
//                                            sibling editorial checkout does not exist.
// When a live editorial registry is reachable it is compared against the vendored snapshot, so a
// stale snapshot is a loud failure rather than a silent one.
//
// Usage:
//   node scripts/vertical-sync.mjs                     # regenerate the inventory block
//   node scripts/vertical-sync.mjs --check             # exit 1 on stale block / verdict drift / stale snapshot
//   node scripts/vertical-sync.mjs --vendor[=<path>]   # re-vendor the snapshot from the live registry
// Env:
//   EDITORIAL_VERTICALS=<path>   override the registry source
//   EDITORIAL_REPO=<dir>         where the live checkout lives (default ../editorial-factory)

import { readFile, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const LEDGER = resolve(ROOT, "context/vertical_coverage.md");
const VENDORED = resolve(ROOT, "context/editorial_verticals.json");
const EDITORIAL_REPO = resolve(process.env.EDITORIAL_REPO ?? resolve(ROOT, "../editorial-factory"));
const LIVE_DEFAULT = resolve(EDITORIAL_REPO, "context/verticals.json");

const BEGIN = "<!-- BEGIN:vertical-inventory (generated) -->";
const END = "<!-- END:vertical-inventory -->";
const VBEGIN = "<!-- BEGIN:vertical-verdicts -->";
const VEND = "<!-- END:vertical-verdicts -->";

const argv = process.argv.slice(2);
const CHECK = argv.includes("--check");
const vendorArg = argv.find((a) => a === "--vendor" || a.startsWith("--vendor="));
const VENDOR = vendorArg !== undefined;

// An "economic-decision angle" is the editorial side of recon Vector C: a unit-economics,
// TCO, ROI or payback framing that a deterministic engine can answer.
const CALC_ANGLE =
  /calculator|matrix|roi|tco|payback|break-even|breakeven|cost|economics|liquidity|amort/i;

const sha256 = (text) => createHash("sha256").update(text).digest("hex");

function inventoryBlock(verticals, provenance) {
  const rows = [...verticals]
    .sort((a, b) => a.id.localeCompare(b.id))
    .map((v) => {
      const angles = (v.primary_angles ?? []).filter((a) => CALC_ANGLE.test(a)).length;
      const sources = (v.sources ?? []).length;
      return `| \`${v.id}\` | ${v.label} | \`${v.target_persona}\` | \`${v.cadence}\` | ${sources} | ${angles} |`;
    });
  const origin =
    provenance.mode === "vendored"
      ? `vendored snapshot \`context/editorial_verticals.json\` (source \`${provenance.sourcePath}\`, file commit ${provenance.fileCommit ?? "unknown"}, fetched ${provenance.fetchedAt})`
      : `live registry \`${provenance.sourcePath}\``;
  return [
    BEGIN,
    `_Generated ${new Date().toISOString().slice(0, 10)} by \`scripts/vertical-sync.mjs\` from the`,
    `${origin} — ${verticals.length} verticals. Do not hand-edit this block._`,
    "",
    "| Vertical | Label | Editorial persona | Cadence | Sources | Decision-shaped angles |",
    "|---|---|---|---|---|---|",
    ...rows,
    END,
  ].join("\n");
}

function verdictIds(ledgerText) {
  const start = ledgerText.indexOf(VBEGIN);
  const end = ledgerText.indexOf(VEND);
  if (start === -1 || end === -1 || end < start) return null;
  const block = ledgerText.slice(start + VBEGIN.length, end);
  return new Set([...block.matchAll(/^\|\s*`([a-z0-9_]+)`/gm)].map((m) => m[1]));
}

function replaceBlock(text, block) {
  const start = text.indexOf(BEGIN);
  const end = text.indexOf(END);
  if (start === -1 || end === -1 || end < start) {
    throw new Error(`markers not found in ${LEDGER}: expected "${BEGIN}" and "${END}"`);
  }
  return text.slice(0, start) + block + text.slice(end + END.length);
}

function git(args, cwd) {
  try {
    return execFileSync("git", ["-C", cwd, ...args], { encoding: "utf8" }).trim();
  } catch {
    return null;
  }
}

async function readRegistry(path, label) {
  const text = await readFile(path, "utf8");
  const parsed = JSON.parse(text);
  const verticals = parsed.verticals;
  if (!Array.isArray(verticals) || verticals.length === 0) {
    throw new Error(`${label} ${path} holds no verticals`);
  }
  return { path, text, verticals };
}

async function readVendored() {
  if (!existsSync(VENDORED)) {
    throw new Error(
      `vendored editorial registry missing at ${VENDORED} — vendor it with: node scripts/vertical-sync.mjs --vendor`,
    );
  }
  const { verticals } = await readRegistry(VENDORED, "vendored registry");
  const envelope = JSON.parse(await readFile(VENDORED, "utf8"));
  return {
    verticals,
    provenance: {
      mode: "vendored",
      sourcePath: envelope.sourcePath ?? "unknown",
      fileCommit: envelope.sourceFileCommit ?? null,
      fetchedAt: envelope.fetchedAt ?? "unknown",
    },
  };
}

// --- vendor mode: snapshot the live registry into this repo, with provenance ---------------
if (VENDOR) {
  const livePath = vendorArg.startsWith("--vendor=") ? resolve(vendorArg.slice(9)) : LIVE_DEFAULT;
  if (!existsSync(livePath)) {
    console.error(`✗ cannot vendor: live registry not found at ${livePath}`);
    process.exit(1);
  }
  const live = await readRegistry(livePath, "live registry");
  const repoDir = dirname(dirname(livePath));
  const envelope = {
    _note:
      "Vendored snapshot of the editorial factory's vertical registry. Regenerate with: node scripts/vertical-sync.mjs --vendor",
    sourceRepo: git(["remote", "get-url", "origin"], repoDir) ?? "unknown",
    sourcePath: livePath,
    sourceRepoHead: git(["rev-parse", "HEAD"], repoDir),
    sourceFileCommit: git(["log", "-1", "--format=%H", "--", livePath], repoDir),
    sourceSha256: sha256(live.text),
    fetchedAt: new Date().toISOString(),
    verticals: live.verticals,
  };
  await writeFile(VENDORED, `${JSON.stringify(envelope, null, 2)}\n`);
  const ledger = await readFile(LEDGER, "utf8");
  const next = replaceBlock(ledger, inventoryBlock(live.verticals, {
    mode: "vendored",
    sourcePath: livePath,
    fileCommit: envelope.sourceFileCommit,
    fetchedAt: envelope.fetchedAt,
  }));
  if (next !== ledger) await writeFile(LEDGER, next);
  console.log(
    `✓ vendored ${live.verticals.length} verticals from ${livePath} (file commit ${(envelope.sourceFileCommit ?? "unknown").slice(0, 8)}) and regenerated the inventory block`,
  );
  process.exit(0);
}

// --- normal / check mode ------------------------------------------------------------------
let source;
if (process.env.EDITORIAL_VERTICALS) {
  const custom = resolve(process.env.EDITORIAL_VERTICALS);
  if (!existsSync(custom)) {
    console.error(`✗ EDITORIAL_VERTICALS points at a missing file: ${custom}`);
    process.exit(1);
  }
  const reg = await readRegistry(custom, "registry");
  source = {
    verticals: reg.verticals,
    provenance: { mode: "live", sourcePath: custom, fileCommit: null, fetchedAt: "n/a" },
  };
} else {
  try {
    source = await readVendored();
  } catch (error) {
    console.error(`✗ ${error.message}`);
    process.exit(1);
  }
}

const problems = [];

// Stale-snapshot guard: when the live checkout is reachable, it must match the vendored snapshot.
if (!process.env.EDITORIAL_VERTICALS && existsSync(LIVE_DEFAULT)) {
  const live = await readRegistry(LIVE_DEFAULT, "live registry");
  const vendored = JSON.parse(await readFile(VENDORED, "utf8"));
  if (sha256(live.text) !== vendored.sourceSha256) {
    const liveIds = new Set(live.verticals.map((v) => v.id));
    const vendoredIds = new Set(source.verticals.map((v) => v.id));
    const added = [...liveIds].filter((id) => !vendoredIds.has(id));
    const removed = [...vendoredIds].filter((id) => !liveIds.has(id));
    problems.push(
      `vendored snapshot is behind the live editorial registry (${live.verticals.length} live vs ${source.verticals.length} vendored` +
        `${added.length ? `; new: ${added.join(", ")}` : ""}` +
        `${removed.length ? `; gone: ${removed.join(", ")}` : ""}) — re-vendor with: node scripts/vertical-sync.mjs --vendor`,
    );
  }
}

const ledger = await readFile(LEDGER, "utf8");
const next = replaceBlock(ledger, inventoryBlock(source.verticals, source.provenance));

const ids = verdictIds(ledger);
if (ids === null) {
  console.error(`✗ verdict block markers not found in ${LEDGER} (expected ${VBEGIN} / ${VEND})`);
  process.exit(1);
}
const registryIds = new Set(source.verticals.map((v) => v.id));
const missingVerdict = [...registryIds].filter((id) => !ids.has(id));
const unknownVerdict = [...ids].filter((id) => !registryIds.has(id));
if (missingVerdict.length) {
  problems.push(`no recon verdict for vertical(s): ${missingVerdict.join(", ")} — add a row to the verdict table`);
}
if (unknownVerdict.length) {
  problems.push(`verdict row(s) for unknown vertical(s): ${unknownVerdict.join(", ")} — retired in the editorial registry?`);
}

const stale = next !== ledger;

if (CHECK) {
  if (stale) problems.push("vertical inventory block is stale — run: node scripts/vertical-sync.mjs");
  if (problems.length) {
    for (const p of problems) console.error(`✗ ${p}`);
    process.exit(1);
  }
  console.log(
    `✓ vertical menu in sync — ${source.verticals.length} verticals, no drift (${source.provenance.mode})`,
  );
  process.exit(0);
}

if (stale) {
  await writeFile(LEDGER, next);
  console.log(`✓ regenerated vertical inventory block (${source.verticals.length} verticals, ${source.provenance.mode})`);
} else {
  console.log(`✓ vertical inventory already current (${source.verticals.length} verticals, ${source.provenance.mode})`);
}
if (problems.length) {
  for (const p of problems) console.error(`✗ ${p}`);
  process.exit(1);
}
