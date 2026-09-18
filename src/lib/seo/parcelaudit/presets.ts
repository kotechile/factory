/**
 * Programmatic-SEO presets for ParcelProof (PRD §4): one landing page per dated rule or carrier
 * clause a shipper actually searches for — the divisor change, the round-up rule, the cubic-inch
 * threshold, the AHS-Dimension trigger and each carrier's dispute window.
 *
 * Each preset pre-loads the audit scenario that demonstrates the rule, so a visitor lands on a
 * working audit rather than an empty form. Deliberately a handful of the highest-intent pages, not
 * the full rule × carrier cross-product (PRD §5 scope guard), and no page claims a rule the engine
 * does not implement — the coverage panel on each page says what v1 does not check.
 */
import type { ScenarioKey } from "@/lib/calc/parcelaudit/fixtures";

export interface ParcelauditSeoPreset {
  slug: string;
  title: string;
  description: string;
  heading: string;
  intro: string;
  bullets: string[];
  /** The audit the page pre-loads. */
  scenario: ScenarioKey;
}

export const parcelauditPresets: ParcelauditSeoPreset[] = [
  {
    slug: "usps-dim-divisor-2026",
    title: "USPS DIM Divisor 2026: 166 → 139 from 2026-07-12 (What It Costs You)",
    description:
      "USPS dropped the dimensional-weight divisor from 166 to 139 on 2026-07-12. See which of your parcels crossed the line, what the carrier billed, and the exact overcharge when the new divisor was applied to an old shipment.",
    heading: "USPS DIM divisor 2026 — 166 → 139 on 2026-07-12",
    intro:
      "A lower divisor divides the same cubic inches into more pounds, so every bulky-but-light parcel got heavier on 2026-07-12. The trap runs both ways: a June shipment billed at the July divisor is an overcharge you can dispute, and a July shipment billed at 166 means your own cost estimate is still under-quoting.",
    bullets: [
      "Audits each line at the divisor in force on its own ship date — 166 before 2026-07-12, 139 from that date.",
      "Accepts the new divisor as billed once it is in force: no false disputes against a correct invoice.",
      "Prices the delta from your contract rate card, in cents, per tracking number.",
    ],
    scenario: "overcharge",
  },
  {
    slug: "dim-round-up-fractional-inch",
    title: "Fractional Package Dimensions Round Up: 11.2″ Is Billed as 12″",
    description:
      "Since the 2026 DIM changes, a fractional package dimension rounds up to the next whole inch, so 11.2″ bills as 12″. Check whether your invoices were built from rounded or truncated dimensions.",
    heading: "Fractional dims round up — 11.2″ bills as 12″",
    intro:
      "One tenth of an inch is worth a pound on a bulky parcel, and the round-up rule cuts in the carrier's favour. The audit applies the round-up to your declared dimensions and shows both the rounded and the truncated weight, so you can see whether the carrier rounded the way its own tariff requires.",
    bullets: [
      "Applies ceil() to each dimension before computing cubic inches.",
      "Reports the rounded dimensions, the cubic inches and the raw dimensional weight per line.",
      "Treats a bill built from truncated dimensions as an under-bill — recorded, never claimed as a recovery.",
    ],
    scenario: "roundup",
  },
  {
    slug: "cubic-inch-threshold-1728",
    title: "Why DIM Weight Should Not Apply Below 1,728 Cubic Inches (FedEx Ground / USPS)",
    description:
      "FedEx Ground and USPS bill dimensional weight only above 1,728 cubic inches. Catch the invoices where DIM was charged on a smaller parcel and price the difference.",
    heading: "DIM billed below the 1,728 cu in threshold",
    intro:
      "1,728 cubic inches is one cubic foot. Above it, the dimensional weight is fair game; below it, FedEx Ground and USPS bill the scale weight. A 16×10×10 box (1,600 cu in) billed on its dimensional weight is a straightforward dispute.",
    bullets: [
      "Carries the cubic-inch threshold per carrier and service, and checks which side of it your parcel falls on.",
      "Recomputes the billable weight with the threshold applied, not with the billed number.",
      "Names the threshold and the parcel's cubic inches in the finding, so the dispute quotes the tariff.",
    ],
    scenario: "threshold",
  },
  {
    slug: "ahs-dimension-trigger",
    title: "AHS-Dimension: The Trigger That Has to Hold (Longest Side)",
    description:
      "Additional Handling – Dimension applies only when the package's longest side exceeds the carrier's trigger. Check every AHS charge against the dimensions you actually shipped.",
    heading: "AHS-Dimension — billed without the trigger",
    intro:
      "AHS-Dimension is one of the largest per-package accessorials in 2026 tariffs, and it is assessed on a dimension trigger: the package's longest side. When the parcel on the invoice does not exceed the trigger, the charge has no basis — and the audit names the condition that failed rather than asserting a discrepancy.",
    bullets: [
      "Evaluates the longest rounded side against the carrier's own trigger and shows both numbers.",
      "V1 thresholds: FedEx 48″ and UPS 96″ (the PRD's tariff table — the trigger lives in one line of code and is published).",
      "Also checks AHS-Weight, oversize, residential and address-correction eligibility, and reports USPS accessorials it cannot assess as unsupported.",
    ],
    scenario: "overcharge",
  },
  {
    slug: "fedex-21-day-dispute-window",
    title: "FedEx Dispute Window: 21 Days From the Invoice (Then It Is Gone)",
    description:
      "FedEx allows roughly 21 days from the invoice date to dispute a billing error. See which lines are still claimable, which close within a week, and which are already expired.",
    heading: "FedEx 21-day dispute window",
    intro:
      "An audit that finds an overcharge after the window has closed changes nothing. The clock is computed per line from the invoice date, so recovery effort goes to the lines that can still be claimed — and the expired ones are counted honestly instead of inflating the number.",
    bullets: [
      "Per-line window status: open, expiring within 7 days, or expired.",
      "Recovery total split into claimable and window-expired money.",
      "The dispute CSV carries the window status and deadline on every row.",
    ],
    scenario: "deadline",
  },
  {
    slug: "ups-30-day-dispute-window",
    title: "UPS Dispute Window: 30 Days — What Expires on Your Invoice This Week",
    description:
      "UPS allows roughly 30 days from the invoice date to dispute a billing error. Split your audit into claimable and expired money, per line, with the deadline named.",
    heading: "UPS 30-day dispute window",
    intro:
      "Thirty days is enough to recover a week's worth of over-billing — if someone reads the invoice in time. The audit produces the per-carrier split (UPS ≈30 days, FedEx ≈21 days) and flags the lines that close inside the week.",
    bullets: [
      "Counts the window from each line's invoice date, not from the audit run.",
      "Flags claimable lines closing within 7 days so they are worked first.",
      "Expired overcharges stay on the ledger as a measured exposure, never as recovery.",
    ],
    scenario: "deadline",
  },
];

export function getParcelauditPreset(slug: string): ParcelauditSeoPreset | undefined {
  return parcelauditPresets.find((preset) => preset.slug === slug);
}
