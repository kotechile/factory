import type { Metadata } from "next";
import LedgerLinkCalculator from "@/components/ledgerlink-calculator";

export const metadata: Metadata = {
  title: "LedgerLink — Stripe Payout → GL Reconciliation Engine",
  description:
    "Deterministically decomposes a netted Stripe payout (charges, refunds, chargebacks, fees, Connect transfers, FX) into categorized GL journal lines that sum to the payout net exactly. Xero/QuickBooks-ready CSV.",
};

export default function Page() {
  return <LedgerLinkCalculator />;
}
