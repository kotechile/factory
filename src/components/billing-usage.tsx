"use client";

import * as React from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

/**
 * V1.4 — the usage half of the billing page: a customer's own period consumption, spend cap and
 * audit log, read from /api/v1/billing/summary and written back through /api/v1/billing/cap.
 *
 * Read-only against the ledger; the only mutation is the cap. Identity is the same `cus_…`
 * capability the portal gateway uses (there is no login yet).
 */

interface HistoryItem {
  at: string;
  tool: string;
  cost_usd: number;
  meter_event_id: string | null;
}

interface Summary {
  customer_id: string;
  period_start: string;
  period_end: string;
  queries: number;
  usage_usd: number;
  cap_usd: number;
  remaining_usd: number;
  cap_fraction: number;
  history: HistoryItem[];
}

const HISTORY_DISPLAY_LIMIT = 50;

function usd(n: number): string {
  return `$${n.toFixed(2)}`;
}

function shortDate(iso: string): string {
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? iso : d.toISOString().slice(0, 10);
}

const CUSTOMER_ID_PATTERN = /^cus_[A-Za-z0-9]+$/;

export default function BillingUsage() {
  const [customerId, setCustomerId] = React.useState("");
  const [summary, setSummary] = React.useState<Summary | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const [notice, setNotice] = React.useState<string | null>(null);
  const [loading, setLoading] = React.useState(false);
  const [capDraft, setCapDraft] = React.useState("50");
  const [savingCap, setSavingCap] = React.useState(false);

  const load = React.useCallback(async (id: string) => {
    const value = id.trim();
    if (!CUSTOMER_ID_PATTERN.test(value)) {
      setError("Enter the Stripe customer ID from your receipt email (it starts with cus_…).");
      setSummary(null);
      return;
    }
    setLoading(true);
    setError(null);
    setNotice(null);
    try {
      const res = await fetch(`/api/v1/billing/summary?customer_id=${encodeURIComponent(value)}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Could not load usage.");
      setSummary(data as Summary);
      setCapDraft(String((data as Summary).cap_usd));
      // Reflect the canonical id returned by the API back into the field.
      setCustomerId((data as Summary).customer_id);
    } catch (err) {
      setSummary(null);
      setError(err instanceof Error ? err.message : "Could not load usage.");
    } finally {
      setLoading(false);
    }
  }, []);

  const saveCap = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!summary) return;
    const value = Number(capDraft);
    if (!Number.isFinite(value) || value < 0) {
      setError("The monthly cap must be a number of US dollars (0 or more).");
      return;
    }
    setSavingCap(true);
    setError(null);
    setNotice(null);
    try {
      const res = await fetch("/api/v1/billing/cap", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ customer_id: summary.customer_id, monthly_cap_usd: value }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Could not save the cap.");
      setNotice(`Monthly cap set to ${usd(data.cap_usd)}.`);
      await load(summary.customer_id);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save the cap.");
    } finally {
      setSavingCap(false);
    }
  };

  const pct = summary ? Math.round(Math.min(1, Math.max(0, summary.cap_fraction)) * 100) : 0;

  return (
    <div className="space-y-4 pt-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold text-foreground">Your Usage &amp; Spend</h2>
          <p className="text-xs text-muted">
            Metered agent usage for the current month, your spend cap, and a per-query audit log.
          </p>
        </div>
        <Badge variant="outline" className="hidden sm:inline-flex font-mono text-[10px]">
          SELF-SERVE
        </Badge>
      </div>

      <Card className="rounded-2xl border-border/80">
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-bold">Look up your account</CardTitle>
          <CardDescription className="text-xs">
            Paste the Stripe customer ID from your receipt email to see this month&apos;s usage.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <form
            className="flex flex-col gap-2 sm:flex-row sm:items-end"
            onSubmit={(e) => {
              e.preventDefault();
              void load(customerId);
            }}
          >
            <div className="flex-1">
              <label htmlFor="usage-customer-id" className="block text-xs font-semibold text-foreground mb-1">
                Stripe Customer ID
              </label>
              <input
                id="usage-customer-id"
                type="text"
                value={customerId}
                onChange={(e) => setCustomerId(e.target.value)}
                placeholder="cus_..."
                className="w-full rounded-xl border border-border/80 bg-background px-3 py-2 text-xs font-mono text-foreground placeholder:text-muted/60 focus:outline-hidden focus:ring-2 focus:ring-primary"
              />
            </div>
            <Button type="submit" disabled={loading || !customerId.trim()} className="sm:w-40">
              {loading ? "Loading…" : "Load usage"}
            </Button>
          </form>

          {error && (
            <p role="alert" className="rounded-lg bg-destructive/10 border border-destructive/30 p-2.5 text-xs text-destructive">
              {error}
            </p>
          )}
          {notice && (
            <p role="status" className="rounded-lg bg-primary/10 border border-primary/30 p-2.5 text-xs text-foreground">
              {notice}
            </p>
          )}

          {summary && (
            <div className="space-y-5">
              <dl className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                <div className="rounded-xl border border-border/60 p-3">
                  <dt className="text-[11px] uppercase tracking-wider text-muted">Spent</dt>
                  <dd className="font-mono text-lg font-bold text-foreground">{usd(summary.usage_usd)}</dd>
                </div>
                <div className="rounded-xl border border-border/60 p-3">
                  <dt className="text-[11px] uppercase tracking-wider text-muted">Cap</dt>
                  <dd className="font-mono text-lg font-bold text-foreground">{usd(summary.cap_usd)}</dd>
                </div>
                <div className="rounded-xl border border-border/60 p-3">
                  <dt className="text-[11px] uppercase tracking-wider text-muted">Remaining</dt>
                  <dd className="font-mono text-lg font-bold text-foreground">{usd(summary.remaining_usd)}</dd>
                </div>
                <div className="rounded-xl border border-border/60 p-3">
                  <dt className="text-[11px] uppercase tracking-wider text-muted">Queries</dt>
                  <dd className="font-mono text-lg font-bold text-foreground">{summary.queries}</dd>
                </div>
              </dl>

              <div>
                <div
                  role="progressbar"
                  aria-label="Monthly spend against your cap"
                  aria-valuemin={0}
                  aria-valuemax={summary.cap_usd}
                  aria-valuenow={Math.min(summary.usage_usd, summary.cap_usd)}
                  aria-valuetext={`${usd(summary.usage_usd)} of ${usd(summary.cap_usd)}`}
                  className="h-2.5 w-full overflow-hidden rounded-full bg-black/[0.06]"
                >
                  <div
                    className={`h-full rounded-full ${pct >= 100 ? "bg-destructive" : "bg-primary"}`}
                    style={{ width: `${pct}%` }}
                  />
                </div>
                <p className="mt-1 text-[11px] text-muted">
                  {pct}% of cap used. Period {shortDate(summary.period_start)} → {shortDate(summary.period_end)}; the
                  cap resets {shortDate(summary.period_end)}.
                </p>
              </div>

              <form className="flex flex-col gap-2 sm:flex-row sm:items-end" onSubmit={saveCap}>
                <div className="flex-1">
                  <label htmlFor="usage-cap" className="block text-xs font-semibold text-foreground mb-1">
                    Monthly spend cap (USD)
                  </label>
                  <input
                    id="usage-cap"
                    type="number"
                    min={0}
                    max={100000}
                    step="1"
                    value={capDraft}
                    onChange={(e) => setCapDraft(e.target.value)}
                    className="w-full rounded-xl border border-border/80 bg-background px-3 py-2 text-xs font-mono text-foreground focus:outline-hidden focus:ring-2 focus:ring-primary"
                  />
                  <p className="mt-1 text-[11px] text-muted">
                    Metered agent calls stop with an explicit 402 once this is reached. 0 blocks all spend.
                  </p>
                </div>
                <Button type="submit" disabled={savingCap} variant="outline" className="sm:w-40">
                  {savingCap ? "Saving…" : "Save cap"}
                </Button>
              </form>

              <div>
                <h3 className="mb-2 text-sm font-bold text-foreground">Recent queries</h3>
                {summary.history.length === 0 ? (
                  <p className="text-xs text-muted">No metered queries recorded this period.</p>
                ) : (
                  <div className="overflow-x-auto rounded-xl border border-border/60">
                    <table className="w-full border-collapse text-left text-xs">
                      <caption className="sr-only">Metered agent queries this billing period</caption>
                      <thead>
                        <tr className="border-b border-border/60 bg-[#F8FAFC] font-mono text-[11px] uppercase tracking-wider text-muted">
                          <th scope="col" className="py-2 pl-3 pr-2 font-semibold">When</th>
                          <th scope="col" className="py-2 px-2 font-semibold">Tool</th>
                          <th scope="col" className="py-2 pr-3 pl-2 font-semibold">Cost</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border/50">
                        {summary.history.slice(0, HISTORY_DISPLAY_LIMIT).map((row, i) => (
                          <tr key={`${row.at}-${row.tool}-${i}`}>
                            <td className="py-2 pl-3 pr-2 font-mono text-[11px] text-muted">
                              {new Date(row.at).toISOString().replace("T", " ").slice(0, 16)}Z
                            </td>
                            <td className="py-2 px-2 font-mono text-[11px] text-foreground">{row.tool}</td>
                            <td className="py-2 pr-3 pl-2 font-mono text-[11px] text-foreground">
                              {usd(row.cost_usd)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
                {summary.history.length > HISTORY_DISPLAY_LIMIT && (
                  <p className="mt-1 text-[11px] text-muted">
                    Showing the {HISTORY_DISPLAY_LIMIT} most recent of {summary.history.length} queries.
                  </p>
                )}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
