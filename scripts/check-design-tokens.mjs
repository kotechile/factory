#!/usr/bin/env node
// Design-token lint: fail if any src/**/*.{ts,tsx} uses a raw Tailwind palette
// color instead of a factory design token (primary/accent/muted/...).

import { readdir, readFile } from "node:fs/promises";
import { join, extname, relative } from "node:path";

const RAW_COLORS = [
  "slate", "gray", "zinc", "neutral", "stone",
  "red", "orange", "amber", "yellow", "lime", "green", "emerald",
  "teal", "cyan", "sky", "blue", "indigo", "violet", "purple",
  "fuchsia", "pink", "rose",
];

const COLOR_UTILITIES = [
  "bg", "text", "border", "ring", "fill", "stroke",
  "from", "to", "via", "divide", "outline", "placeholder", "caret",
];

const rawColor = new RegExp(
  `\\b(?:${COLOR_UTILITIES.join("|")})-(?:${RAW_COLORS.join("|")})(?:-[0-9]{1,3})?\\b`,
  "g",
);

async function* walk(dir) {
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name === "node_modules" || entry.name === ".next") continue;
      yield* walk(full);
    } else if ([".ts", ".tsx"].includes(extname(entry.name))) {
      yield full;
    }
  }
}

let violations = 0;
for await (const file of walk("src")) {
  const text = await readFile(file, "utf8");
  for (const match of text.matchAll(rawColor)) {
    const line = text.slice(0, match.index).split("\n").length;
    console.error(`  ${relative(process.cwd(), file)}:${line}  "${match[0]}"`);
    violations++;
  }
}

if (violations > 0) {
  console.error(
    `\n✗ ${violations} raw Tailwind color(s) found. Use design tokens (primary, accent, muted, border, card, destructive, success, warning, foreground, background) instead.`,
  );
  process.exit(1);
}
console.log("✓ Design tokens: no raw palette colors found.");
