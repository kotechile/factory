import { notFound } from "next/navigation";
import type { Metadata } from "next";
import Link from "next/link";
import { CreditCard, ShieldCheck } from "lucide-react";
import FacturGateCalculator from "@/components/facturgate-calculator";
import { Badge } from "@/components/ui/badge";
import { einvoicePresets, getEinvoicePreset } from "@/lib/seo/einvoice/presets";

interface Props {
  params: Promise<{ slug: string }>;
}

export function generateStaticParams() {
  return einvoicePresets.map((preset) => ({ slug: preset.slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const preset = getEinvoicePreset(slug);
  if (!preset) return {};
  return {
    title: preset.title,
    description: preset.description,
    alternates: { canonical: `/facturgate/calc/${slug}` },
  };
}

export default async function CalcPage({ params }: Props) {
  const { slug } = await params;
  const preset = getEinvoicePreset(slug);
  if (!preset) notFound();

  return (
    <div className="flex min-h-screen flex-col bg-background font-sans text-foreground">
      {/* Top Horizon Stripe */}
      <div
        className="h-[3.5px] w-full bg-gradient-to-r from-[#4F46E5] via-[#0284C7] to-[#10B981]"
        aria-hidden="true"
      />

      {/* Header */}
      <header className="sticky top-0 z-40 border-b border-border bg-card/85 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-3">
            <Link
              href="/facturgate"
              className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary text-base font-bold tracking-tight text-card shadow-xs transition-opacity hover:opacity-90"
            >
              FG
            </Link>
            <div>
              <div className="flex items-center gap-2">
                <Link
                  href="/facturgate"
                  className="text-lg font-bold tracking-tight text-foreground hover:underline"
                >
                  FacturGate
                </Link>
                <Badge variant="accent">Rule Deep Dive</Badge>
              </div>
              <p className="text-xs text-subtle">EU E-Invoice Pre-Send Gate &amp; Factur-X Converter</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Link
              href="/billing"
              className="inline-flex items-center gap-1.5 rounded-md border border-border/70 bg-card px-2.5 py-1.5 text-xs font-semibold text-foreground hover:bg-black/[0.03] transition-colors shadow-2xs"
            >
              <CreditCard className="h-3.5 w-3.5 text-primary" />
              <span>Billing &amp; Pricing</span>
              <span className="hidden sm:inline font-mono text-[11px] font-semibold text-primary">
                ($29/mo · from $0.05/call)
              </span>
            </Link>
            <Badge variant="success" className="hidden lg:inline-flex gap-1">
              <ShieldCheck className="h-3.5 w-3.5" />
              <span>Zero Egress</span>
            </Badge>
          </div>
        </div>
      </header>

      {/* Ambient Grid Canvas */}
      <div className="relative flex-1">
        <div
          className="pointer-events-none absolute inset-x-0 top-0 h-72 -z-10 [background-image:radial-gradient(#CBD5E1_0.75px,transparent_0.75px)] [background-size:16px_16px] opacity-60 [mask-image:linear-gradient(to_bottom,black_60%,transparent_100%)]"
          aria-hidden="true"
        />

        <div className="mx-auto w-full max-w-4xl space-y-3 px-4 pt-8 text-center sm:px-6">
          <div className="flex items-center justify-center gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-3 py-1 font-mono text-xs font-semibold text-primary">
              <span className="h-1.5 w-1.5 rounded-full bg-primary animate-pulse" />
              PRESET RULE RUNNER
            </span>
          </div>

          <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-[28px]">
            {preset.heading}
          </h1>
          <p className="text-sm text-muted sm:text-base">{preset.intro}</p>
          <ul className="mx-auto max-w-2xl list-disc space-y-1 text-left text-sm text-subtle">
            {preset.bullets.map((bullet) => (
              <li key={bullet}>{bullet}</li>
            ))}
          </ul>
        </div>

        <FacturGateCalculator
          initialFormat={preset.targetFormat}
          initialCountry={preset.targetCountry}
        />

        <div className="mx-auto w-full max-w-4xl space-y-4 px-4 pb-14 text-sm sm:px-6">
          <Link className="inline-flex items-center gap-1 font-medium text-primary underline" href="/facturgate">
            ← All FacturGate rule and country pages
          </Link>
        </div>
      </div>
    </div>
  );
}
