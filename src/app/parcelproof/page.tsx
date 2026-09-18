import type { Metadata } from "next";
import Link from "next/link";
import ParcelProofCalculator from "@/components/parcelproof-calculator";
import { parcelauditPresets } from "@/lib/seo/parcelaudit/presets";

export const metadata: Metadata = {
  title: "ParcelProof — Carrier Invoice DIM-Weight & Surcharge Audit",
  description:
    "Audit UPS, FedEx and USPS parcel invoices against your own shipment records: billable weight recomputed with the carrier × service × ship-date divisor and the round-up rule, accessorial eligibility re-checked with the trigger that failed, late-delivery refunds, the per-line dispute window and a dispute CSV. Unpriced lines are reported unverifiable, never guessed.",
};

export default function Page() {
  return (
    <div className="flex min-h-screen flex-col bg-background font-sans text-foreground">
      <div className="mx-auto w-full max-w-4xl space-y-3 px-4 pt-10 text-center sm:px-6">
        <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-[28px]">
          ParcelProof — carrier invoice DIM-weight &amp; surcharge audit
        </h1>
        <p className="text-sm text-muted sm:text-base">
          Paste the shipment records you handed over and the carrier&apos;s invoice lines. Every line
          is recomputed against the tariff in force on its own ship date, the accessorial eligibility
          is re-checked with the trigger that failed, and the recovery is priced from your own
          contract rate card — a line that cannot be priced is reported unverifiable, never guessed.
        </p>
      </div>

      <ParcelProofCalculator initialScenario="overcharge" />

      <div className="mx-auto w-full max-w-4xl space-y-4 px-4 pb-14 sm:px-6">
        <h2 className="text-base font-semibold text-foreground">Rule and carrier deep dives</h2>
        <ul className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          {parcelauditPresets.map((preset) => (
            <li key={preset.slug}>
              <Link
                className="block rounded border border-border bg-card p-3 text-sm text-muted transition-colors hover:text-foreground"
                href={`/parcelproof/calc/${preset.slug}`}
              >
                <span className="block font-medium text-foreground">{preset.heading}</span>
                <span className="mt-1 block text-xs text-subtle">{preset.description}</span>
              </Link>
            </li>
          ))}
        </ul>
        <p className="text-xs text-subtle">
          Agent surface: <code className="font-mono">audit_carrier_invoice</code> and{" "}
          <code className="font-mono">compute_billable_weight</code> are registered as WebMCP tools and
          advertised in{" "}
          <Link className="underline" href="/.well-known/mcp.json">
            /.well-known/mcp.json
          </Link>
          .
        </p>
      </div>
    </div>
  );
}
