#!/usr/bin/env node
// Growth Watchdog metrics — queries Supabase `events` (scoped to the quarterline product) +
// Stripe revenue and prints a structured summary the watchdog agent evaluates against the
// Day 7/14/30 kill/scale gates.
//
// Day-7 gate (quarterline): >= 50 UNIQUE sessions + >= 1 export. The unique-session metric is
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
// Requires NEXT_PUBLIC_SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY (and STRIPE_SECRET_KEY for the
// revenue block); without them the script reports how many metrics it could not compute.

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
const stripeKey = process.env.STRIPE_SECRET_KEY;
const PRODUCT = process.argv[2] || process.env.GROWTH_PRODUCT || "quarterline";
const GATE_WINDOW_DAYS = Number(process.env.GATE_WINDOW_DAYS ?? 7);

const summary = {
  product: PRODUCT,
  events_table_ok: false,
  events: {},
  unique_sessions: null,
  unique_sessions_last_7d: null,
  unique_sessions_window_days: GATE_WINDOW_DAYS,
  unique_sessions_product: PRODUCT,
  gross_revenue_usd: null,
  days_since_first_event: null,
};

if (supabaseUrl && serviceKey) {
  const supabase = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false } });

  // Prefer the dedicated session_id column; fall back to payload-only if migration 0002 has
  // not been applied (the column select would otherwise error).
  let result = await supabase
    .from("events")
    .select("event, created_at, payload, product, session_id")
    .order("created_at", { ascending: true });
  let hasSessionColumn = true;
  if (result.error) {
    hasSessionColumn = false;
    result = await supabase
      .from("events")
      .select("event, created_at, payload, product")
      .order("created_at", { ascending: true });
  }
  const data = result.data;
  const error = result.error;

  if (error) {
    summary.events_error = error.message;
  } else {
    summary.events_table_ok = true;
    summary.session_id_column = hasSessionColumn;
    const counts = {};
    const sessionIdsAll = new Set();
    const sessionIdsWindow = new Set();
    const cutoff = new Date(Date.now() - GATE_WINDOW_DAYS * 86_400_000);
    let first = null;
    let instrumentedRows = 0;
    let quarterlineRows = 0;
    for (const e of data || []) {
      if (e.product !== PRODUCT) continue; // scope gate metrics to the quarterline product
      quarterlineRows += 1;
      counts[e.event] = (counts[e.event] || 0) + 1;
      if (!first || e.created_at < first) first = e.created_at;
      const sid =
        e.session_id ||
        (e.payload && typeof e.payload.session_id === "string" && e.payload.session_id
          ? e.payload.session_id
          : null);
      if (sid) {
        instrumentedRows += 1;
        sessionIdsAll.add(sid);
        if (new Date(e.created_at).getTime() >= cutoff.getTime()) sessionIdsWindow.add(sid);
      }
    }
    summary.events = counts;
    summary.unique_sessions = sessionIdsAll.size;
    summary.unique_sessions_last_7d = sessionIdsWindow.size;
    summary.quarterline_event_rows = quarterlineRows;
    summary.session_instrumented_rows = instrumentedRows;
    if (first) {
      summary.days_since_first_event = Math.max(
        0,
        Math.ceil((Date.now() - new Date(first).getTime()) / 86_400_000),
      );
    }
  }
} else {
  summary.events_error = "Supabase env not configured (NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY).";
}

if (stripeKey) {
  try {
    const res = await fetch("https://api.stripe.com/v1/charges?limit=100", {
      headers: { Authorization: `Bearer ${stripeKey}` },
    });
    if (res.ok) {
      const j = await res.json();
      summary.gross_revenue_usd = j.data.reduce((sum, c) => sum + c.amount / 100, 0);
      summary.charge_count = j.data.length;
    } else {
      summary.stripe_error = `HTTP ${res.status}`;
    }
  } catch (e) {
    summary.stripe_error = e.message;
  }
} else {
  summary.stripe_error = "STRIPE_SECRET_KEY not configured.";
}

console.log(JSON.stringify(summary, null, 2));
