import type { SelfEmployment2026Input } from "@/lib/calc/selfEmployment2026";

export interface SeoPreset {
  slug: string;
  title: string;
  description: string;
  heading: string;
  intro: string;
  defaults: Partial<SelfEmployment2026Input>;
}

// Programmatic-SEO presets. Each slug is a pre-rendered /calc/<slug> landing page
// that ranks for a hyper-specific long-tail query and pre-fills the calculator with
// realistic scenario defaults (marketing_engineering_playbook.md — Tactic B1).
export const presets: SeoPreset[] = [
  {
    slug: "california-freelancer-tax-2026",
    title: "California Freelancer Tax Calculator 2026 — Self-Employment & QBI",
    description:
      "Estimate 2026 California freelancer self-employment tax, Section 199A QBI deduction (statutory 20%), and safe-harbor quarterly payments before the Sept 15 deadline.",
    heading: "California Freelancer 2026 Tax Calculator",
    intro:
      "Freelancing in California? Estimate your federal self-employment tax, QBI deduction, and Q3 estimated payment.",
    defaults: { grossIncome: 120000, businessExpenses: 15000, filingStatus: "single" },
  },
  {
    slug: "new-york-schedule-c-qbi",
    title: "New York Schedule C QBI Deduction Calculator 2026",
    description:
      "Calculate 2026 New York Schedule C self-employment tax and QBI deduction using the enacted 20% rate — not the erroneous 23%.",
    heading: "New York Schedule C QBI Calculator 2026",
    intro:
      "New York freelancers and single-member LLC owners: verify your QBI deduction and estimated payments with the statutory 20% rate.",
    defaults: { grossIncome: 180000, businessExpenses: 25000, filingStatus: "single" },
  },
  {
    slug: "texas-1099-estimated-tax",
    title: "Texas 1099 Contractor Estimated Tax Calculator 2026",
    description:
      "No state income tax in Texas — estimate your 2026 federal 1099 self-employment tax and quarterly safe-harbor payments.",
    heading: "Texas 1099 Estimated Tax Calculator 2026",
    intro:
      "Texas 1099 contractors pay no state income tax — but federal self-employment tax and estimated payments still apply. Plan them here.",
    defaults: { grossIncome: 95000, businessExpenses: 10000, filingStatus: "single" },
  },
  {
    slug: "consulting-sstb-phaseout-2026",
    title: "Consulting SSTB QBI Phase-Out Calculator 2026",
    description:
      "Consultants hit the QBI phase-out range? See how the 2026 Section 199A phase-out reduces your deduction and raises your effective rate.",
    heading: "Consulting SSTB QBI Phase-Out Calculator 2026",
    intro:
      "Specified Service Trade or Business (consulting) income over the threshold phases out the QBI deduction. Model your 2026 exposure.",
    defaults: { grossIncome: 250000, businessExpenses: 20000, isSstb: true, filingStatus: "single" },
  },
  {
    slug: "single-member-llc-safe-harbor",
    title: "Single-Member LLC Safe-Harbor Estimated Tax 2026",
    description:
      "Single-member LLC owners: calculate your 2026 safe-harbor estimated tax (100%/110% prior-year method) and avoid underpayment penalties.",
    heading: "Single-Member LLC Safe-Harbor Calculator 2026",
    intro:
      "Use the prior-year safe-harbor method to cap your 2026 estimated payments and avoid the 20% underpayment penalty.",
    defaults: { grossIncome: 150000, businessExpenses: 18000, priorYearAgi: 140000, priorYearTax: 22000, filingStatus: "single" },
  },
  {
    slug: "therapist-qbi-deduction",
    title: "Therapist QBI Deduction Calculator 2026 (Section 199A)",
    description:
      "Therapists in private practice: estimate your 2026 QBI deduction (20% rate) and self-employment tax on Schedule C.",
    heading: "Therapist QBI Deduction Calculator 2026",
    intro:
      "Private-practice therapists (an SSTB) can still claim the QBI deduction below the phase-out threshold. Estimate yours.",
    defaults: { grossIncome: 90000, businessExpenses: 12000, isSstb: true, filingStatus: "single" },
  },
  {
    slug: "software-engineer-1099-writeoffs",
    title: "Software Engineer 1099 Tax & Write-Off Calculator 2026",
    description:
      "1099 software engineers: model 2026 self-employment tax, home-office/equipment write-offs, and QBI on your contract income.",
    heading: "Software Engineer 1099 Tax Calculator 2026",
    intro:
      "Contract software engineers: deduct equipment, home office, and tools, then estimate SE tax and QBI for 2026.",
    defaults: { grossIncome: 200000, businessExpenses: 30000, filingStatus: "single" },
  },
  {
    slug: "150k-schedule-c-taxes",
    title: "How Much Tax on $150,000 Schedule C Income? (2026)",
    description:
      "Estimate 2026 self-employment tax, QBI deduction, and federal income tax on $150,000 of Schedule C business income.",
    heading: "$150,000 Schedule C Tax Calculator 2026",
    intro:
      "Earning about $150k on Schedule C? See your total 2026 tax liability, effective rate, and quarterly payments.",
    defaults: { grossIncome: 150000, businessExpenses: 15000, filingStatus: "single" },
  },
  {
    slug: "250k-qbi-phaseout-calculator",
    title: "$250K QBI Phase-Out Calculator 2026 — How Much Deduction Do You Lose?",
    description:
      "See how the 2026 Section 199A QBI phase-out (starts at $201,750 single / $403,500 MFJ) reduces your deduction at $250,000.",
    heading: "$250K QBI Phase-Out Calculator 2026",
    intro:
      "At $250,000 of business income, the QBI phase-out and the 20% rate interact. Model your exact deduction and tax.",
    defaults: { grossIncome: 250000, businessExpenses: 20000, filingStatus: "single" },
  },
];

export function getPreset(slug: string): SeoPreset | undefined {
  return presets.find((p) => p.slug === slug);
}
