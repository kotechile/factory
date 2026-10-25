"use client";

import * as React from "react";
import { ShieldCheck } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * §3.6 — the IDE/Terminal treatment applied to an *editable* raw-data field (textarea).
 *
 * The standard requires raw code/JSON/XML/CSV inputs to read like a document, not a blob: window
 * chrome with the control dots and a file title, the zero-egress badge, and a real line-number
 * gutter. The gutter is scroll-synced to the textarea so the numbers stay with their lines.
 *
 * The textarea keeps its `placeholder` and label, so existing behaviour and locators are unchanged —
 * this is chrome around the control, not a replacement for it.
 */
export function IdeTextarea({
  title,
  value,
  onChange,
  placeholder,
  ariaLabel,
  badge = "CLIENT-SIDE ONLY • ZERO EGRESS",
  meta,
  rows = 7,
  className,
}: {
  title: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  ariaLabel: string;
  badge?: string | null;
  meta?: string;
  rows?: number;
  className?: string;
}) {
  const gutterRef = React.useRef<HTMLDivElement>(null);
  const areaRef = React.useRef<HTMLTextAreaElement>(null);
  const lineCount = Math.max(value.split("\n").length, rows);
  // The gutter paints only the window of numbers the field is showing, never one <div> per line of
  // the file. An in-flow gutter sized the row (a 5,765-line export opened /ratchetproof at 116,580 px
  // of document height), and even an out-of-flow one that laid out every row left text runs outside
  // its box, which the text-geometry guard reads as a collision. So: measure the rendered line height
  // once, then offset a `rows + 4`-line window by the field's own scrollTop.
  const [lineHeight, setLineHeight] = React.useState(0);
  const [scrollTop, setScrollTop] = React.useState(0);
  React.useLayoutEffect(() => {
    const node = areaRef.current;
    if (!node || lineHeight) return;
    const measured = Number.parseFloat(window.getComputedStyle(node).lineHeight);
    if (Number.isFinite(measured) && measured > 0) setLineHeight(measured);
  }, [lineHeight]);
  const windowRows = rows + 4;
  const firstLine = lineHeight ? Math.max(0, Math.floor(scrollTop / lineHeight) - 1) : 0;
  const numbers = Array.from(
    { length: lineHeight ? Math.min(windowRows, lineCount - firstLine) : Math.min(rows, lineCount) },
    (_, index) => firstLine + index + 1,
  );
  // Same badge treatment as IdeInset: at phone width the full "CLIENT-SIDE ONLY • ZERO EGRESS" box
  // overran the bar and painted over the file title (measured overlap −33.6 px at 375 px, 2026-10-19),
  // so below `sm` the bar carries the claim alone and the qualifier returns on wider screens.
  const shortBadge = badge ? badge.split("•").pop()!.trim() : null;

  return (
    <div
      className={cn(
        "overflow-hidden rounded-xl border border-border/80 bg-[#F8FAFC] shadow-inner ring-1 ring-[#0F172A]/[0.05]",
        className,
      )}
    >
      {/* The bar is the same primitive as IdeInset's: a real 12 px floor (gap-x-3) plus wrapping, so a
          long title ellipsizes instead of running flush into the badge, and at phone width the badge
          group drops to its own line rather than painting over the title (2026-10-19). */}
      <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1 border-b border-border/70 bg-card/90 px-3.5 py-2 font-mono text-xs backdrop-blur-xs">
        <div className="flex min-w-0 flex-1 items-center gap-2 text-[11px] text-muted">
          <span className="flex shrink-0 items-center gap-1.5" aria-hidden="true">
            <span className="h-2 w-2 rounded-full bg-[#EF4444]" />
            <span className="h-2 w-2 rounded-full bg-[#F59E0B]" />
            <span className="h-2 w-2 rounded-full bg-[#10B981]" />
          </span>
          <span className="shrink-0 text-border">|</span>
          <span className="min-w-0 truncate font-semibold text-foreground">{title}</span>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          {lineCount > rows ? (
            <span className="hidden items-center rounded bg-black/[0.04] px-1.5 py-0.5 font-mono text-[10px] text-muted sm:inline-flex">
              {lineCount} lines
            </span>
          ) : null}
          {meta ? (
            <span className="hidden items-center gap-1 rounded bg-black/[0.04] px-1.5 py-0.5 text-[10px] text-muted sm:inline-flex">
              {meta}
            </span>
          ) : null}
          {badge ? (
            <span className="inline-flex shrink-0 items-center gap-1 rounded bg-[#10B981]/10 px-1.5 py-0.5 text-[10px] font-semibold text-[#047857]">
              <ShieldCheck className="h-3 w-3 shrink-0" />
              <span className="sm:hidden">{shortBadge}</span>
              <span className="hidden whitespace-nowrap sm:inline">{badge}</span>
            </span>
          ) : null}
        </div>
      </div>

      <div className="relative flex bg-[#F8FAFC]">
        {/* The gutter keeps its 44 px column but its numbers are painted by an out-of-flow window,
            never one <div> per line of the file. Rendered in flow, a 5,765-line interval export
            stretched this editor to 112,442 px and opened /ratchetproof at 116,580 px of document
            height, with the launch video ~196 screens down (measured 2026-10-25). */}
        <div className="w-11 shrink-0 border-r border-border/60" aria-hidden="true" />
        <div
          ref={gutterRef}
          className="pointer-events-none absolute inset-y-0 left-0 w-11 select-none overflow-hidden py-3 text-right font-mono text-xs leading-relaxed text-[#5B6B80]"
          aria-hidden="true"
        >
          <div style={{ marginTop: firstLine * lineHeight - scrollTop }}>
            {numbers.map((number) => (
              <div key={number} className="px-2">
                {String(number).padStart(2, "0")}
              </div>
            ))}
          </div>
        </div>
        <textarea
          ref={areaRef}
          aria-label={ariaLabel}
          value={value}
          rows={rows}
          // No soft wrapping: the gutter numbers ONE logical line each, so a wrapped row paints text
          // with no number and pushes every later number out of step with its line (the caseproof
          // "text overlaps line numbers" verdict, 2026-10-18). Long lines scroll horizontally, which
          // is what a code field does; the gutter stays scroll-synced on both axes.
          wrap="off"
          spellCheck={false}
          placeholder={placeholder}
          onChange={(event) => onChange(event.target.value)}
          onScroll={(event) => setScrollTop(event.currentTarget.scrollTop)}
          className="relative flex-1 resize-y overflow-auto bg-transparent px-3 py-3 font-mono text-xs leading-relaxed text-foreground placeholder:text-muted/60 focus-visible:outline-none"
          // A dragged resize must not be able to claim the whole viewport either.
          style={{ maxHeight: "70vh" }}
        />
      </div>
    </div>
  );
}
