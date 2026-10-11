import { NextRequest, NextResponse } from "next/server";
import { timingSafeEqual } from "node:crypto";
import { createAdminClient } from "@/lib/supabase/admin";

export type TicketStatus = "new" | "in_progress" | "resolved" | "dismissed";
export type TicketCategory = "complaint" | "comment" | "billing" | "bug" | "general";

const TICKET_STATUSES: readonly string[] = ["new", "in_progress", "resolved", "dismissed"];
const TICKET_CATEGORIES: readonly string[] = ["complaint", "comment", "billing", "bug", "general"];

const MAX_NAME = 120;
const MAX_SUBJECT = 200;
const MAX_MESSAGE = 4000;
const MAX_ROWS = 100;

/**
 * Customer-service endpoint over the Supabase `events` table (`event = 'customer_service'`).
 *
 * ACCESS MODEL — this route is on a PUBLIC page (`/billing`), and every read/write below runs
 * through the service-role client, so the split is enforced here rather than by RLS:
 *
 *   POST  /api/support                                   public — file a ticket.
 *   GET   /api/support?ticket_id=…&email=…               public — read back ONE ticket, and only
 *                                                        when BOTH the ticket id and the email it
 *                                                        was filed with are supplied.
 *   GET   /api/support  (any list/filter form)           admin  — requires SUPPORT_ADMIN_TOKEN.
 *   PATCH /api/support                                   admin  — requires SUPPORT_ADMIN_TOKEN.
 *
 * The public GET deliberately cannot enumerate: without the admin token it filters on the
 * ticket_id + email pair and returns at most that one row. With no token configured on the
 * deployment the admin paths return an explicit 403 — they never fall back to an open listing.
 */
function generateTicketId(): string {
  const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, "");
  const rand = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `TKT-${dateStr}-${rand}`;
}

/** The configured admin secret, or null when the deployment has not set one. */
function resolveAdminToken(): string | null {
  const configured = (process.env.SUPPORT_ADMIN_TOKEN || "").trim();
  // A short secret is not a secret; treat anything under 16 chars as unconfigured.
  return configured.length >= 16 ? configured : null;
}

function presentedToken(req: NextRequest): string {
  const auth = req.headers.get("authorization") || "";
  if (/^bearer\s+/i.test(auth)) {
    return auth.replace(/^bearer\s+/i, "").trim();
  }
  return (req.headers.get("x-support-admin-token") || "").trim();
}

function isAdminRequest(req: NextRequest): boolean {
  const configured = resolveAdminToken();
  if (!configured) return false;
  const presented = presentedToken(req);
  if (presented.length !== configured.length) return false;
  return timingSafeEqual(Buffer.from(presented), Buffer.from(configured));
}

interface EventRow {
  id: unknown;
  product?: string | null;
  payload?: unknown;
  created_at?: string | null;
}

interface TicketView {
  id: unknown;
  ticket_id: string;
  name: string;
  email: string;
  category: string;
  product: string;
  subject: string;
  message: string;
  status: string;
  priority: string;
  created_at: string;
  updated_at: string;
}

function toTicket(row: EventRow): TicketView {
  const p = (row.payload as Record<string, unknown>) || {};
  return {
    id: row.id,
    ticket_id: (p.ticket_id as string) || `TKT-${row.id}`,
    name: (p.name as string) || "",
    email: (p.email as string) || "",
    category: (p.category as string) || "general",
    product: row.product || (p.product as string) || "factory",
    subject: (p.subject as string) || "",
    message: (p.message as string) || "",
    status: (p.status as string) || "new",
    priority: (p.priority as string) || "medium",
    created_at: (p.created_at as string) || row.created_at || "",
    updated_at: (p.updated_at as string) || row.created_at || "",
  };
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      email,
      name = "",
      category = "general",
      product = "factory",
      subject,
      message,
      priority = "medium",
    } = body;

    if (!email || typeof email !== "string" || !email.includes("@")) {
      return NextResponse.json({ error: "A valid email address is required." }, { status: 400 });
    }

    if (!subject || typeof subject !== "string" || subject.trim().length === 0) {
      return NextResponse.json({ error: "Subject is required." }, { status: 400 });
    }

    if (!message || typeof message !== "string" || message.trim().length < 5) {
      return NextResponse.json({ error: "Message must be at least 5 characters long." }, { status: 400 });
    }

    if (
      String(subject).trim().length > MAX_SUBJECT ||
      String(message).trim().length > MAX_MESSAGE ||
      String(name).trim().length > MAX_NAME
    ) {
      return NextResponse.json(
        {
          error: `Submission too long — subject ≤ ${MAX_SUBJECT}, message ≤ ${MAX_MESSAGE}, name ≤ ${MAX_NAME} characters.`,
        },
        { status: 413 },
      );
    }

    const safeCategory = TICKET_CATEGORIES.includes(String(category).trim())
      ? String(category).trim()
      : "general";

    const ticketId = generateTicketId();
    const now = new Date().toISOString();

    const payload = {
      ticket_id: ticketId,
      name: String(name).trim(),
      email: String(email).trim().toLowerCase(),
      category: safeCategory as TicketCategory,
      product: String(product).trim(),
      subject: String(subject).trim(),
      message: String(message).trim(),
      status: "new" as TicketStatus,
      priority: String(priority).trim(),
      notes: [],
      created_at: now,
      updated_at: now,
    };

    const supabase = createAdminClient();
    const { data, error } = await supabase
      .from("events")
      .insert({
        event: "customer_service",
        product: String(product).trim(),
        payload,
      })
      .select("id, created_at")
      .single();

    if (error) {
      console.error("[support] failed to insert into Supabase:", error);
      return NextResponse.json({ error: `Database error: ${error.message}` }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      ticket_id: ticketId,
      status: "new",
      id: data?.id,
      created_at: data?.created_at || now,
      message: "Your message has been submitted. Our team will review it shortly.",
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const ticketId = (searchParams.get("ticket_id") || "").trim();
    const email = (searchParams.get("email") || "").trim().toLowerCase();
    const query = (searchParams.get("query") || "").trim();
    const status = (searchParams.get("status") || "").trim();
    const requested = Number(searchParams.get("limit") || 25);
    const limit = Math.min(Math.max(Number.isFinite(requested) ? requested : 25, 1), MAX_ROWS);

    const admin = isAdminRequest(req);

    if (!admin) {
      if (!ticketId || !email) {
        return NextResponse.json(
          {
            error:
              "Ticket lookup requires both 'ticket_id' and 'email' — the pair the ticket was filed with.",
          },
          { status: 400 },
        );
      }
      if (query || status) {
        return NextResponse.json(
          { error: "Listing or filtering tickets requires a support admin token." },
          { status: 403 },
        );
      }
    }

    const supabase = createAdminClient();

    let dbQuery = supabase
      .from("events")
      .select("id, event, product, payload, created_at")
      .eq("event", "customer_service")
      .order("created_at", { ascending: false })
      .limit(admin ? limit : 1);

    if (ticketId) {
      dbQuery = dbQuery.eq("payload->>ticket_id", ticketId);
    }
    if (email) {
      dbQuery = dbQuery.eq("payload->>email", email);
    }
    if (admin && status) {
      dbQuery = dbQuery.eq("payload->>status", status);
    }

    const { data, error } = await dbQuery;

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const tickets = ((data || []) as EventRow[]).map(toTicket);

    const filtered =
      admin && query
        ? tickets.filter(
            (t) =>
              t.ticket_id.toLowerCase().includes(query.toLowerCase()) ||
              t.email.toLowerCase().includes(query.toLowerCase()) ||
              t.subject.toLowerCase().includes(query.toLowerCase()) ||
              t.message.toLowerCase().includes(query.toLowerCase()),
          )
        : tickets;

    return NextResponse.json({
      success: true,
      scope: admin ? "admin" : "self",
      count: filtered.length,
      tickets: filtered,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    if (!resolveAdminToken()) {
      console.error("[support] PATCH refused: SUPPORT_ADMIN_TOKEN is not configured on this deployment.");
      return NextResponse.json(
        { error: "Ticket status updates are unavailable: SUPPORT_ADMIN_TOKEN is not configured." },
        { status: 403 },
      );
    }

    if (!isAdminRequest(req)) {
      return NextResponse.json(
        { error: "A valid support admin token is required to change a ticket." },
        { status: 401 },
      );
    }

    const body = await req.json();
    const { ticket_id, id, status, note } = body;

    if (!status || !TICKET_STATUSES.includes(status)) {
      return NextResponse.json(
        { error: "Invalid status. Allowed: 'new', 'in_progress', 'resolved', 'dismissed'." },
        { status: 400 },
      );
    }

    if (!ticket_id && !id) {
      return NextResponse.json(
        { error: "Either 'ticket_id' or 'id' is required to update a ticket." },
        { status: 400 },
      );
    }

    const supabase = createAdminClient();

    let fetchQuery = supabase
      .from("events")
      .select("id, payload")
      .eq("event", "customer_service");

    if (id) {
      fetchQuery = fetchQuery.eq("id", id);
    } else {
      fetchQuery = fetchQuery.eq("payload->>ticket_id", ticket_id);
    }

    const { data: rows, error: fetchErr } = await fetchQuery.limit(1);

    if (fetchErr || !rows || rows.length === 0) {
      return NextResponse.json({ error: "Ticket not found." }, { status: 404 });
    }

    const targetRow = rows[0] as EventRow;
    const currentPayload = (targetRow.payload as Record<string, unknown>) || {};
    const now = new Date().toISOString();

    const notes = Array.isArray(currentPayload.notes) ? [...(currentPayload.notes as unknown[])] : [];
    if (note && typeof note === "string") {
      notes.push({ text: note.trim(), timestamp: now });
    }

    const updatedPayload: Record<string, unknown> = {
      ...currentPayload,
      status,
      notes,
      updated_at: now,
    };

    const { error: updateErr } = await supabase
      .from("events")
      .update({ payload: updatedPayload })
      .eq("id", targetRow.id);

    if (updateErr) {
      return NextResponse.json({ error: updateErr.message }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      ticket_id: (updatedPayload.ticket_id as string) || ticket_id,
      status,
      updated_at: now,
      message: `Ticket status updated to '${status}'.`,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
