import * as React from "react";
import Link from "next/link";
import { ArrowRight, CreditCard, ShieldCheck } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

/**
 * The Editorial Signature shell, extracted from the LedgerLink archetype so every product renders the
 * same chrome from ONE implementation (skills/ui_component_standards.md §3, AGENTS.md rule 9).
 *
 * LedgerLink is the reference: before this module each product re-implemented — or simply lacked —
 * the horizon stripe, the ambient grid, the determinism pill and the hero layout, so "follow the
 * editorial standard" was an instruction rather than a fact about the tree. Anything here is
 * deliberately presentational: no product data, no prices.
 */

/** Domain spectrum for the horizon stripe (§3.1). Tailored per product domain, never arbitrary. */
export const HORIZON_GRADIENTS = {
  finance: "from-[#635BFF] via-[#4338CA] to-[#06B6D4]",
  compliance: "from-[#4F46E5] via-[#0284C7] to-[#10B981]",
  logistics: "from-[#EA580C] via-[#D97706] to-[#0284C7]",
  industrial: "from-[#0F766E] via-[#0891B2] to-[#4F46E5]",
  energy: "from-[#65A30D] via-[#0D9488] to-[#0284C7]",
} as const;

export type HorizonDomain = keyof typeof HORIZON_GRADIENTS;

/**
 * Per-PRODUCT accent — the identity a product carries on its card, header tile and directory row.
 *
 * The horizon gradients above are per-DOMAIN, and three of the six products are Finance, so a
 * domain-keyed card accent would paint SpendProof, LedgerLink and QuarterLine the same violet. A
 * product that cannot be told apart at a glance in the directory has no identity, which is what the
 * 2026-10-18 review found: six white cards, one indigo, nothing to look at.
 *
 * `accent` is a FILL colour only (rules, tiles, 2px bars). `ink` is the AA-safe text colour measured
 * on the surfaces it lands on (#FFFFFF card and #F8FAFC page): every ink below clears 4.7:1, while
 * the raw accents do not (e.g. #059669 is 3.4:1) — so a label is never painted in `accent`.
 */
export const PRODUCT_ACCENTS = {
  spendproof: { accent: "#635BFF", ink: "#4338CA" },
  ledgerlink: { accent: "#0284C7", ink: "#075985" },
  facturgate: { accent: "#059669", ink: "#047857" },
  parcelproof: { accent: "#EA580C", ink: "#9A3412" },
  caseproof: { accent: "#0F766E", ink: "#115E59" },
  quarterline: { accent: "#64748B", ink: "#475569" },
  ratchetproof: { accent: "#65A30D", ink: "#3F6212" },
} as const;

export type AccentSlug = keyof typeof PRODUCT_ACCENTS;

/** Falls back to the flagship accent so a new product never renders accent-less. */
export function productAccent(slug?: string): { accent: string; ink: string } {
  return PRODUCT_ACCENTS[(slug ?? "") as AccentSlug] ?? PRODUCT_ACCENTS.spendproof;
}


/**
 * The editorial secondary-text colour: #5B6B80, not the `subtle` token (#64748B).
 * slate-500 measures 4.55:1 on the page (bg #F8FAFC) but only 4.34–4.38:1 on the surfaces this
 * chrome actually puts it on (the pill's #F1F5F9/90 and the segmented control's #F1F5F9), i.e. the
 * archetype's own markup failed WCAG AA wherever it was not sitting on white — and LedgerLink has no
 * axe test, so nothing said so. #5B6B80 clears 5.0:1 on all three. Asserted by the product axe specs.
 */
export const EDITORIAL_MUTED_TEXT = "text-[#5B6B80]";

/** §3.1 — the micro-height gradient runner along the top viewport edge. */
export function HorizonStripe({ domain = "finance" }: { domain?: HorizonDomain }) {
  return (
    <div
      className={cn("h-[3.5px] w-full bg-gradient-to-r", HORIZON_GRADIENTS[domain])}
      aria-hidden="true"
    />
  );
}

/** §3.2 — the feathered mathematical dot grid behind the hero. */
export function AmbientGrid({ height = "h-72" }: { height?: string }) {
  return (
    <div
      className={cn(
        "pointer-events-none absolute inset-x-0 top-0 -z-10",
        height,
        "[background-image:radial-gradient(#CBD5E1_0.75px,transparent_0.75px)] [background-size:16px_16px] opacity-60 [mask-image:linear-gradient(to_bottom,black_60%,transparent_100%)]",
      )}
      aria-hidden="true"
    />
  );
}

/**
 * §3.4 — the interactive determinism pill: emerald beacon + monospaced label(s).
 * `primary` is the claim the product makes; `secondary` is the standard it conforms to.
 */
export function DeterminismPill({
  primary,
  secondary,
}: {
  primary: string;
  secondary?: string;
}) {
  return (
    <div className="inline-flex items-center gap-2 self-center rounded-full border border-[#E2E8F0] bg-[#F1F5F9]/90 px-3 py-1 font-mono text-xs text-[#334155] shadow-2xs backdrop-blur-xs lg:self-start">
      <span className="relative flex h-1.5 w-1.5">
        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#10B981] opacity-75" />
        <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-[#10B981]" />
      </span>
      <span className="font-semibold text-foreground">{primary}</span>
      {secondary ? (
        <>
          <span className="text-[#CBD5E1]">|</span>
          <span className={EDITORIAL_MUTED_TEXT}>{secondary}</span>
        </>
      ) : null}
    </div>
  );
}

/**
 * §3.3 — the hero: headline beside the transformation schematic, never bare text in a void.
 * The artwork is a prop so each product supplies its own metaphor from the shared `PrismSchematic`.
 */
export function EditorialHero({
  pill,
  title,
  description,
  artwork,
  signature,
  actions,
}: {
  pill: React.ReactNode;
  title: React.ReactNode;
  description: React.ReactNode;
  artwork: React.ReactNode;
  /** A short math-fidelity line rendered under the artwork (the invariant the diagram asserts). */
  signature?: React.ReactNode;
  /**
   * The page's single ask, directly under the promise. A product page that states a claim and offers
   * no action above the fold is a brochure: the 2026-10-18 review measured 1–2 above-fold actions on
   * a 1000–1200-word page, and on SpendProof the only one was the billing link. Verb-first primary,
   * one secondary at most.
   */
  actions?: React.ReactNode;
}) {
  return (
    <div className="mx-auto max-w-6xl">
      <div className="grid grid-cols-1 items-center gap-8 lg:grid-cols-12">
        <div className="flex flex-col justify-center space-y-4 text-center lg:col-span-6 lg:text-left">
          {pill}
          <h1 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl lg:text-[38px] lg:leading-[1.18]">
            {title}
          </h1>
          <p className="max-w-xl text-sm leading-relaxed text-muted sm:text-base">{description}</p>
          {actions ? (
            <div className="flex flex-col items-stretch gap-2.5 pt-1 sm:flex-row sm:items-center sm:justify-center lg:justify-start">
              {actions}
            </div>
          ) : null}
        </div>
        <div className="space-y-3 lg:col-span-6">
          {artwork}
          {signature}
        </div>
      </div>
    </div>
  );
}


/**
 * The hero's ask, as a pair. One primary (verb-first), one quiet secondary. Shared so the four
 * editorial product pages cannot drift into four different CTA treatments.
 */
export function HeroActions({
  primaryHref,
  primaryLabel,
  secondaryHref = "/billing",
  secondaryLabel = "See pricing",
}: {
  primaryHref: string;
  primaryLabel: string;
  secondaryHref?: string;
  secondaryLabel?: string;
}) {
  return (
    <>
      <Link
        href={primaryHref}
        className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-primary px-5 text-sm font-semibold text-card shadow-[0_2px_8px_rgba(79,70,229,0.35),inset_0_1px_0_rgba(255,255,255,0.2)] transition-all duration-150 hover:-translate-y-0.5 hover:shadow-[0_4px_12px_rgba(79,70,229,0.45),inset_0_1px_0_rgba(255,255,255,0.25)] active:translate-y-0"
      >
        {primaryLabel}
        <ArrowRight className="h-4 w-4" aria-hidden="true" />
      </Link>
      <Link
        href={secondaryHref}
        className="inline-flex min-h-11 items-center justify-center rounded-xl border border-border bg-card px-5 text-sm font-semibold text-foreground shadow-2xs transition-colors hover:bg-black/[0.03]"
      >
        {secondaryLabel}
      </Link>
    </>
  );
}

/**
 * §3.8 — layered ghost elevation: no heavy opaque 1px border on a white surface.
 * Use for the primary work surfaces; `subtle` is the secondary summary-card treatment.
 */
export function GhostCard({
  subtle = false,
  className,
  children,
  ...props
}: React.HTMLAttributes<HTMLDivElement> & { subtle?: boolean }) {
  return (
    <div
      className={cn(
        "rounded-2xl",
        subtle
          ? "border border-border/80 bg-background/80 shadow-2xs backdrop-blur-xs"
          : "border-0 bg-card ring-1 ring-[#0F172A]/[0.06] shadow-[0_0_0_1px_rgba(15,23,42,0.06),0_8px_24px_-4px_rgba(15,23,42,0.04)]",
        className,
      )}
      {...props}
    >
      {children}
    </div>
  );
}

/** §3.7 — the tactile primary CTA treatment, applied on top of the `Button` primitive. */
export const TACTILE_CTA =
  "transition-all duration-150 hover:-translate-y-0.5 active:translate-y-0 shadow-[0_2px_8px_rgba(79,70,229,0.35),inset_0_1px_0_rgba(255,255,255,0.2)] hover:shadow-[0_4px_12px_rgba(79,70,229,0.45),inset_0_1px_0_rgba(255,255,255,0.25)] rounded-xl";

/**
 * The sticky product header, shared by every product page (LedgerLink's header, generalized).
 * `priceChip` must be built by the caller FROM the pricing catalog — never a literal.
 */
export function ProductHeader({
  initials,
  name,
  badge,
  tagline,
  billingLabel = "Billing",
  priceChip,
  assurance,
  slug,
}: {
  initials: string;
  name: string;
  badge: string;
  tagline: string;
  billingLabel?: string;
  priceChip?: React.ReactNode;
  assurance?: string;
  /** Product slug — selects the accent identity for the tile and the billing glyph. */
  slug?: string;
}) {
  const tone = productAccent(slug);
  return (
    <header className="sticky top-0 z-40 border-b border-border bg-card/85 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        <div className="flex items-center gap-3">
          {/* The tile paints `ink`, not `accent`: white on the raw accent fails WCAG AA for
              16px bold (measured 3.04:1 for #EA580C, 3.42:1 for #059669 — axe flagged both the
              moment the accents landed on FacturGate and ParcelProof). `ink` clears 5.2:1+ and
              keeps the product's hue. */}
          <div
            className="flex h-9 w-9 items-center justify-center rounded-lg text-base font-bold tracking-tight text-card shadow-xs"
            style={{ backgroundColor: tone.ink }}
          >
            {initials}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-lg font-bold tracking-tight text-foreground">{name}</span>
              <Badge variant="accent">{badge}</Badge>
            </div>
            <p className="text-xs text-subtle">{tagline}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Link
            href="/billing"
            className="inline-flex items-center gap-1.5 rounded-md border border-border/70 bg-card px-2.5 py-1.5 text-xs font-semibold text-foreground shadow-2xs transition-colors hover:bg-black/[0.03]"
          >
            <CreditCard className="h-3.5 w-3.5" style={{ color: tone.ink }} />
            <span>{billingLabel}</span>
            {priceChip ? (
              <span className="hidden font-mono text-[11px] font-semibold text-primary sm:inline">
                {priceChip}
              </span>
            ) : null}
          </Link>
          {assurance ? (
            <Badge variant="success" className="hidden gap-1 md:inline-flex">
              <ShieldCheck className="h-3.5 w-3.5" />
              <span>{assurance}</span>
            </Badge>
          ) : null}
        </div>
      </div>
    </header>
  );
}
