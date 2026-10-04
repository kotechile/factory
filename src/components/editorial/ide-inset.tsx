import * as React from "react";
import { ShieldCheck } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * §3.6 — the IDE / Terminal data treatment, extracted from the LedgerLink archetype.
 *
 * Raw code, JSON, XML or CSV that a product asks the user to hand over gets the same authentic
 * editor chrome everywhere: window dots + file title, a zero-egress badge (the product's central
 * promise — nothing leaves the browser), and a real line-number gutter so a pasted document reads
 * like a document rather than a blob in a textarea.
 */
export function IdeInset({
  title,
  code,
  badge = "CLIENT-SIDE ONLY • ZERO EGRESS",
  meta,
  className,
  maxHeightClass = "max-h-96",
}: {
  title: string;
  code: string;
  /** Set to null to omit the badge (e.g. a snippet that is not user data). */
  badge?: string | null;
  /** Small right-aligned annotation in the chrome bar, e.g. the route or the tool selector. */
  meta?: string;
  className?: string;
  maxHeightClass?: string | null;
}) {
  const lines = code.replace(/\n$/, "").split("\n");

  return (
    <div
      className={cn(
        "overflow-hidden rounded-xl border border-border/80 bg-[#F8FAFC] shadow-inner ring-1 ring-[#0F172A]/[0.05]",
        className,
      )}
    >
      <div className="flex items-center justify-between border-b border-border/70 bg-card/90 px-3.5 py-2 font-mono text-xs backdrop-blur-xs">
        <div className="flex min-w-0 items-center gap-2 text-[11px] text-muted">
          <span className="flex items-center gap-1.5" aria-hidden="true">
            <span className="h-2 w-2 rounded-full bg-[#EF4444]" />
            <span className="h-2 w-2 rounded-full bg-[#F59E0B]" />
            <span className="h-2 w-2 rounded-full bg-[#10B981]" />
          </span>
          <span className="text-border">|</span>
          <span className="truncate font-semibold text-foreground">{title}</span>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          {meta ? (
            <span className="hidden items-center gap-1 rounded bg-black/[0.04] px-1.5 py-0.5 text-[10px] text-muted sm:inline-flex">
              {meta}
            </span>
          ) : null}
          {badge ? (
            <span className="inline-flex items-center gap-1 rounded bg-[#10B981]/10 px-1.5 py-0.5 text-[10px] font-semibold text-[#047857]">
              <ShieldCheck className="h-3 w-3" />
              {badge}
            </span>
          ) : null}
        </div>
      </div>

      <div
        className={cn("overflow-auto bg-[#F8FAFC]", maxHeightClass)}
        // A scrollable region must be reachable by keyboard (axe `scrollable-region-focusable`):
        // the snippet scrolls independently of the page, so give it a focus stop of its own.
        tabIndex={0}
        role="region"
        aria-label={`${title} (scrollable code block)`}
      >
        <pre className="p-0 font-mono text-xs leading-relaxed text-foreground">
          <code className="block">
            {lines.map((line, index) => (
              <span key={index} className="flex">
                <span
                  className="w-11 shrink-0 select-none border-r border-border/60 px-2 text-right text-[#5B6B80]"
                  aria-hidden="true"
                >
                  {String(index + 1).padStart(2, "0")}
                </span>
                <span className="whitespace-pre px-3">{line || " "}</span>
              </span>
            ))}
          </code>
        </pre>
      </div>
    </div>
  );
}
