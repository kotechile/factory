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
// Usage:
//   node scripts/vertical-sync.mjs            # regenerate the inventory block
//   node scripts/vertical-sync.mjs --check    # exit 1 if the block is stale or the verdicts drift
// Env:
//   EDITORIAL_VERTICALS=<path to verticals.json>   (default ../editorial-factory/context/verticals.json)

import { readFile, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const LEDGER = resolve(ROOT, "context/vertical_coverage.md");
const REGISTRY = resolve(
  process.env.EDITORIAL_VERTICALS ?? resolve(ROOT, "../editorial-factory/context/verticals.json"),
);

const BEGIN = "<!-- BEGIN:vertical-inventory (generated) -->";
const END = "<!-- END:vertical-inventory -->";
const VBEGIN = "<!-- BEGIN:vertical-verdicts -->";
const VEND = "<!-- END:vertical-verdicts -->";

const CHECK = process.argv.includes("--check");

// An "economic-decision angle" is the editorial side of recon Vector C: a unit-economics,
// TCO, ROI or payback framing that a deterministic engine can answer.
const CALC_ANGLE =
  /calculator|matrix|roi|tco|payback|break-even|breakeven|cost|economics|liquidity|amort/i;

function inventoryBlock(verticals) {
  const rows = [...verticals]
    .sort((a, b) => a.id.localeCompare(b.id))
    .map((v) => {
      const angles = (v.primary_angles ?? []).filter((a) => CALC_ANGLE.test(a)).length;
      const sources = (v.sources ?? []).length;
      return `| \`${v.id}\` | ${v.label} | \`${v.target_persona}\` | \`${v.cadence}\` | ${sources} | ${angles} |`;
    });
  return [
    BEGIN,
    `_Generated ${new Date().toISOString().slice(0, 10)} by \`scripts/vertical-sync.mjs\` from`,
    `\`editorial-factory/context/verticals.json\` (${verticals.length} verticals). Do not hand-edit this block._`,
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

if (!existsSync(REGISTRY)) {
  const msg = `SKIP: editorial vertical registry not found at ${REGISTRY} (set EDITORIAL_VERTICALS)`;
  if (CHECK) {
    console.error(`✗ vertical-sync --check cannot verify: ${msg}`);
    process.exit(1);
  }
  console.log(msg);
  process.exit(0);
}

const { verticals } = JSON.parse(await readFile(REGISTRY, "utf8"));
if (!Array.isArray(verticals) || verticals.length === 0) {
  console.error(`✗ ${REGISTRY} holds no verticals`);
  process.exit(1);
}

const ledger = await readFile(LEDGER, "utf8");
const next = replaceBlock(ledger, inventoryBlock(verticals));

const ids = verdictIds(ledger);
if (ids === null) {
  console.error(`✗ verdict block markers not found in ${LEDGER} (expected ${VBEGIN} / ${VEND})`);
  process.exit(1);
}
const registryIds = new Set(verticals.map((v) => v.id));
const missingVerdict = [...registryIds].filter((id) => !ids.has(id));
const unknownVerdict = [...ids].filter((id) => !registryIds.has(id));
const drift = missingVerdict.length > 0 || unknownVerdict.length > 0;
if (drift) {
  if (missingVerdict.length) {
    console.error(
      `✗ no recon verdict for editorial vertical(s): ${missingVerdict.join(", ")} — add a row to the verdict table`,
    );
  }
  if (unknownVerdict.length) {
    console.error(
      `✗ verdict row(s) for unknown vertical(s): ${unknownVerdict.join(", ")} — retired in the editorial registry?`,
    );
  }
}

const stale = next !== ledger;

if (CHECK) {
  if (stale) console.error("✗ vertical inventory block is stale — run: node scripts/vertical-sync.mjs");
  if (drift || stale) process.exit(1);
  console.log(`✓ vertical menu in sync — ${verticals.length} editorial verticals, no drift`);
  process.exit(0);
}

if (stale) {
  await writeFile(LEDGER, next);
  console.log(`✓ regenerated vertical inventory block (${verticals.length} editorial verticals)`);
} else {
  console.log(`✓ vertical inventory already current (${verticals.length} editorial verticals)`);
}
if (drift) {
  console.error("✗ verdict drift reported above — the ledger is written but not consistent");
  process.exit(1);
}
