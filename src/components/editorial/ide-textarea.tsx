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
  const lineCount = Math.max(value.split("\n").length, rows);

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

      <div className="flex bg-[#F8FAFC]">
        <div
          ref={gutterRef}
          className="w-11 shrink-0 select-none overflow-hidden border-r border-border/60 py-3 text-right font-mono text-xs leading-relaxed text-[#5B6B80]"
          aria-hidden="true"
        >
          {Array.from({ length: lineCount }, (_, index) => (
            <div key={index} className="px-2">
              {String(index + 1).padStart(2, "0")}
            </div>
          ))}
        </div>
        <textarea
          aria-label={ariaLabel}
          value={value}
          rows={rows}
          spellCheck={false}
          placeholder={placeholder}
          onChange={(event) => onChange(event.target.value)}
          onScroll={(event) => {
            if (gutterRef.current) gutterRef.current.scrollTop = event.currentTarget.scrollTop;
          }}
          className="flex-1 resize-y bg-transparent px-3 py-3 font-mono text-xs leading-relaxed text-foreground placeholder:text-muted/60 focus-visible:outline-none"
        />
      </div>
    </div>
  );
}
