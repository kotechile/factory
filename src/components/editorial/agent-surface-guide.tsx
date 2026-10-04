"use client";

import * as React from "react";
import Link from "next/link";
import { Bot, Check, Code2, Copy, CreditCard, Terminal } from "lucide-react";
import { AppleSegmentedTabs, type SegmentedTab } from "@/components/editorial/apple-segmented-tabs";
import { IdeInset } from "@/components/editorial/ide-inset";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { agentRatesForProduct } from "@/products/pricing";

/**
 * "MCP details" — the Agent Surface & WebMCP Integration guide, generalized from the LedgerLink
 * archetype so every live product documents its agent surface identically.
 *
 * Rates are NOT props: they are read from the pricing catalog by product slug, the same catalog the
 * agent API charges from. A second hand-written copy of a rate is exactly the defect class the
 * `pricing.test.ts` wiring guard exists to catch, so this component never accepts one.
 */

export type GuideTab<K extends string> = SegmentedTab<K> & {
  /** File name shown in the IDE inset chrome. */
  fileTitle: string;
  /** Right-hand chrome annotation, e.g. the route or the payload kind. */
  meta: string;
  /** The snippet body. */
  code: string;
};

export interface GuideParam {
  name: string;
  requirement: "Required" | "Optional";
  description: React.ReactNode;
}

export function AgentSurfaceGuide<K extends string>({
  productSlug,
  blurb,
  tabs,
  params,
  paramsHeading = "JSON Schema Parameters Contract",
}: {
  productSlug: string;
  blurb: string;
  tabs: readonly GuideTab<K>[];
  params: readonly GuideParam[];
  paramsHeading?: string;
}) {
  const rates = React.useMemo(() => agentRatesForProduct(productSlug), [productSlug]);
  const toolNames = Object.keys(rates);
  const [activeTab, setActiveTab] = React.useState<K>(tabs[0].key);
  const [copied, setCopied] = React.useState(false);

  const active = tabs.find((tab) => tab.key === activeTab) ?? tabs[0];
  const lowestRate = Math.min(...toolNames.map((tool) => rates[tool]));

  const handleCopy = () => {
    navigator.clipboard.writeText(active.code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <Card className="overflow-hidden rounded-2xl border-0 bg-card ring-1 ring-[#0F172A]/[0.06] shadow-[0_12px_32px_-8px_rgba(15,23,42,0.06)]">
      <CardHeader className="border-b border-border/70 pb-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <Bot className="h-5 w-5" />
            </div>
            <div>
              <CardTitle className="text-base font-semibold text-foreground">
                Agent Surface &amp; WebMCP Integration
              </CardTitle>
              <CardDescription className="text-xs">{blurb}</CardDescription>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {toolNames.map((tool) => (
              <span
                key={tool}
                className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-2.5 py-1 font-mono text-[11px] font-semibold text-primary"
              >
                <span className="h-1.5 w-1.5 rounded-full bg-primary animate-pulse" />
                {tool}
              </span>
            ))}
            <span className="rounded-full bg-[#10B981]/10 px-2.5 py-1 font-mono text-[11px] font-semibold text-[#047857]">
              METERED ${lowestRate.toFixed(2)}+
            </span>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-5 p-4 sm:p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <AppleSegmentedTabs tabs={tabs} value={activeTab} onChange={setActiveTab} ariaLabel="Agent invocation mode" />
          <button
            type="button"
            onClick={handleCopy}
            className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg border border-border/80 bg-card px-2.5 py-1.5 font-mono text-[11px] text-muted shadow-2xs transition-colors hover:text-foreground"
          >
            {copied ? (
              <>
                <Check className="h-3.5 w-3.5 text-[#10B981]" />
                <span>Copied</span>
              </>
            ) : (
              <>
                <Copy className="h-3.5 w-3.5" />
                <span>Copy snippet</span>
              </>
            )}
          </button>
        </div>

        <IdeInset title={active.fileTitle} code={active.code} meta={active.meta} />

        <div className="space-y-2 pt-1">
          <h4 className="font-mono text-xs font-semibold uppercase tracking-wider text-muted">
            {paramsHeading}
          </h4>
          <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 lg:grid-cols-3">
            {params.map((param) => (
              // `min-w-0` + `[overflow-wrap:anywhere]`: a grid item's default min-width is
              // min-content, so a long unbreakable monospace token (a CSV header list, a JSON
              // shape) expanded the grid past its card and the description spilled over the
              // neighbouring column.
              <div
                key={param.name}
                className="min-w-0 rounded-xl border border-border/70 bg-card p-3 shadow-2xs [overflow-wrap:anywhere]"
              >
                <div className="flex items-center justify-between gap-2">
                  <code className="min-w-0 break-all font-mono text-xs font-bold text-foreground">{param.name}</code>
                  <span
                    className={
                      param.requirement === "Required"
                        ? "shrink-0 rounded bg-destructive/10 px-1.5 py-0.5 font-mono text-[10px] font-semibold text-destructive"
                        : "shrink-0 rounded bg-black/[0.05] px-1.5 py-0.5 font-mono text-[10px] font-semibold text-muted"
                    }
                  >
                    {param.requirement}
                  </span>
                </div>
                <p className="mt-1 text-xs text-muted">{param.description}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border/60 pt-4">
          <span className="inline-flex items-center gap-1.5 font-mono text-[11px] text-muted">
            <Terminal className="h-3.5 w-3.5 text-primary" />
            <span>Metered per successful call, billed monthly to your Stripe customer.</span>
          </span>
          <span className="flex flex-wrap items-center gap-2">
            <Link
              href="/billing"
              className="inline-flex items-center gap-1.5 rounded-lg border border-border/80 bg-card px-3 py-1.5 text-xs font-semibold text-primary shadow-2xs transition-colors hover:bg-black/[0.03]"
            >
              <CreditCard className="h-3.5 w-3.5" />
              <span>Get Agent Key / Manage Billing (/billing)</span>
            </Link>
            <Link
              href="/.well-known/mcp.json"
              className="inline-flex items-center gap-1.5 rounded-lg border border-border/80 bg-[#F8FAFC] px-3 py-1.5 font-mono text-[11px] text-muted shadow-2xs transition-colors hover:text-foreground"
            >
              <Code2 className="h-3.5 w-3.5" />
              <span>/.well-known/mcp.json</span>
            </Link>
          </span>
        </div>
      </CardContent>
    </Card>
  );
}
