#!/usr/bin/env node
// Growth Watchdog metrics — queries Supabase `events` + Stripe revenue and prints
// a structured summary the watchdog agent evaluates against the Day 7/14/30 gates.
// Run from the repo root: `node scripts/growth-check.mjs`

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

const summary = {
  product: "quarterline",
  events_table_ok: false,
  events: {},
  gross_revenue_usd: null,
  days_since_first_event: null,
};

if (supabaseUrl && serviceKey) {
  const supabase = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false } });
  const { data, error } = await supabase
    .from("events")
    .select("event, created_at")
    .order("created_at", { ascending: true });

  if (error) {
    summary.events_error = error.message;
  } else {
    summary.events_table_ok = true;
    const counts = {};
    let first = null;
    for (const e of data || []) {
      counts[e.event] = (counts[e.event] || 0) + 1;
      if (!first || e.created_at < first) first = e.created_at;
    }
    summary.events = counts;
    if (first) {
      summary.days_since_first_event = Math.max(0, Math.ceil((Date.now() - new Date(first).getTime()) / 86_400_000));
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
