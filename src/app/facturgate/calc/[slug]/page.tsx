import { notFound } from "next/navigation";
import type { Metadata } from "next";
import Link from "next/link";
import FacturGateCalculator from "@/components/facturgate-calculator";
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
      <div className="mx-auto w-full max-w-4xl space-y-3 px-4 pt-10 text-center sm:px-6">
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

      <div className="mx-auto w-full max-w-4xl px-4 pb-14 text-sm sm:px-6">
        <Link className="underline" href="/facturgate">
          ← All FacturGate rule and country pages
        </Link>
      </div>
    </div>
  );
}
