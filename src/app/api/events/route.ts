import { NextRequest, NextResponse } from "next/server";
import { track } from "@/lib/telemetry";
import { classifyRequest } from "@/lib/traffic-class";

/**
 * Client-side telemetry endpoint. The browser posts lightweight events
 * (page_view, export_click, checkout_click) with an optional `payload` that now
 * always carries a `session_id` (from src/lib/telemetry-client.ts) so the
 * growth-watchdog can evaluate the Day 7/14/30 gates on DISTINCT sessions/visitors
 * rather than raw event counts. Events are persisted to Supabase `events`.
 *
 * Every row also carries the internal-traffic marker (src/lib/traffic-class.ts): a request from
 * our own browser suites, a probe, or a browser marked with `?factory_internal=1` is `internal`,
 * everyone else is a `visitor`. The class is decided HERE, from headers/cookies/UA — never from
 * the request body, which a caller could claim.
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const event = typeof body?.event === "string" ? body.event : null;
    if (!event) {
      return NextResponse.json({ error: "Missing event name" }, { status: 400 });
    }
    await track(
      event,
      body?.payload ?? {},
      typeof body?.product === "string" ? body.product : undefined,
      classifyRequest(req),
    );
    return NextResponse.json({ ok: true });
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Event tracking failure";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
