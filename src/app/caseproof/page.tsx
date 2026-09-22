import type { Metadata } from "next";
import Link from "next/link";
import CaseProofCalculator from "@/components/caseproof-calculator";
import { caseproofPresets } from "@/lib/seo/caseproof/presets";

export const metadata: Metadata = {
  title: "CaseProof — Buyer-Side Audit of a Warehouse Automation Business Case",
  description:
    "Re-runs a vendor's own quoted warehouse-automation numbers against the buyer's case: labour at the fully loaded rate, the lines a quote omits, §179 and bonus depreciation by tax year, 2–3 competing bids on one cash model, and the break-even of every assumption to confirm before signature. An unstated line blocks a pass — never defaulted.",
};

export default function Page() {
  return (
    <div className="flex min-h-screen flex-col bg-background font-sans text-foreground">
      <div className="mx-auto w-full max-w-4xl space-y-3 px-4 pt-10 text-center sm:px-6">
        <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-[28px]">
          CaseProof — the buyer&apos;s side of a warehouse automation case
        </h1>
        <p className="text-sm text-muted sm:text-base">
          A vendor&apos;s business case is built on a blended wage, ideal utilisation and the lines
          their quote does not carry. Paste the quote&apos;s own line items and your numbers, and
          CaseProof re-runs the proposal through the same engine as your case — then says which
          assumptions have to be confirmed in writing before you sign.
        </p>
      </div>

      <CaseProofCalculator initialScenario="vendor_case" />

      <div className="mx-auto w-full max-w-4xl space-y-4 px-4 pb-14 sm:px-6">
        <h2 className="text-base font-semibold text-foreground">Rule and clause deep dives</h2>
        <ul className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          {caseproofPresets.map((preset) => (
            <li key={preset.slug}>
              <Link
                className="block rounded border border-border bg-card p-3 text-sm text-muted transition-colors hover:text-foreground"
                href={`/caseproof/calc/${preset.slug}`}
              >
                <span className="block font-medium text-foreground">{preset.heading}</span>
                <span className="mt-1 block text-xs text-subtle">{preset.description}</span>
              </Link>
            </li>
          ))}
        </ul>
        <p className="text-xs text-subtle">
          Agent surface: <code className="font-mono">audit_automation_case</code>,{" "}
          <code className="font-mono">compare_automation_bids</code> and{" "}
          <code className="font-mono">after_tax_payback</code> are registered as WebMCP tools and
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
