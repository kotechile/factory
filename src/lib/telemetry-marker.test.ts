import { describe, expect, it } from "vitest";
import { buildEventRow } from "@/lib/telemetry";

/**
 * The marker's write contract: the class is decided by the server and cannot be claimed by a
 * caller. A producer that forgets to classify writes `visitor` (over-counting demand is the safe
 * error); a caller that puts `traffic_class` in the payload has it overwritten.
 */
describe("events row carries the internal-traffic marker", () => {
  it("writes the class to the column and mirrors it into the payload", () => {
    const row = buildEventRow("page_view", { path: "/showcase" }, "factory", "internal", "sid-1");
    expect(row.traffic_class).toBe("internal");
    expect((row.payload as Record<string, unknown>).traffic_class).toBe("internal");
    expect((row.payload as Record<string, unknown>).path).toBe("/showcase");
    expect(row.session_id).toBe("sid-1");
  });

  it("overwrites a spoofed class coming in through the payload", () => {
    const row = buildEventRow(
      "page_view",
      { traffic_class: "internal" },
      "factory",
      "visitor",
      null,
    );
    expect(row.traffic_class).toBe("visitor");
    expect((row.payload as Record<string, unknown>).traffic_class).toBe("visitor");
    expect("session_id" in row).toBe(false);
  });

  it("marks a metered agent call the same way, so agent_query can be split", () => {
    const row = buildEventRow("agent_query", { tool: "validate_einvoice" }, "facturgate", "internal", null);
    expect(row.traffic_class).toBe("internal");
    expect(row.product).toBe("facturgate");
    expect(row.event).toBe("agent_query");
  });
});
