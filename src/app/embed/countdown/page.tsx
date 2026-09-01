"use client";

import * as React from "react";

const DEADLINE_MS = new Date("2026-09-15T23:59:59-04:00").getTime();

function useCountdown() {
  const [now, setNow] = React.useState(() => Date.now());
  React.useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);
  const diff = Math.max(0, DEADLINE_MS - now);
  return {
    past: diff === 0,
    days: Math.floor(diff / 86_400_000),
    hours: Math.floor((diff % 86_400_000) / 3_600_000),
    minutes: Math.floor((diff % 3_600_000) / 60_000),
    seconds: Math.floor((diff % 60_000) / 1000),
  };
}

export default function CountdownEmbed() {
  const { past, days, hours, minutes, seconds } = useCountdown();
  return (
    <div className="flex w-full flex-col items-center gap-2.5 rounded-lg border border-border bg-card p-4 text-center">
      <div className="text-[11px] font-medium uppercase tracking-wide text-subtle">
        2026 Q3 Estimated-Tax Deadline
      </div>
      <div className="font-mono text-2xl font-bold tabular-nums text-foreground">
        {past
          ? "Deadline passed"
          : `${days}d ${hours}h ${minutes}m ${seconds}s`}
      </div>
      <a
        href="https://factory.aichieve.net/quarterline"
        className="rounded bg-primary px-3 py-1.5 text-xs font-medium text-card hover:opacity-90"
      >
        Check Safe Harbor &rarr;
      </a>
      <div className="text-[10px] text-subtle">Powered by QuarterLine</div>
    </div>
  );
}
