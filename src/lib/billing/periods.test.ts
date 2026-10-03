import { describe, it, expect } from "vitest";
import {
  FALLBACK_MONTHLY_CAP_USD,
  capFraction,
  costToCents,
  currentPeriod,
  remainingUsd,
  resolveMonthlyCap,
  summarizeUsage,
} from "./periods";

describe("currentPeriod", () => {
  it("returns the UTC calendar month containing the instant", () => {
    const { start, end } = currentPeriod(new Date("2026-10-03T19:42:11Z"));
    expect(start.toISOString()).toBe("2026-10-01T00:00:00.000Z");
    expect(end.toISOString()).toBe("2026-11-01T00:00:00.000Z");
  });

  it("rolls the year over in December", () => {
    const { start, end } = currentPeriod(new Date("2026-12-31T23:59:59Z"));
    expect(start.toISOString()).toBe("2026-12-01T00:00:00.000Z");
    expect(end.toISOString()).toBe("2027-01-01T00:00:00.000Z");
  });

  it("is half-open: the first instant of the month belongs to the new period", () => {
    const { start } = currentPeriod(new Date("2026-11-01T00:00:00Z"));
    expect(start.toISOString()).toBe("2026-11-01T00:00:00.000Z");
  });
});

describe("resolveMonthlyCap", () => {
  const caps = { cus_a: { monthly_cap_usd: 12.5, updated_at: "2026-10-03T00:00:00Z" } };

  it("prefers the customer's own cap over the env default", () => {
    expect(resolveMonthlyCap(caps, "cus_a", { BILLING_DEFAULT_MONTHLY_CAP_USD: "100" })).toBe(12.5);
  });

  it("falls back to the env default for an unknown customer", () => {
    expect(resolveMonthlyCap(caps, "cus_b", { BILLING_DEFAULT_MONTHLY_CAP_USD: "100" })).toBe(100);
  });

  it("falls back to the built-in default when the env var is absent or invalid", () => {
    expect(resolveMonthlyCap(caps, "cus_b", {})).toBe(FALLBACK_MONTHLY_CAP_USD);
    expect(resolveMonthlyCap(caps, "cus_b", { BILLING_DEFAULT_MONTHLY_CAP_USD: "nope" })).toBe(
      FALLBACK_MONTHLY_CAP_USD,
    );
  });

  it("honours an explicit 0 cap (a hard block) instead of treating it as unset", () => {
    expect(resolveMonthlyCap({ cus_z: { monthly_cap_usd: 0, updated_at: "x" } }, "cus_z", {})).toBe(0);
  });

  it("ignores a malformed entry rather than accepting NaN", () => {
    const bad = { cus_bad: { monthly_cap_usd: Number.NaN, updated_at: "x" } };
    expect(resolveMonthlyCap(bad, "cus_bad", {})).toBe(FALLBACK_MONTHLY_CAP_USD);
  });
});

describe("summarizeUsage", () => {
  it("sums repeated $0.25 charges in cents without float drift", () => {
    const rows = Array.from({ length: 5 }, (_, i) => ({
      created_at: `2026-10-0${i + 1}T00:00:00.000Z`,
      payload: { tool: "audit_carrier_invoice", cost_usd: 0.25, meter_event_id: `evt_${i}` },
    }));
    const s = summarizeUsage(rows);
    expect(s.queries).toBe(5);
    expect(s.amountUsd).toBe(1.25);
    expect(s.history[0]).toEqual({
      at: "2026-10-01T00:00:00.000Z",
      tool: "audit_carrier_invoice",
      cost_usd: 0.25,
      meter_event_id: "evt_0",
    });
  });

  it("tolerates a missing payload (an old or partial row) without throwing", () => {
    const s = summarizeUsage([{ created_at: "2026-10-01T00:00:00.000Z", payload: null }]);
    expect(s.queries).toBe(1);
    expect(s.amountUsd).toBe(0);
    expect(s.history[0]).toEqual({
      at: "2026-10-01T00:00:00.000Z",
      tool: "unknown",
      cost_usd: 0,
      meter_event_id: null,
    });
  });

  it("mixes differing per-tool prices", () => {
    const s = summarizeUsage([
      { created_at: "a", payload: { tool: "reconcile_stripe_payout", cost_usd: 0.25 } },
      { created_at: "b", payload: { tool: "audit_automation_case", cost_usd: 0.5 } },
      { created_at: "c", payload: { tool: "compute_billable_weight", cost_usd: 0.05 } },
    ]);
    expect(s.amountUsd).toBe(0.8);
  });
});

describe("costToCents (the Stripe meter's `value`)", () => {
  it("converts every per-tool price to integer cents", () => {
    expect(costToCents(0.05)).toBe(5);
    expect(costToCents(0.1)).toBe(10);
    expect(costToCents(0.25)).toBe(25);
    expect(costToCents(0.5)).toBe(50);
    expect(costToCents(29)).toBe(2900);
  });

  it("returns 0 for a non-positive or non-finite price so the caller refuses to report it", () => {
    expect(costToCents(0)).toBe(0);
    expect(costToCents(-1)).toBe(0);
    expect(costToCents(Number.NaN)).toBe(0);
    expect(costToCents(Number.POSITIVE_INFINITY)).toBe(0);
  });

  it("never returns a fraction of a cent", () => {
    expect(costToCents(0.333)).toBe(33);
    expect(Number.isInteger(costToCents(0.333))).toBe(true);
  });
});

describe("remainingUsd / capFraction", () => {
  it("floors remaining at 0 when over cap", () => {
    expect(remainingUsd(62.75, 50)).toBe(0);
  });

  it("reports the gap below the cap", () => {
    expect(remainingUsd(12.25, 50)).toBe(37.75);
  });

  it("clamps the consumed fraction and treats a 0 cap as full", () => {
    expect(capFraction(25, 50)).toBe(0.5);
    expect(capFraction(80, 50)).toBe(1);
    expect(capFraction(0, 0)).toBe(1);
  });
});
