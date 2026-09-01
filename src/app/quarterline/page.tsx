import type { Metadata } from "next";
import QuarterLineCalculator from "@/components/quarterline-calculator";

export const metadata: Metadata = {
  title: "QuarterLine — 2026 Self-Employment Tax Calculator",
  description:
    "Deterministic 2026 self-employment tax, Section 199A QBI deduction (statutory 20% rate), and safe-harbor estimated-payment calculator.",
};

export default function Page() {
  return <QuarterLineCalculator />;
}
