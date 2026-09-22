/**
 * Programmatic-SEO presets for CaseProof (PRD §4): one landing page per dated rule or clause a buyer
 * of warehouse automation actually searches for — the loaded labour rate, the 2026 §179 limits and
 * the in-service deadline, the maintenance line every quote omits, the payback that moves when the
 * vendor's assumptions meet the buyer's, the seasonal premium that flips a subscription against a
 * capex bid, and the turnover the crew actually costs.
 *
 * Each preset pre-loads the scenario that demonstrates the rule, so a visitor lands on a working
 * audit rather than an empty form. Deliberately a handful of the highest-intent pages, not the full
 * rule × carrier cross-product, and no page claims a rule the engine does not implement — the
 * coverage panel on every page says what v1 does not check.
 */
import type { ScenarioKey } from "@/lib/calc/caseproof/fixtures";

export interface CaseproofSeoPreset {
  slug: string;
  title: string;
  description: string;
  heading: string;
  intro: string;
  bullets: string[];
  /** The audit the page pre-loads. */
  scenario: ScenarioKey;
}

export const caseproofPresets: CaseproofSeoPreset[] = [
  {
    slug: "fully-loaded-labor-rate-2026",
    title: "Fully Loaded Labour Rate 2026: What an Hour Really Costs (Payroll, Benefits, Turnover)",
    description:
      "A vendor's case prices labour at the blended wage. The fully loaded rate adds employer payroll taxes, benefits, the overtime premium and the cost of replacing the crew you lose each year — and it is the number a labour-saving case actually turns on.",
    heading: "Your labour rate is not the wage",
    intro:
      "A blended hourly wage is the single biggest understatement in a vendor's business case. Add employer payroll taxes, benefits, the FLSA overtime premium and the rehire cost of the turnover warehousing runs (60%+/yr) and the hourly rate the project removes is materially higher than the number on the proposal — which cuts both ways: it can make a marginal case good, and it is the first assumption a capital committee should demand in writing.",
    bullets: [
      "Component breakdown per hour: wage, payroll burden, benefits, overtime premium, turnover replacement.",
      "Turnover is priced as annual separations per FTE × the fully loaded cost of one replacement, spread over paid hours.",
      "An unstated component is reported unstated and the rate is published as a floor — never defaulted to a percentage.",
    ],
    scenario: "vendor_case",
  },
  {
    slug: "section-179-2026-in-service-deadline",
    title: "Section 179 in 2026: $2,560,000 Limit, $4,090,000 Phase-Out, In Service by 2026-12-31",
    description:
      "Section 179 expensing for 2026: the $2,560,000 dollar limit, the phase-out that starts at $4,090,000 of property placed in service, 100% bonus depreciation on the rest, and the 2026-12-31 deadline that puts the purchase decision in September and October.",
    heading: "Section 179 in 2026, with the phase-out applied",
    intro:
      "Equipment has to be placed in service by 2026-12-31 to claim the 2026 write-off, and with integration and installation inside the project that decision is being made now. The trap is the phase-out: the dollar limit falls by $1 for every $1 of qualifying property above $4,090,000, so a large project cannot expense the amount it elects. CaseProof applies §179 first, then 100% bonus depreciation to the remainder, then straight-line — by tax year.",
    bullets: [
      "§179 limit $2,560,000, phase-out from $4,090,000, zero at $6,650,000 of qualifying property.",
      "The election is capped by the reduced limit, and the report says how much it actually delivers.",
      "Bonus depreciation is applied to what §179 leaves; a year with no cited rule is refused, never estimated.",
    ],
    scenario: "phase_out",
  },
  {
    slug: "warehouse-automation-maintenance-cost-15-percent",
    title: "The Maintenance Line Every Automation Quote Omits (15–20% of Equipment Cost a Year)",
    description:
      "Warehouse automation runs 15–20% of equipment cost a year in maintenance, spares and change. Quotes routinely leave it blank — and a blank line is not a zero. See what an unstated maintenance term does to a payback.",
    heading: "The maintenance line a quote leaves blank",
    intro:
      "A vendor quote prices robots and installation. It rarely prices the annual reality: preventive maintenance, spares, software change and the operational tuning of the first year. On a $2.73M fleet, 15% a year is $409,500 — which is the difference between a payback that clears a capital committee's hurdle and one that does not. CaseProof refuses to assume a percentage: if the line is blank, it is reported unstated and blocks a pass.",
    bullets: [
      "Maintenance is priced from the quote's own line in dollars, or from a percentage of capex you state — never inferred.",
      "An unstated maintenance term is reported unstated, charges $0, and blocks a pass verdict.",
      "Software, spares and the first-year tuning are separate lines, each surfaced if absent.",
    ],
    scenario: "unstated_maintenance",
  },
  {
    slug: "vendor-payback-14-months-vs-41",
    title: "A 14-Month Vendor Payback, Audited at 41 Months: The Working Arithmetic",
    description:
      "A proposal that quotes 14 months of payback can audit at 41 on the buyer's own numbers. Here is the same engine re-running the vendor's assumptions, then applying the buyer's — one named input at a time, so every month of the difference is attributable.",
    heading: "14 months becomes 41 — and you can see which input did it",
    intro:
      "The claim is not a lie; it is arithmetic on different inputs. CaseProof re-runs the proposal through the same engine first — reproducing the 14 months — then applies the buyer's reality one group of inputs at a time: the headcount that actually goes, the fully loaded rate, turnover, the ramp, maintenance, the omitted one-time lines, the uptime nobody promised, and the buyer's own tax position. The chain ends exactly on the audited payback, so no month of the gap is unexplained.",
    bullets: [
      "The vendor's own assumptions are re-run, so the flip is reproducible rather than asserted.",
      "Each step reports the payback before and after, and the months it added.",
      "The ranking then lists what has to be confirmed in writing before signature, riskiest first.",
    ],
    scenario: "vendor_case",
  },
  {
    slug: "capex-vs-raas-warehouse-robots",
    title: "Buying Robots vs Renting Them: The Seasonal Premium Where the Ranking Flips",
    description:
      "A capex bid and a per-unit subscription cannot be compared from their price lists: they are different cash shapes. Put both on one after-tax five-year model and find the seasonal premium at which the ranking flips.",
    heading: "Capex vs subscription — one cash model",
    intro:
      "A per-unit subscription is priced against the fleet the site needs, and the peak season needs more of it. A capex purchase prices that peak once. The two are not comparable from a price list — but they are comparable on one after-tax cash model, and the interesting number is the point where the ranking flips: below it the subscription leads, above it the capex bid does.",
    bullets: [
      "Both bids on one cash model: payback, IRR, NPV at your hurdle rate, cost per order and per line.",
      "The crossing point is solved, not eyeballed, and a range with no crossing is reported as such.",
      "Sensitivity grid: volume −10/−20/−30%, capex +15%, maintenance +25%, with any ranking flip named.",
    ],
    scenario: "raas_comparison",
  },
  {
    slug: "warehouse-turnover-cost-per-fte",
    title: "Turnover at 58%: What Replacing One Warehouse FTE Costs (and Why It Belongs in the Case)",
    description:
      "Warehousing runs 60%+ annual turnover. Every FTE a project removes also removes the rehire and onboarding cost of replacing them — a line no vendor's case carries, and one the audit prices explicitly.",
    heading: "Turnover: the labour line nobody prices",
    intro:
      "At 58% annual separations and $3,200 fully loaded per replacement, one FTE carries roughly $1,856 a year in churn before they pick anything — a component of the loaded hourly rate. Removing 18 FTE removes that cost too, and a case that ignores it understates its own saving. The audit prices it from your numbers, and reports it unstated if you have not measured it.",
    bullets: [
      "Turnover is priced as annual separations × cost per hire ÷ paid hours per FTE-year.",
      "The loaded rate therefore changes when you fix staffing, not only when you fix wages.",
      "Unstated turnover and cost-per-hire are reported, and the case cannot pass on a floor.",
    ],
    scenario: "vendor_case",
  },
];

export function getCaseproofPreset(slug: string): CaseproofSeoPreset | undefined {
  return caseproofPresets.find((preset) => preset.slug === slug);
}
