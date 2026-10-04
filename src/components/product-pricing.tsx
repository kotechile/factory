import Link from "next/link";
import { CreditCard } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { SUITE_PRO_MONTHLY_USD, agentRatesForProduct, pricingFor } from "@/products/pricing";

/**
 * The pricing block on a product page. Every number comes from src/products/pricing.ts, the same
 * catalog the agent API charges from — so a displayed price and a charged price cannot drift.
 */

function usd(amount: number): string {
  return `$${amount.toFixed(2)}`;
}

export default function ProductPricing({ slug }: { slug: string }) {
  const pricing = pricingFor(slug);
  const rates = Object.entries(agentRatesForProduct(slug));
  const hasPricedExport = pricing.exportUsd !== null;

  return (
    <section
      aria-labelledby={`pricing-heading-${slug}`}
      className="mx-auto w-full max-w-4xl space-y-4 px-4 pb-14 sm:px-6"
    >
      <div className="flex items-center justify-between gap-3">
        <div className="space-y-1">
          <h2 id={`pricing-heading-${slug}`} className="text-base font-semibold text-foreground">
            Pricing
          </h2>
          <p className="text-xs text-muted">
            Use it free in the browser. Pay only for exports, the suite, or agent calls.
          </p>
        </div>
        <Badge variant="outline" className="hidden font-mono text-[10px] sm:inline-flex">
          NO HIDDEN FEES
        </Badge>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <Card className="rounded-2xl border-border/80">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-bold">Free</CardTitle>
          </CardHeader>
          <CardContent className="text-xs text-muted leading-relaxed">
            {pricing.freeTier}. No account and no card.
          </CardContent>
        </Card>

        <Card className="rounded-2xl border-border/80">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-bold">
              {hasPricedExport ? `${usd(pricing.exportUsd as number)} one-off` : "Export"}
            </CardTitle>
          </CardHeader>
          <CardContent className="text-xs text-muted leading-relaxed">
            {pricing.exportLabel}
            {hasPricedExport ? ", or unlock every export with Pro." : "."}
          </CardContent>
        </Card>

        <Card className="rounded-2xl border-border/80">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-bold">{usd(SUITE_PRO_MONTHLY_USD)}/month</CardTitle>
          </CardHeader>
          <CardContent className="text-xs text-muted leading-relaxed">
            Factory Pro: unlimited browser use and exports across every live product. Cancel any time.
          </CardContent>
        </Card>
      </div>

      <div className="overflow-hidden rounded-2xl border border-border/80">
        <table className="w-full border-collapse text-left text-xs">
          <caption className="sr-only">Agent (WebMCP) rates for this product</caption>
          <thead>
            <tr className="border-b border-border/80 bg-card font-mono text-[11px] uppercase tracking-wider text-muted">
              <th scope="col" className="py-3 pl-6 pr-4 font-semibold">
                Agent tool
              </th>
              <th scope="col" className="py-3 pr-6 pl-4 font-semibold">
                Metered rate
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border/50">
            {rates.map(([tool, rate]) => (
              <tr key={tool}>
                <td className="py-3 pl-6 pr-4">
                  <code className="font-mono text-[11px] text-foreground">{tool}</code>
                </td>
                <td className="py-3 pr-6 pl-4 font-mono text-[11px] font-bold text-primary">
                  {usd(rate)} per successful call
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
        <p className="text-xs text-subtle">
          Agent calls are metered per successful call and billed monthly to your Stripe customer.{" "}
          <Link className="underline hover:text-foreground" href="/billing">
            Billing
          </Link>{" "}
          shows your usage, history and spend cap.
        </p>
        <Link
          href="/billing"
          className="inline-flex items-center gap-1.5 rounded-lg border border-border/80 bg-card px-3 py-1.5 text-xs font-semibold text-primary hover:underline hover:bg-black/[0.03] transition-colors shadow-2xs"
        >
          <CreditCard className="h-3.5 w-3.5" />
          <span>Manage Billing &amp; API Keys (/billing) →</span>
        </Link>
      </div>
    </section>
  );
}
