#!/usr/bin/env node
/**
 * verify-vendor — has the copy gate in this repo drifted from the spec that installed it?
 *
 * The lexicon and the linter live in one place (`/root/vibe-marketing`) and every repo carries a
 * byte-identical copy. Two things break that quietly:
 *
 *   1. someone edits `scripts/vibe/lexicon.json` in the repo, so this site's rules stop being the
 *      rules everywhere else — the recorded hash catches it;
 *   2. the canonical spec moves and nobody re-vendors, so a new rule only protects one front —
 *      the byte comparison catches it when the canonical checkout is present.
 *
 * Runs as the first half of `npm run copy:check`, i.e. before every build. Where the canonical
 * checkout is absent (CI, the Docker build) check 2 is skipped with a note and check 1 still runs,
 * so a build never fails for a missing external path.
 *
 * Usage: node scripts/vibe/verify-vendor.mjs [--quiet]
 */
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';

const QUIET = process.argv.slice(2).includes('--quiet');
const HERE = path.dirname(fileURLToPath(import.meta.url));
const REPO = path.resolve(HERE, '..', '..');
const CANONICAL = process.env.VIBE_CANONICAL || '/root/vibe-marketing';

const sha = (p) => crypto.createHash('sha256').update(fs.readFileSync(p)).digest('hex');
const files = { 'lexicon.json': 'lexicon', 'vibe-lint.mjs': 'linter' };
const problems = [];
const notes = [];

for (const [name, label] of Object.entries(files)) {
	const local = path.join(HERE, name);
	if (!fs.existsSync(local)) problems.push(`missing ${path.relative(REPO, local)} — the gate cannot run`);

	const canonical = path.join(CANONICAL, name);
	if (fs.existsSync(canonical) && fs.existsSync(local)) {
		if (!fs.readFileSync(local).equals(fs.readFileSync(canonical))) {
			problems.push(
				`${path.relative(REPO, local)} drifts from ${canonical} — re-vendor: ` +
					`node vendor.mjs --to ${REPO} --name <name> --write --hook`
			);
		}
	}
	if (!fs.existsSync(CANONICAL)) notes.push(`canonical spec not at ${CANONICAL}; byte drift unchecked`);
}

// The recorded hash is what proves this copy is the one the spec installed: an in-place edit to the
// vendored lexicon changes the file without changing VENDORED.md.
const vendored = path.join(HERE, 'VENDORED.md');
if (!fs.existsSync(vendored)) {
	problems.push('missing scripts/vibe/VENDORED.md — this copy has no provenance');
} else {
	const recorded = fs.readFileSync(vendored, 'utf8');
	for (const [name, label] of Object.entries(files)) {
		const local = path.join(HERE, name);
		if (!fs.existsSync(local)) continue;
		const m = new RegExp(`${label}\\s+([0-9a-f]{16})`, 'i').exec(recorded);
		const actual = sha(local).slice(0, 16);
		if (!m) {
			notes.push(`VENDORED.md records no ${label} hash (older install); expected ${actual}`);
		} else if (m[1] !== actual) {
			problems.push(
				`scripts/vibe/${name} was edited in place (sha ${actual} ≠ recorded ${m[1]}) — ` +
					`change the spec and re-vendor, never the vendored copy`
			);
		}
	}
}

if (problems.length) {
	console.error('verify-vendor: FAIL');
	for (const p of problems) console.error(`  ✗ ${p}`);
	process.exit(1);
}
if (!QUIET) {
	console.log(`verify-vendor: ok (${Object.keys(files).length} files match their recorded hash${fs.existsSync(CANONICAL) ? ' and the canonical spec' : ''})`);
	for (const n of notes) console.log(`  note: ${n}`);
}
