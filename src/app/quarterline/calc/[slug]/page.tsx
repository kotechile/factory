import { notFound } from "next/navigation";
import type { Metadata } from "next";
import QuarterLineCalculator from "@/components/quarterline-calculator";
import { getPreset, presets } from "@/lib/seo/presets";

interface Props {
  params: Promise<{ slug: string }>;
}

export function generateStaticParams() {
  return presets.map((p) => ({ slug: p.slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const preset = getPreset(slug);
  if (!preset) return {};
  return {
    title: preset.title,
    description: preset.description,
    alternates: { canonical: `/quarterline/calc/${slug}` },
  };
}

export default async function CalcPage({ params }: Props) {
  const { slug } = await params;
  const preset = getPreset(slug);
  if (!preset) notFound();

  return (
    <div className="flex min-h-screen flex-col bg-background font-sans text-foreground">
      <div className="mx-auto w-full max-w-3xl space-y-2 px-4 pt-10 text-center sm:px-6">
        <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-[28px]">
          {preset.heading}
        </h1>
        <p className="text-sm text-muted sm:text-base">{preset.intro}</p>
      </div>
      <QuarterLineCalculator initial={preset.defaults} />
    </div>
  );
}
