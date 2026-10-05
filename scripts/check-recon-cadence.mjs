#!/usr/bin/env node
/**
 * Recon cadence guard.
 *
 * Owner instruction (loop-ai, 2026-10-05), verbatim:
 *   "Increase the number of verticals to two per week"
 *
 * The cadence is an instruction to an unattended weekly run, so prose alone cannot hold it: a run that
 * scans ONE vertical still produces a plausible-looking report, and nothing in the tree would notice.
 * This guard makes the rule mechanical, on the ledger the run must update anyway:
 *
 *   1. the SOP (`skills/market_recon_last30days.md`) must still declare the two-slot cadence, and the
 *      ledger (`context/vertical_coverage.md`) must state the rule it is judged by — so the guard and
 *      the instructions cannot drift apart silently;
 *   2. the NEWEST `last_scanned` date in the ledger must carry TWO verticals.
 *
 * Baseline handling (this matters): the ledger's newest scan date before the cadence change is
 * 2026-09-28, from a run that legitimately scanned one vertical. A guard that fails on its own
 * baseline is a false red — the same defect class as the `verticals:check` date-token bug of
 * 2026-09-22. So any newest date BEFORE `CADENCE_FROM` is reported and passed, and the rule starts
 * biting on the first run on/after that date.
 */

import { readFileSync, existsSync } from "node:fs";

const SOP = "skills/market_recon_last30days.md";
const LEDGER = "context/vertical_coverage.md";

/** The date the two-verticals-per-sweep cadence took effect (owner instruction). */
const CADENCE_FROM = "2026-10-05";

/** Markers that must survive in the docs: the cadence is declared in both the SOP and the ledger. */
const REQUIRED_MARKERS = [
  { file: SOP, marker: "VERTICAL_A", why: "the SOP must declare the two named vertical slots" },
  { file: SOP, marker: "Two verticals per sweep", why: "the SOP must state the cadence" },
  { file: LEDGER, marker: "Two verticals per sweep", why: "the ledger must state the rule it is judged by" },
];

const failures = [];
const notes = [];

for (const { file, marker, why } of REQUIRED_MARKERS) {
  const text = readFileSync(file, "utf8");
  if (!text.includes(marker)) {
    failures.push(`${file} no longer contains "${marker}" — ${why}.`);
  }
}

/**
 * Extract `last_scanned` values from the ledger's markdown tables. Rows look like:
 *   | healthcare_rcm | ✅ (added 2026-09-28) | 2026-09-28 | 69 | **retired — no build** | … |
 *   | money_document_recon | — (implicit) | 2026-08-31 → 2026-09-14 (5 sweeps) | 83 | … |
 * The scan date is the LAST date in the cell (a range means "scanned through").
 */
function scanRows() {
  const rows = [];
  for (const line of readFileSync(LEDGER, "utf8").split("\n")) {
    if (!line.startsWith("|")) continue;
    const cells = line.split("|").map((c) => c.trim());
    if (cells.length < 4) continue;
    const vertical = cells[1];
    if (!/^[a-z][a-z0-9_]*$/.test(vertical)) continue; // skips the header and separator rows
    const cell = cells[3];
    if (!/^`?\d{4}-\d{2}-\d{2}/.test(cell.replace(/^\*+/, ""))) continue; // "— (probe only)" rows have no date
    const dates = cell.match(/\d{4}-\d{2}-\d{2}/g);
    if (!dates) continue;
    rows.push({ vertical, date: dates[dates.length - 1] });
  }
  return rows;
}

const rows = scanRows();
if (rows.length === 0) {
  failures.push(
    `${LEDGER} has no readable \`last_scanned\` rows — the cadence cannot be verified (a guard that cannot verify must fail closed).`,
  );
} else {
  const newest = rows.map((r) => r.date).sort().at(-1);
  const onNewest = rows.filter((r) => r.date === newest);
  if (newest < CADENCE_FROM) {
    notes.push(
      `newest scan date ${newest} (${onNewest.map((r) => r.vertical).join(", ")}) predates the ${CADENCE_FROM} cadence change — baseline, not judged.`,
    );
  } else if (onNewest.length < 2) {
    failures.push(
      `${LEDGER}: the newest scan date ${newest} carries ${onNewest.length} vertical (${onNewest.map((r) => r.vertical).join(", ")}). ` +
        `The owner's cadence is TWO verticals per sweep — record the second slot's \`last_scanned\` row (or its retirement) in the run that scanned it.`,
    );
  } else {
    notes.push(`newest scan date ${newest}: ${onNewest.length} verticals (${onNewest.map((r) => r.vertical).join(", ")}).`);
  }
}

if (failures.length > 0) {
  console.error("✗ recon cadence: FAIL");
  for (const f of failures) console.error(`  - ${f}`);
  process.exit(1);
}

console.log("✓ recon cadence: two verticals per sweep declared, and the newest scan date honours it");
for (const n of notes) console.log(`  · ${n}`);
