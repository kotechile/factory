import { NextRequest, NextResponse } from "next/server";
import { track } from "@/lib/telemetry";

/**
 * Client-side telemetry endpoint. The browser posts lightweight events
 * (page_view, export_click, checkout_click); they are persisted to Supabase
 * `events` so the growth-watchdog can evaluate the Day 7/14/30 gates.
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
    );
    return NextResponse.json({ ok: true });
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Event tracking failure";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
