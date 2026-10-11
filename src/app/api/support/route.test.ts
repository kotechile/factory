import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

/**
 * Guard for the /api/support access model (the route runs on a PUBLIC page and every query below
 * goes through the service-role client, so the split is enforced in the handler):
 *
 *   anonymous GET must present BOTH the ticket_id and the email it was filed with → at most that row
 *   anonymous GET must not list, filter or enumerate
 *   PATCH is admin-only
 *
 * If someone later "simplifies" the handler back into an open listing, these tests go red.
 */

const eqCalls: [string, unknown][] = [];
const state: { rows: unknown[]; inserted: Record<string, unknown>[]; updated: Record<string, unknown>[] } = {
  rows: [],
  inserted: [],
  updated: [],
};

function builder() {
  const self: Record<string, unknown> = {};
  const chain = () => self;
  Object.assign(self, {
    select: chain,
    insert: (row: Record<string, unknown>) => {
      state.inserted.push(row);
      return self;
    },
    update: (patch: Record<string, unknown>) => {
      state.updated.push(patch);
      return self;
    },
    eq: (col: string, val: unknown) => {
      eqCalls.push([col, val]);
      return self;
    },
    order: chain,
    limit: chain,
    single: () => Promise.resolve({ data: { id: 7, created_at: "2026-10-11T00:00:00.000Z" }, error: null }),
    then: (resolve: (v: unknown) => unknown) => Promise.resolve({ data: state.rows, error: null }).then(resolve),
  });
  return self;
}

vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: () => ({ from: () => builder() }),
}));

const { GET, POST, PATCH } = await import("./route");

function getWith(query: string, token?: string) {
  return new NextRequest(`http://localhost/api/support${query}`, {
    headers: token ? { authorization: `Bearer ${token}` } : {},
  });
}

function jsonWith(method: string, body: unknown, token?: string) {
  return new NextRequest("http://localhost/api/support", {
    method,
    body: JSON.stringify(body),
    headers: {
      "content-type": "application/json",
      ...(token ? { authorization: `Bearer ${token}` } : {}),
    },
  });
}

beforeEach(() => {
  eqCalls.length = 0;
  state.rows = [];
  state.inserted.length = 0;
  state.updated.length = 0;
  delete process.env.SUPPORT_ADMIN_TOKEN;
});

describe("POST /api/support — public filing", () => {
  it("files a ticket and returns a reference id", async () => {
    const res = await POST(jsonWith("POST", { email: "buyer@example.com", subject: "Wrong tariff", message: "The UPS band looks off" }));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.ticket_id).toMatch(/^TKT-\d{8}-[A-Z0-9]{4}$/);
    expect(state.inserted[0].event).toBe("customer_service");
  });

  it("rejects a submission with no usable email or a too-short message", async () => {
    expect((await POST(jsonWith("POST", { subject: "a", message: "hello" }))).status).toBe(400);
    expect((await POST(jsonWith("POST", { email: "a@b.co", subject: "s", message: "x" }))).status).toBe(400);
  });
});

describe("GET /api/support — anonymous is self-scoped only", () => {
  it("refuses an unqualified read instead of listing tickets", async () => {
    const res = await GET(getWith(""));
    expect(res.status).toBe(400);
    expect(eqCalls).toHaveLength(0);
  });

  it("refuses a ticket_id lookup that is not paired with the filing email", async () => {
    const res = await GET(getWith("?ticket_id=TKT-20261011-ABCD"));
    expect(res.status).toBe(400);
    expect(eqCalls).toHaveLength(0);
  });

  it("refuses an anonymous listing/filter even when a ticket id is present", async () => {
    const res = await GET(getWith("?ticket_id=TKT-20261011-ABCD&email=buyer@example.com&status=resolved"));
    expect(res.status).toBe(403);
  });

  it("looks up exactly the id+email pair and returns that single ticket", async () => {
    state.rows = [
      {
        id: 7,
        product: "parcelproof",
        created_at: "2026-10-11T00:00:00.000Z",
        payload: {
          ticket_id: "TKT-20261011-ABCD",
          email: "buyer@example.com",
          subject: "Wrong tariff",
          message: "The UPS band looks off",
          status: "in_progress",
        },
      },
    ];
    const res = await GET(getWith("?ticket_id=TKT-20261011-ABCD&email=Buyer@Example.com"));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.scope).toBe("self");
    expect(body.count).toBe(1);
    expect(body.tickets[0].ticket_id).toBe("TKT-20261011-ABCD");
    // both halves of the pair are applied, and the email is normalised
    expect(eqCalls).toEqual(
      expect.arrayContaining([
        ["payload->>ticket_id", "TKT-20261011-ABCD"],
        ["payload->>email", "buyer@example.com"],
      ]),
    );
  });
});

describe("admin paths — closed unless SUPPORT_ADMIN_TOKEN is configured", () => {
  it("refuses to update a ticket while no admin token is configured", async () => {
    const res = await PATCH(jsonWith("PATCH", { ticket_id: "TKT-20261011-ABCD", status: "resolved" }));
    expect(res.status).toBe(403);
    expect(state.updated).toHaveLength(0);
  });

  it("refuses a reader without the token even when one is configured", async () => {
    process.env.SUPPORT_ADMIN_TOKEN = "a".repeat(32);
    const res = await PATCH(jsonWith("PATCH", { ticket_id: "TKT-20261011-ABCD", status: "resolved" }, "b".repeat(32)));
    expect(res.status).toBe(401);
    expect(state.updated).toHaveLength(0);
  });

  it("lets the token holder list unfiltered, and update a ticket", async () => {
    process.env.SUPPORT_ADMIN_TOKEN = "a".repeat(32);
    const list = await GET(getWith("?status=new", "a".repeat(32)));
    expect(list.status).toBe(200);
    expect((await list.json()).scope).toBe("admin");

    state.rows = [{ id: 7, payload: { ticket_id: "TKT-20261011-ABCD", status: "new", notes: [] } }];
    const patch = await PATCH(jsonWith("PATCH", { ticket_id: "TKT-20261011-ABCD", status: "resolved", note: "Shipped a fix" }, "a".repeat(32)));
    expect(patch.status).toBe(200);
    expect(state.updated).toHaveLength(1);
    expect(state.updated[0].payload).toMatchObject({ status: "resolved" });
  });

  it("treats a too-short admin secret as unconfigured", async () => {
    process.env.SUPPORT_ADMIN_TOKEN = "short";
    const res = await PATCH(jsonWith("PATCH", { ticket_id: "TKT-1", status: "resolved" }, "short"));
    expect(res.status).toBe(403);
  });
});
