"use client";

import * as React from "react";
import { EDITORIAL_MUTED_TEXT } from "@/components/editorial/signature";
import { cn } from "@/lib/utils";

/**
 * §3.5 — the Apple-style segmented tab switcher, extracted from the LedgerLink archetype.
 *
 * Every product that switches input modes (paste vs file vs key vs CLI) must use this control rather
 * than flat underlined links. Generic over the tab key so callers keep their own union type.
 */
export interface SegmentedTab<K extends string> {
  key: K;
  label: string;
  icon?: React.ReactNode;
}

export function AppleSegmentedTabs<K extends string>({
  tabs,
  value,
  onChange,
  ariaLabel,
  className,
}: {
  tabs: readonly SegmentedTab<K>[];
  value: K;
  onChange: (key: K) => void;
  ariaLabel: string;
  className?: string;
}) {
  return (
    <div
      role="tablist"
      aria-label={ariaLabel}
      className={cn(
        "inline-flex flex-wrap rounded-xl bg-[#F1F5F9] p-1 shadow-inner border border-black/[0.04]",
        className,
      )}
    >
      {tabs.map((tab) => {
        const active = tab.key === value;
        return (
          <button
            key={tab.key}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => onChange(tab.key)}
            className={cn(
              "flex cursor-pointer items-center gap-2 rounded-lg px-3.5 py-1.5 text-xs transition-all sm:text-sm",
              active
                ? "bg-card font-semibold text-foreground shadow-[0_1px_3px_rgba(0,0,0,0.08),0_1px_2px_rgba(0,0,0,0.04)]"
                : cn("font-medium hover:text-[#0F172A]", EDITORIAL_MUTED_TEXT),
            )}
          >
            {tab.icon}
            <span>{tab.label}</span>
          </button>
        );
      })}
    </div>
  );
}
