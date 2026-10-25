#!/usr/bin/env node
// Growth Watchdog metrics — queries Supabase `events` (scoped to the LIVE products in
// src/products/registry.ts) + Stripe revenue and prints a structured summary the watchdog agent
// evaluates against the Day 7/14/30 kill/scale gates.
//
// SCOPE (fixed 2026-10-25, owner: "re-point the growth check"). This script used to default to
// `quarterline`, which the owner killed on 2026-09-19 — so every weekly run scored visitors,
// sessions and gates against a retired product and honestly reported zero. The scope is now
// derived from the registry at run time: default = every product whose status is not `killed`,
// aggregated (totals are the gate inputs) with a per-product breakdown alongside. Pass a slug to
// narrow to one product (`node scripts/growth-check.mjs parcelproof`). A slug that names a retired
// or unregistered product is an explicit error, never a silent zero.
//
// Day-7 gate: >= 50 UNIQUE sessions + >= 1 export. The unique-session metric is
// derived from the `session_id` the client attaches to EVERY event payload
// (src/lib/telemetry-client.ts; a `ql_session_id` cookie), promoted to the
// `events.session_id` column by supabase/migrations/0002_events_session_id.sql. This script
// reads the dedicated column when present and falls back to extracting `session_id` from the
// payload jsonb if the migration has NOT been applied yet — so it never breaks, only degrades.
//
// HONESTY (Day-7 criterion): raw page_view counts are NOT unique sessions. Historical events
// recorded before this instrumentation carry no `session_id`, so `unique_sessions` reflects only
// newly-instrumented traffic. `events` still tallies every row but cannot answer ">= 50 unique
// sessions". Gate window defaults to 7 days; set GATE_WINDOW_DAYS to override.
//
// Run from the repo root: `node scripts/growth-check.mjs`.
// Requires NEXT_PUBLIC_SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY (and STRIPE_MODE plus that
// mode's key for the revenue block); without them the script reports how many metrics it could
// not compute.

import { readFileSync, existsSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";

function loadEnvFile(path) {
  if (!existsSync(path)) return;
  for (const line of readFileSync(path, "utf8").split("\n")) {
    const t = line.trim();
    if (!t || t.startsWith("#")) continue;
    const eq = t.indexOf("=");
    if (eq === -1) continue;
    const key = t.slice(0, eq).trim();
    let value = t.slice(eq + 1).trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    if (key && process.env[key] === undefined) process.env[key] = value;
  }
}
loadEnvFile(".env.local");
loadEnvFile(".env");

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
// Stripe mode (mirrors src/lib/stripe/mode.ts): revenue is only real when the key came from live
// mode. A sandbox key returns sandbox charges — counting those as gate revenue is the 2026-09-11
// misreport this script now refuses to repeat.
const stripeMode = (process.env.STRIPE_MODE || "").trim().toLowerCase();
const stripeKey =
  (stripeMode === "live" ? process.env.STRIPE_SECRET_KEY_LIVE : process.env.STRIPE_SECRET_KEY_TEST) ||
  process.env.STRIPE_SECRET_KEY;
const stripeKeyPrefix = stripeMode === "live" ? "sk_live_" : "sk_test_";
const GATE_WINDOW_DAYS = Number(process.env.GATE_WINDOW_DAYS ?? 7);

// ---------------------------------------------------------------------------------------------
// Product scope, derived from the registry — never a hard-coded default slug. src/products/
// registry.ts is TypeScript and this is a bare .mjs run from the repo root, so the entries are
// read textually: each `slug:` is paired with the nearest following `status:`. A registry that
// cannot be parsed is reported, not guessed around.
// ---------------------------------------------------------------------------------------------
const REGISTRY_PATH = "src/products/registry.ts";
function readRegistry() {
  if (!existsSync(REGISTRY_PATH)) return { error: `${REGISTRY_PATH} not found — run from the repo root` };
  const src = readFileSync(REGISTRY_PATH, "utf8");
  const entries = [];
  const re = /slug:\s*"([a-z0-9_]+)"[\s\S]*?status:\s*"(live|beta|killed|dead|retired)"/g;
  let m;
  while ((m = re.exec(src))) entries.push({ slug: m[1], status: m[2] });
  if (!entries.length) return { error: `no slug/status pairs parsed from ${REGISTRY_PATH}` };
  return { entries };
}
const registry = readRegistry();
const allSlugs = registry.error ? [] : registry.entries.map((e) => e.slug);
const activeSlugs = registry.error ? [] : registry.entries.filter((e) => e.status !== "killed").map((e) => e.slug);
const retiredSlugs = registry.error ? [] : registry.entries.filter((e) => e.status === "killed").map((e) => e.slug);

const rawProduct = (process.argv[2] || process.env.GROWTH_PRODUCT || "all").trim();
const wantsAll = rawProduct === "all" || rawProduct === "*";
// scope === null means "every active product"; an array means exactly those slugs.
const scope = wantsAll ? null : rawProduct.split(",").map((s) => s.trim()).filter(Boolean);
const productLabel = wantsAll ? "all_live" : rawProduct;
const scopeSlugs = scope === null ? activeSlugs : scope;

const summary = {
  product: productLabel,
  products: scopeSlugs,
  retired_products_excluded: registry.error ? [] : retiredSlugs,
  events_table_ok: false,
  events: {},
  unique_sessions: null,
  unique_sessions_last_7d: null,
  unique_sessions_window_days: GATE_WINDOW_DAYS,
  unique_sessions_product: productLabel,
  gross_revenue_usd: null,
  days_since_first_event: null,
  stripe_mode: stripeMode || "unset",
  revenue_is_sandbox: null,
};

if (registry.error) {
  summary.registry_error = registry.error;
} else if (scope !== null) {
  // A named slug that is retired or unknown would otherwise read as zero traffic — the exact
  // failure this fix exists to end. Name it and refuse to score.
  const bad = scope.filter((s) => !allSlugs.includes(s));
  const dead = scope.filter((s) => retiredSlugs.includes(s));
  if (bad.length) summary.product_error = `unknown product slug(s): ${bad.join(", ")} — registry has ${allSlugs.join(", ")}`;
  if (dead.length) summary.product_error = `retired product slug(s): ${dead.join(", ")} — killed products are not a growth gate; omit the argument to score every live product`;
}


if (supabaseUrl && serviceKey) {
  const supabase = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false } });

  // Read the columns the gate needs, degrading ONE migration at a time: `traffic_class` (0004,
  // internal-traffic marker) and `session_id` (0002) may each be pending, and a pending migration
  // must never blind the whole gate. Whichever column is absent is reported in the summary, and
  // both values still exist in `payload` (src/lib/telemetry.ts mirrors them there), so the split
  // below is computed from the column when present and the payload otherwise.
  const candidates = [
    { cols: "event, created_at, payload, product, session_id, traffic_class", session: true, traffic: true },
    { cols: "event, created_at, payload, product, session_id", session: true, traffic: false },
    { cols: "event, created_at, payload, product", session: false, traffic: false },
  ];
  let data = null;
  let error = null;
  let hasSessionColumn = false;
  let hasTrafficColumn = false;
  // PostgREST caps an unpaginated select at ~1000 rows, so a single read returned only the OLDEST
  // page of the whole store: every product first written after that page read as "0 rows", and the
  // gate leg silently reported zero traffic. Page explicitly, and say so if the hard cap is hit.
  const PAGE = 1000;
  const MAX_ROWS = 200_000;
  let rowsCapped = false;
  for (const c of candidates) {
    const rows = [];
    let failed = null;
    for (let from = 0; from < MAX_ROWS; from += PAGE) {
      const r = await supabase
        .from("events")
        .select(c.cols)
        .order("created_at", { ascending: true })
        .range(from, from + PAGE - 1);
      if (r.error) {
        failed = r.error;
        break;
      }
      rows.push(...(r.data || []));
      if (!r.data || r.data.length < PAGE) break;
      if (from + PAGE >= MAX_ROWS) rowsCapped = true;
    }
    if (!failed) {
      data = rows;
      hasSessionColumn = c.session;
      hasTrafficColumn = c.traffic;
      error = null;
      break;
    }
    error = failed;
  }
  if (rowsCapped) {
    // Never silent: a truncated read is a partial answer, not a zero.
    summary.events_read_capped = `stopped at ${MAX_ROWS} rows — totals below are a partial read`;
  }

  if (error) {
    summary.events_error = error.message;
  } else {
    summary.events_table_ok = true;
    summary.session_id_column = hasSessionColumn;
    // One accumulator per in-scope product, then a merged total. The gate fields below are the
    // TOTAL across the live fleet (what the Day 7/14/30 gates should score); `per_product` carries
    // the split so a single dead product can never hide inside a healthy average again.
    const mkAcc = () => ({
      rows: 0,
      counts: {},
      countsVisitor: {},
      countsInternal: {},
      unclassifiedRows: 0,
      instrumentedRows: 0,
      first: null,
      sessAll: new Set(),
      sessWindow: new Set(),
      sessVisitor: new Set(),
      sessVisitorWindow: new Set(),
      sessVisitorSinceMarker: new Set(),
      sessInternal: new Set(),
      sessUnclassified: new Set(),
    });
    const perProduct = {};
    for (const slug of scopeSlugs) perProduct[slug] = mkAcc();
    const outOfScopeRows = {};
    const cutoff = new Date(Date.now() - GATE_WINDOW_DAYS * 86_400_000);
    // The marker's own class, from the column when migration 0004 is applied and from the mirrored
    // payload field otherwise. A row with neither is PRE-MARKER: `unclassified`, never guessed.
    const trafficOf = (e) => {
      const fromColumn = typeof e.traffic_class === "string" ? e.traffic_class : null;
      const fromPayload =
        e.payload && typeof e.payload.traffic_class === "string" ? e.payload.traffic_class : null;
      const value = fromColumn || fromPayload;
      return value === "internal" || value === "visitor" ? value : "unclassified";
    };

    // When the marker went live: the earliest row in the whole store that carries a class. Derived,
    // never a hand-written date — a date constant would silently claim coverage it never had.
    let markerSince = null;
    for (const e of data || []) {
      if (trafficOf(e) === "unclassified") continue;
      if (!markerSince || e.created_at < markerSince) markerSince = e.created_at;
    }

    for (const e of data || []) {
      const traffic = trafficOf(e);
      const acc = perProduct[e.product];
      if (!acc) {
        // Out of scope on purpose (retired or unregistered slug) — counted, never silently dropped.
        const key = e.product || "(no product)";
        outOfScopeRows[key] = (outOfScopeRows[key] || 0) + 1;
        continue;
      }
      acc.rows += 1;
      acc.counts[e.event] = (acc.counts[e.event] || 0) + 1;
      if (!acc.first || e.created_at < acc.first) acc.first = e.created_at;
      if (traffic === "visitor") acc.countsVisitor[e.event] = (acc.countsVisitor[e.event] || 0) + 1;
      if (traffic === "internal") acc.countsInternal[e.event] = (acc.countsInternal[e.event] || 0) + 1;
      if (traffic === "unclassified") acc.unclassifiedRows += 1;
      const sid =
        e.session_id ||
        (e.payload && typeof e.payload.session_id === "string" && e.payload.session_id
          ? e.payload.session_id
          : null);
      if (sid) {
        acc.instrumentedRows += 1;
        acc.sessAll.add(sid);
        if (new Date(e.created_at).getTime() >= cutoff.getTime()) acc.sessWindow.add(sid);
        if (traffic === "visitor") {
          acc.sessVisitor.add(sid);
          if (new Date(e.created_at).getTime() >= cutoff.getTime()) acc.sessVisitorWindow.add(sid);
          if (markerSince === null || e.created_at >= markerSince) acc.sessVisitorSinceMarker.add(sid);
        }
        if (traffic === "internal") acc.sessInternal.add(sid);
        if (traffic === "unclassified") acc.sessUnclassified.add(sid);
      }
    }

    const total = mkAcc();
    for (const acc of Object.values(perProduct)) {
      total.rows += acc.rows;
      for (const [k, v] of Object.entries(acc.counts)) total.counts[k] = (total.counts[k] || 0) + v;
      for (const [k, v] of Object.entries(acc.countsVisitor))
        total.countsVisitor[k] = (total.countsVisitor[k] || 0) + v;
      for (const [k, v] of Object.entries(acc.countsInternal))
        total.countsInternal[k] = (total.countsInternal[k] || 0) + v;
      total.unclassifiedRows += acc.unclassifiedRows;
      total.instrumentedRows += acc.instrumentedRows;
      if (acc.first && (!total.first || acc.first < total.first)) total.first = acc.first;
      for (const key of [
        "sessAll",
        "sessWindow",
        "sessVisitor",
        "sessVisitorWindow",
        "sessVisitorSinceMarker",
        "sessInternal",
        "sessUnclassified",
      ]) {
        for (const sid of acc[key]) total[key].add(sid);
      }
    }

    summary.events = total.counts;
    summary.events_visitor = total.countsVisitor;
    summary.events_internal = total.countsInternal;
    summary.unique_sessions = total.sessAll.size;
    summary.unique_sessions_last_7d = total.sessWindow.size;
    summary.unique_sessions_visitor = total.sessVisitor.size;
    summary.unique_sessions_visitor_last_7d = total.sessVisitorWindow.size;
    summary.unique_sessions_internal = total.sessInternal.size;
    summary.unique_sessions_visitor_since_marker = total.sessVisitorSinceMarker.size;
    summary.unique_sessions_unclassified = total.sessUnclassified.size;
    summary.rows_unclassified = total.unclassifiedRows;
    summary.product_event_rows = total.rows;
    summary.quarterline_event_rows = total.rows; // legacy key kept for the watchdog prompts; now scoped rows
    summary.session_instrumented_rows = total.instrumentedRows;
    summary.per_product = Object.fromEntries(
      Object.entries(perProduct).map(([slug, acc]) => [
        slug,
        {
          event_rows: acc.rows,
          events: acc.counts,
          unique_sessions: acc.sessAll.size,
          unique_sessions_last_7d: acc.sessWindow.size,
          unique_sessions_visitor: acc.sessVisitor.size,
          unique_sessions_internal: acc.sessInternal.size,
          unique_sessions_visitor_since_marker: acc.sessVisitorSinceMarker.size,
          days_since_first_event: acc.first
            ? Math.max(0, Math.ceil((Date.now() - new Date(acc.first).getTime()) / 86_400_000))
            : null,
        },
      ]),
    );
    summary.out_of_scope_event_rows = outOfScopeRows;
    summary.traffic_marker = {
      column: hasTrafficColumn,
      column_state: hasTrafficColumn
        ? "events.traffic_class (migration 0004 applied)"
        : "payload.traffic_class only (migration 0004 NOT applied — run supabase/migrations/0004_events_traffic_class.sql)",
      marker_since: markerSince,
      gate_leg: "unique_sessions_visitor / unique_sessions_visitor_last_7d — internal traffic is EXCLUDED",
      pre_marker_rows_are_unclassified: true,
    };
    if (total.first) {
      summary.days_since_first_event = Math.max(
        0,
        Math.ceil((Date.now() - new Date(total.first).getTime()) / 86_400_000),
      );
    }
  }
} else {
  summary.events_error = "Supabase env not configured (NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY).";
}

if (stripeKey) {
  if (stripeMode !== "live" && stripeMode !== "test") {
    summary.stripe_error =
      "STRIPE_MODE is not set — cannot tell sandbox charges from real revenue. Set STRIPE_MODE=test|live.";
  } else if (!stripeKey.startsWith(stripeKeyPrefix)) {
    summary.stripe_error = `Stripe key does not match STRIPE_MODE=${stripeMode} (expected ${stripeKeyPrefix}…).`;
  } else {
    try {
      const res = await fetch("https://api.stripe.com/v1/charges?limit=100", {
        headers: { Authorization: `Bearer ${stripeKey}` },
      });
      if (res.ok) {
        const j = await res.json();
        summary.gross_revenue_usd = j.data.reduce((sum, c) => sum + c.amount / 100, 0);
        summary.charge_count = j.data.length;
        if (stripeMode !== "live") {
          summary.revenue_is_sandbox = true;
          summary.revenue_mode_warning =
            "These charges are SANDBOX (test mode) — not real revenue. Set STRIPE_MODE=live with the live key to measure revenue.";
        }
      } else {
        summary.stripe_error = `HTTP ${res.status}`;
      }
    } catch (e) {
      summary.stripe_error = e.message;
    }
  }
} else {
  summary.stripe_error =
    "No Stripe key configured (expected STRIPE_MODE + STRIPE_SECRET_KEY_TEST/STRIPE_SECRET_KEY_LIVE).";
}

console.log(JSON.stringify(summary, null, 2));
