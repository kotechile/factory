#!/usr/bin/env node
/**
 * vibe-lint — the copy gate for reader-facing text.
 *
 * Scans the copy a reader or buyer actually sees (Astro/JSX text nodes, copy props such as
 * title/description/alt, and string literals in data modules) and checks it against
 * `lexicon.json`. It deliberately does NOT scan class names, URLs, slugs, imports or code.
 *
 * Two tiers, because a gate that fires on everything gets muted:
 *   error  — the lexicon's forbidden AI-isms and throat-clearing openers. Fails the run.
 *   warn   — marketing adjectives, preferred-term substitutions, sentence length. Reported;
 *            fails only with --strict.
 *
 * Existing violations are grandfathered through a baseline file keyed by file + rule + match,
 * so the gate is green on the day it lands and only NEW copy has to comply.
 *
 * Usage:
 *   node vibe-lint.mjs --root src [--baseline baseline/x.json] [--json] [--strict]
 *   node vibe-lint.mjs --root src --write-baseline baseline/x.json
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const LEXICON = JSON.parse(fs.readFileSync(path.join(HERE, 'lexicon.json'), 'utf8'));

// ── args ────────────────────────────────────────────────────────────────────
const argv = process.argv.slice(2);
const arg = (name, fallback = undefined) => {
	const i = argv.indexOf(`--${name}`);
	if (i === -1) return fallback;
	const next = argv[i + 1];
	return next && !next.startsWith('--') ? next : true;
};
// `--root` may be repeated: a repo with reader-facing copy outside `src` (launch copy, generated
// email text) scans both roots on one pass, so one baseline and one verdict cover the surface.
// `--include <glob>` narrows the root it follows to those basenames — an extra root usually holds
// internal briefs and build workspaces alongside the reader-facing files.
const ROOTS = (() => {
	const found = [];
	argv.forEach((a, i) => {
		const next = argv[i + 1];
		if (!next || next.startsWith('--')) return;
		if (a === '--root') found.push({ dir: path.resolve(next), includes: [] });
		else if (a === '--include' && found.length) found[found.length - 1].includes.push(next);
	});
	return found.length ? found : [{ dir: path.resolve('.'), includes: [] }];
})();
const ROOT = ROOTS[0].dir;
const globToRe = (g) => new RegExp('^' + g.replace(/[.+^${}()|[\]\\]/g, '\\$&').replace(/\*/g, '.*') + '$');
const wants = (root, file) =>
	root.includes.length === 0 || root.includes.some((g) => globToRe(g).test(path.basename(file)));
const BASELINE = arg('baseline', null);
const WRITE_BASELINE = arg('write-baseline', null);
const JSON_OUT = Boolean(arg('json', false));
const STRICT = Boolean(arg('strict', false));
const QUIET = Boolean(arg('quiet', false));
const MAX_PER_FILE = Number(arg('max-per-file', 50));

const EXT = new Set(['.astro', '.tsx', '.jsx', '.ts', '.js', '.mjs', '.md', '.txt']);
const SKIP_DIRS = new Set(['node_modules', 'dist', '.astro', '.next', '.git', 'build', 'coverage', 'public', '.vercel']);
const SKIP_FILES = new Set(['AGENTS.md', 'README.md', 'SPLIT.md', 'CHANGELOG.md']);

// ── lexicon compilation ─────────────────────────────────────────────────────
const compile = (list) => list.map((r) => ({ ...r, re: new RegExp(r.pattern, 'gi') }));
const BANNED = compile(LEXICON.banned);
const OPENERS = compile(LEXICON.openers);
const ADJECTIVES = compile(LEXICON.adjectives);
const PREFERRED = compile(LEXICON.preferred);
const EXCEPTIONS = (LEXICON.exceptions || []).map((p) => new RegExp(p, 'g'));

const maskExceptions = (text) => {
	let out = text;
	for (const re of EXCEPTIONS) out = out.replace(re, (m) => ' '.repeat(m.length));
	return out;
};

// ── extraction ──────────────────────────────────────────────────────────────
const COPY_PROPS = /(?:^|\s)(title|description|alt|aria-label|placeholder|tagline|headline|lede|summary|subtitle|excerpt|label|cta)\s*=\s*["']([^"']{8,})["']/g;
const JSX_TEXT_PROPS = /(?:^|\s)(title|description|alt|aria-label|placeholder|tagline|headline|lede|summary|subtitle|excerpt)\s*:\s*["']([^"']{8,})["']/g;
const CODE_LINE = /=>|\b(import|export|const|let|var|function|return)\b|^\s*[})\]{(]/;
const NAMED_COPY_KEY = /(?:^|\s)(title|description|tagline|headline|lede|summary|subtitle|excerpt|label|name|detail|failure|input|output|freeTier|exportLabel)\s*:\s*(["'`])([\s\S]*?)\2/;

const decode = (s) =>
	s
		.replace(/&amp;/g, '&')
		.replace(/&nbsp;/g, ' ')
		.replace(/&mdash;/g, '—')
		.replace(/&ndash;/g, '–')
		.replace(/&rarr;/g, '→')
		.replace(/&larr;/g, '←')
		.replace(/&quot;/g, '"')
		.replace(/&#0?39;|&apos;|&#x27;/g, "'")
		.replace(/&lt;/g, '<')
		.replace(/&gt;/g, '>');

const normalize = (s) => decode(s).replace(/\s+/g, ' ').trim();

const TAILWIND = /^(flex|grid|block|inline|hidden|relative|absolute|fixed|sticky|group|container|prose|sr-only|text-|bg-|border-|rounded|shadow|p[xytrbl]?-|m[xytrbl]?-|w-|h-|min-|max-|gap-|space-|font-|leading-|tracking-|uppercase|lowercase|hover:|focus:|sm:|md:|lg:|xl:|2xl:|dark:|transition|duration-|ease-|translate-|opacity-|overflow-|items-|justify-|self-|col-|row-|z-|top-|left-|right-|bottom-|inset-|order-|grid-cols-|shrink|grow|basis-|object-|aspect-|ring-|divide-|cursor-|select-|pointer-|whitespace-|break-|truncate|backdrop-|from-|via-|to-|animate-|scale-|origin-|rotate-|skew-|fill-|stroke-|appearance-|\[&)/;
const STOPWORDS = /\b(the|and|for|with|that|this|from|your|you|are|is|of|to|in|on|by|not|but|or|as|at|it|its|we|our)\b/i;

const SVG_PATH = /^[MmLlHhVvCcSsQqTtAaZz][MmLlHhVvCcSsQqTtAaZz0-9.,\s+-]+$/;
const isCopy = (raw) => {
	const text = normalize(raw);
	if (!text || text.length < 12) return false;
	if (SVG_PATH.test(text)) return false;
	if (/^[MmLlHhVvCcSsQqTtAaZz][0-9.,\s+-]*[0-9.,\s+-]{20,}$/.test(text) && !/[A-Za-z]{4,}/.test(text)) return false;
	const words = text.split(' ').filter(Boolean);
	if (words.length < 3) return false;
	if (/^(https?:)?\/\//.test(text) || /^[\w./@:#$%&?=-]+$/.test(text)) return false;
	const tw = words.filter((w) => TAILWIND.test(w)).length;
	if (tw >= 2 && !STOPWORDS.test(text)) return false;
	if (tw / words.length > 0.25) return false;
	if (/^[A-Z0-9_-]{3,}(:[A-Z0-9_-]+)*$/.test(text)) return false;
	if (/[;=]|\$\{/.test(text) && words.length < 6) return false;
	return true;
};

const seenUnits = new Set();
function pushUnit(units, file, line, kind, text) {
	const clean = normalize(text).replace(/^["'`]|["'`]$/g, '').trim();
	if (!isCopy(clean)) return;
	// The same sentence arrives twice on a line that carries it as a prop and as a text node
	// (title="…" plus the rendered <h1>); keep the first so one defect is one finding.
	const dedupe = `${file}:${line}:${clean.toLowerCase()}`;
	if (seenUnits.has(dedupe)) return;
	seenUnits.add(dedupe);
	units.push({ file, line, kind, text: clean });
}

function extractAstro(file, source, units) {
	const fm = /^---\n([\s\S]*?)\n---/.exec(source);
	if (fm) {
		const startLine = 1;
		fm[1].split('\n').forEach((line, i) => {
			const named = NAMED_COPY_KEY.exec(line);
			if (named) pushUnit(units, file, startLine + i, 'frontmatter', named[3]);
			else if (/^\s*(title|description|tagline|headline|lede|summary)\s*:/.test(line)) {
				const q = /:\s*(["'`])([\s\S]*?)\1/.exec(line);
				if (q) pushUnit(units, file, startLine + i, 'frontmatter', q[2]);
			}
		});
	}
	const bodyStart = fm ? fm[0].split('\n').length : 0;
	let skipTag = null;
	source
		.slice(fm ? fm[0].length : 0)
		.split('\n')
		.forEach((line, i) => {
			const lineNo = bodyStart + i + 1;
			if (skipTag) {
				if (new RegExp(`</${skipTag}>`, 'i').test(line)) skipTag = null;
				return;
			}
			const open = /<(script|style|svg|pre|code)\b/i.exec(line);
			if (open && !new RegExp(`</${open[1]}>`, 'i').test(line)) skipTag = open[1].toLowerCase();
			if (skipTag) return;
			if (/<!--/.test(line) && !/-->/.test(line)) return;

			COPY_PROPS.lastIndex = 0;
			let m;
			while ((m = COPY_PROPS.exec(line))) pushUnit(units, file, lineNo, `attr:${m[1]}`, m[2]);

			if (CODE_LINE.test(line)) return;
			const text = line.replace(/<[^>]*>/g, ' ').replace(/\b[\w:-]+\s*=\s*"[^"]*"/g, ' ');
			pushUnit(units, file, lineNo, 'text', text);
		});
}

function extractTs(file, source, units, jsx) {
	let skipTag = null;
	source.split('\n').forEach((line, i) => {
		const lineNo = i + 1;
		if (/\bimport\b/.test(line) || /\bexport\b.*\bfrom\b/.test(line)) return;
		if (/\b(href|src|className|class|to|as|id|slug|path|ruleId|url)\s*[=:]/.test(line)) {
			// still allow a nested copy key on the same line
		}
		const named = NAMED_COPY_KEY.exec(line);
		if (named) pushUnit(units, file, lineNo, 'string', named[3]);
		const re = /(["'`])((?:\\.|(?!\1)[\s\S]){12,}?)\1/g;
		let m;
		while ((m = re.exec(line))) {
			const candidate = m[2];
			if (NAMED_COPY_KEY.test(candidate)) continue;
			pushUnit(units, file, lineNo, 'string', candidate);
		}
		if (!jsx) return;
		if (skipTag) {
			if (new RegExp(`</${skipTag}>`, 'i').test(line)) skipTag = null;
			return;
		}
		const open = /<(script|style|pre|code|svg)\b/i.exec(line);
		if (open && !new RegExp(`</${open[1]}>`, 'i').test(line)) skipTag = open[1].toLowerCase();
		if (skipTag) return;
		if (CODE_LINE.test(line) || /^\s*(import|export|\/\/|\*)/.test(line)) return;
		pushUnit(units, file, lineNo, 'text', line.replace(/<[^>]*>/g, ' '));
	});
}

function extractMd(file, source, units) {
	// Frontmatter is copy too — but only its human-facing fields, not the seals and slugs.
	const fm = /^---\n([\s\S]*?)\n---\n?/.exec(source);
	if (fm) {
		fm[1].split('\n').forEach((line, i) => {
			const m = /^(title|meta_title|description|excerpt|subtitle|tagline)\s*:\s*(.+)$/.exec(line.trim());
			if (m) pushUnit(units, file, i + 2, 'meta', m[2].replace(/^["']|["']$/g, ''));
		});
	}
	// The reader-facing body stops at the Sources list; references are not prose.
	const body = (fm ? source.slice(fm[0].length) : source).split(/\n#{1,3}\s*Sources\b/)[0];
	const offset = fm ? fm[0].split('\n').length - 1 : 0;

	let fence = false;
	let para = [];
	let paraStart = 1;
	const flush = () => {
		if (para.length) {
			pushUnit(units, file, paraStart, 'md', para.join(' '));
			para = [];
		}
	};
	body.split('\n').forEach((line, i) => {
		const lineNo = offset + i + 1;
		if (/^\s*```/.test(line)) {
			fence = !fence;
			flush();
			return;
		}
		if (fence) return;
		if (!line.trim()) {
			flush();
			return;
		}
		if (/^\s*(#|>|[-*+] |\d+\. |\|)/.test(line)) flush();
		const cleaned = line
			.replace(/<!--[\s\S]*?-->/g, ' ')
			.replace(/!\[[^\]]*\]\([^)]*\)/g, ' ')
			.replace(/\[([^\]]*)\]\([^)]*\)/g, '$1')
			.replace(/`[^`]*`/g, ' ')
			.replace(/^\s*(#+|>|[-*+]|\d+\.|\|)\s*/, '')
			.replace(/\*\*|__/g, '');
		if (!cleaned.trim()) return;
		if (!para.length) paraStart = lineNo;
		para.push(cleaned);
	});
	flush();
}

function walk(dir, out = []) {
	for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
		if (entry.isDirectory()) {
			if (!SKIP_DIRS.has(entry.name)) walk(path.join(dir, entry.name), out);
			continue;
		}
		if (!entry.isFile() || SKIP_FILES.has(entry.name)) continue;
		const ext = path.extname(entry.name);
		if (EXT.has(ext)) out.push(path.join(dir, entry.name));
	}
	return out;
}

// ── rules ───────────────────────────────────────────────────────────────────
function sentences(text) {
	return text.split(/(?<=[.!?])\s+/).map((s) => s.trim()).filter(Boolean);
}

function checkUnit(unit) {
	const hits = [];
	const masked = maskExceptions(unit.text);

	for (const rule of BANNED) {
		rule.re.lastIndex = 0;
		const m = rule.re.exec(masked);
		if (m) hits.push({ severity: 'error', rule: `banned:${rule.id}`, label: rule.label, match: m[0].trim() });
	}
	for (const rule of OPENERS) {
		rule.re.lastIndex = 0;
		const m = rule.re.exec(masked.trim());
		if (m) hits.push({ severity: 'error', rule: `opener:${rule.id}`, label: rule.label, match: m[0].trim() });
	}
	for (const rule of ADJECTIVES) {
		rule.re.lastIndex = 0;
		const m = rule.re.exec(masked);
		if (m) hits.push({ severity: 'warn', rule: `adjective:${rule.id}`, label: rule.label, match: m[0].trim() });
	}
	for (const rule of PREFERRED) {
		rule.re.lastIndex = 0;
		const m = rule.re.exec(masked);
		if (m) hits.push({ severity: 'info', rule: `preferred:${rule.id}`, label: `${rule.from} → ${rule.to}`, match: m[0].trim() });
	}

	const sents = sentences(unit.text);
	sents.forEach((s, idx) => {
		const n = s.split(/\s+/).filter(Boolean).length;
		const limit = idx === 0 ? LEXICON.thresholds.max_first_sentence_words : LEXICON.thresholds.max_sentence_words;
		if (n > limit) {
			hits.push({ severity: 'warn', rule: 'sentence-length', label: `${n} words (limit ${limit})`, match: s.slice(0, 90) });
		}
	});
	if (/!/.test(unit.text) && !/[!=]/.test(unit.text)) {
		hits.push({ severity: 'warn', rule: 'exclamation', label: 'exclamation mark', match: unit.text.slice(0, 60) });
	}
	return hits;
}

// ── baseline ────────────────────────────────────────────────────────────────
function loadBaseline(file) {
	if (!file || !fs.existsSync(file)) return {};
	try {
		return JSON.parse(fs.readFileSync(file, 'utf8'));
	} catch {
		return {};
	}
}
const baselineKey = (file, hit) => `${file}|${hit.rule}|${hit.match.toLowerCase()}`;

// ── run ─────────────────────────────────────────────────────────────────────
const files = [];
const relOf = new Map();
for (const root of ROOTS) {
	for (const file of walk(root.dir)) {
		if (relOf.has(file) || !wants(root, file)) continue;
		files.push(file);
		relOf.set(file, path.relative(root.dir, file));
	}
}
if (!files.length) {
	console.error(`vibe-lint: no scannable files under ${ROOTS.map((r) => r.dir).join(', ')}`);
	process.exit(2);
}
const units = [];
const counts = { astro: 0, ts: 0, md: 0 };
for (const file of files) {
	const src = fs.readFileSync(file, 'utf8');
	const ext = path.extname(file);
	const rel = relOf.get(file);
	if (ext === '.astro') {
		counts.astro++;
		extractAstro(rel, src, units);
	} else if (ext === '.md' || ext === '.txt') {
		counts.md++;
		extractMd(rel, src, units);
	} else {
		counts.ts++;
		extractTs(rel, src, units, ext === '.tsx' || ext === '.jsx');
	}
}

const baseline = loadBaseline(BASELINE);
const seen = {};
const violations = [];
for (const unit of units) {
	for (const hit of checkUnit(unit)) {
		const v = { ...hit, ...unit };
		const key = baselineKey(unit.file, hit);
		const allowed = baseline[key] || 0;
		seen[key] = (seen[key] || 0) + 1;
		v.new = (seen[key] || 0) > allowed;
		violations.push(v);
	}
}

// The lexicon's per-page adjective ceiling has to be enforced by someone: a page can stay under the
// per-sentence rules and still be adjective soup. Counted per file, reported as a warning, and
// grandfathered when every hit on that page is already in the baseline.
const ADJECTIVE_CAP = LEXICON.thresholds?.max_adjective_hits_per_page;
if (ADJECTIVE_CAP) {
	const perFile = new Map();
	for (const v of violations) {
		if (!v.rule.startsWith('adjective:')) continue;
		const cur = perFile.get(v.file) || { n: 0, fresh: false };
		cur.n += 1;
		cur.fresh = cur.fresh || v.new;
		perFile.set(v.file, cur);
	}
	for (const [file, { n, fresh }] of perFile) {
		if (n <= ADJECTIVE_CAP) continue;
		violations.push({
			severity: 'warn',
			rule: 'adjective-density',
			label: `${n} adjective hits on one page (cap ${ADJECTIVE_CAP})`,
			match: '',
			file,
			line: 0,
			kind: 'page',
			new: fresh
		});
	}
}

const errors = violations.filter((v) => v.severity === 'error');
const warns = violations.filter((v) => v.severity === 'warn');
const infos = violations.filter((v) => v.severity === 'info');
const newErrors = errors.filter((v) => v.new);
const newWarns = warns.filter((v) => v.new);

const summary = {
	root: ROOT,
	files: files.length,
	byExt: counts,
	copy_units: units.length,
	errors: errors.length,
	new_errors: newErrors.length,
	warns: warns.length,
	new_warns: newWarns.length,
	infos: infos.length,
	grandfathered: violations.filter((v) => !v.new).length,
	baseline_debt: baselineDebt(violations),
	top_terms: topTerms(errors.concat(warns)),
	verdict: newErrors.length === 0 && (!STRICT || newWarns.length === 0) ? 'pass' : 'fail',
};

function baselineDebt(list) {
	const m = new Map();
	for (const v of list) if (!v.new) m.set(v.file, (m.get(v.file) || 0) + 1);
	return [...m.entries()].sort((a, b) => b[1] - a[1]).slice(0, 8).map(([file, n]) => ({ file, n }));
}

function topTerms(list) {
	const m = new Map();
	for (const v of list) m.set(v.label, (m.get(v.label) || 0) + 1);
	return [...m.entries()].sort((a, b) => b[1] - a[1]).slice(0, 12).map(([label, n]) => ({ label, n }));
}

if (WRITE_BASELINE) {
	const out = {};
	for (const v of violations) {
		const k = baselineKey(v.file, v);
		out[k] = (out[k] || 0) + 1;
	}
	fs.mkdirSync(path.dirname(path.resolve(WRITE_BASELINE)), { recursive: true });
	fs.writeFileSync(WRITE_BASELINE, JSON.stringify(out, null, 2) + '\n');
	console.error(`wrote baseline: ${WRITE_BASELINE} (${Object.keys(out).length} entries)`);
}

if (JSON_OUT) {
	console.log(JSON.stringify({ summary, violations: violations.slice(0, 500) }, null, 2));
} else if (!QUIET) {
	console.log(`vibe-lint  ${ROOT}`);
	console.log(
		`files ${files.length} (astro ${counts.astro}, ts/mjs ${counts.ts}, md ${counts.md}) · copy units ${units.length}`
	);
	console.log(
		`errors ${errors.length} (new ${newErrors.length}) · warnings ${warns.length} (new ${newWarns.length}) · info ${infos.length}`
	);
	if (summary.grandfathered) {
		console.log(`grandfathered by baseline: ${summary.grandfathered} in ${summary.baseline_debt.length} files`);
		for (const d of summary.baseline_debt) console.log(`  debt ${d.n}  ${d.file}`);
	}
	if (summary.top_terms.length) {
		console.log('top: ' + summary.top_terms.map((t) => `${t.label} ×${t.n}`).join(', '));
	}
	const shown = violations.filter((v) => v.severity === 'error' || v.severity === 'warn').slice(0, MAX_PER_FILE);
	const byFile = new Map();
	for (const v of shown) {
		if (!byFile.has(v.file)) byFile.set(v.file, []);
		byFile.get(v.file).push(v);
	}
	for (const [file, list] of byFile) {
		console.log(`\n${file}`);
		for (const v of list.slice(0, 20)) {
			const mark = v.new ? 'NEW ' : '    ';
			console.log(`  ${mark}${v.line}:${v.kind} [${v.severity}] ${v.label} — "${v.match}"`);
		}
	}
	console.log(`\nverdict: ${summary.verdict.toUpperCase()}`);
}

process.exit(summary.verdict === 'pass' ? 0 : 1);
