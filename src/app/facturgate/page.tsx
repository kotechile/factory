import type { Metadata } from "next";
import Link from "next/link";
import FacturGateCalculator from "@/components/facturgate-calculator";
import { einvoicePresets } from "@/lib/seo/einvoice/presets";

export const metadata: Metadata = {
  title: "FacturGate — EU E-Invoice Pre-Send Gate & Factur-X Converter",
  description:
    "Deterministic EN 16931 + CIUS-FR pre-send validation for EU e-invoices: exact rule findings with field paths and fixes, totals reconciled to the cent, a 0-100 readiness score, and conversion to Factur-X (CII) or UBL 2.1.",
};

export default function Page() {
  return (
    <div className="flex min-h-screen flex-col bg-background font-sans text-foreground">
      <div className="mx-auto w-full max-w-4xl space-y-3 px-4 pt-10 text-center sm:px-6">
        <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-[28px]">
          FacturGate — EU e-invoice pre-send gate
        </h1>
        <p className="text-sm text-muted sm:text-base">
          Validate an EN 16931 invoice before it leaves, see the exact blocking rules with the fix
          for each, and convert it to Factur-X (CII) or UBL 2.1. Deterministic rules, no LLM, no
          invented defaults: a field that is missing fails loudly with its rule id.
        </p>
      </div>

      <FacturGateCalculator initialFormat="facturx" initialCountry="FR" />

      <div className="mx-auto w-full max-w-4xl space-y-4 px-4 pb-14 sm:px-6">
        <h2 className="text-base font-semibold text-foreground">
          Rule and country deep dives
        </h2>
        <ul className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          {einvoicePresets.map((preset) => (
            <li key={preset.slug}>
              <Link
                className="block rounded border border-border bg-card p-3 text-sm text-muted transition-colors hover:text-foreground"
                href={`/facturgate/calc/${preset.slug}`}
              >
                <span className="block font-medium text-foreground">{preset.heading}</span>
                <span className="mt-1 block text-xs text-subtle">{preset.description}</span>
              </Link>
            </li>
          ))}
        </ul>
        <p className="text-xs text-subtle">
          Agent surface: <code className="font-mono">validate_einvoice</code>,{" "}
          <code className="font-mono">convert_invoice_to_facturx</code> and{" "}
          <code className="font-mono">check_eu_vat_id</code> are registered as WebMCP tools and
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
