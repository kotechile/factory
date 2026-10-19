import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

/**
 * Pending-migration guard for the marker's write path.
 *
 * The first version of this shipped a real bug: any "column does not exist" error made the retry
 * strip BOTH `traffic_class` and `session_id`, so while migration 0004 was pending every event lost
 * its session id and the unique-session metric went blind. The error names exactly one column, so
 * exactly that column may be dropped.
 */

type Row = Record<string, unknown>;

let inserts: Row[] = [];
let errors: string[] = [];

vi.mock("@/lib/supabase", () => ({
  createAdminClient: () => ({
    from: () => ({
      insert: async (row: Row) => {
        inserts.push(row);
        const message = errors.shift();
        return { error: message ? { message } : null };
      },
    }),
  }),
}));

async function freshTrack() {
  vi.resetModules();
  const mod = await import("@/lib/telemetry");
  return mod.track;
}

describe("telemetry pending-migration handling", () => {
  let warn: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    inserts = [];
    errors = [];
    warn = vi.spyOn(console, "warn").mockImplementation(() => {});
  });

  afterEach(() => {
    warn.mockRestore();
  });

  it("drops ONLY traffic_class when migration 0004 is missing, keeping session_id", async () => {
    const track = await freshTrack();
    errors = ["column events.traffic_class does not exist"];

    await track("page_view", { session_id: "sid-1", path: "/showcase" }, "factory", "internal");

    expect(inserts).toHaveLength(2);
    expect(inserts[0].traffic_class).toBe("internal");
    expect(inserts[0].session_id).toBe("sid-1");
    // the retry keeps the session column and still carries the class in the payload mirror
    expect(inserts[1].session_id).toBe("sid-1");
    expect("traffic_class" in inserts[1]).toBe(false);
    expect((inserts[1].payload as Row).traffic_class).toBe("internal");
    expect(String(warn.mock.calls[0][0])).toContain("0004_events_traffic_class.sql");
  });

  it("drops ONLY session_id when migration 0002 is missing, keeping the marker column", async () => {
    const track = await freshTrack();
    errors = ["column events.session_id does not exist"];

    await track("page_view", { session_id: "sid-2" }, "factory", "visitor");

    expect(inserts).toHaveLength(2);
    expect("session_id" in inserts[1]).toBe(false);
    expect(inserts[1].traffic_class).toBe("visitor");
    expect(String(warn.mock.calls[0][0])).toContain("0002_events_session_id.sql");
  });

  it("logs the pending migration once and stops paying the failed round trip", async () => {
    const track = await freshTrack();
    errors = ["column events.traffic_class does not exist"];

    await track("page_view", { session_id: "sid-3" }, "factory", "visitor");
    await track("export_click", { session_id: "sid-3" }, "factory", "visitor");

    // first call: failed insert + retry; second call: one insert, no column, no second warning
    expect(inserts).toHaveLength(3);
    expect("traffic_class" in inserts[2]).toBe(false);
    expect(warn).toHaveBeenCalledTimes(1);
  });

  it("does not retry on an unrelated error", async () => {
    const track = await freshTrack();
    errors = ["duplicate key value violates unique constraint"];

    await track("page_view", { session_id: "sid-4" }, "factory", "visitor");

    expect(inserts).toHaveLength(1);
    expect(warn).not.toHaveBeenCalled();
  });
});
