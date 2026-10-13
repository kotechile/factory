import type { Metadata } from "next";
import { canonicalMetadata } from "@/lib/seo/canonical";
import LedgerLinkCalculator from "@/components/ledgerlink-calculator";
import { ProductLaunchVideo } from "@/components/product-launch-video";
import ProductPricing from "@/components/product-pricing";

export const metadata: Metadata = {
  ...canonicalMetadata("/ledgerlink"),
  title: "LedgerLink — Stripe Payout → GL Reconciliation Engine",
  description:
    "Deterministically decomposes a netted Stripe payout (charges, refunds, chargebacks, fees, Connect transfers, FX) into categorized GL journal lines that sum to the payout net exactly. Xero/QuickBooks-ready CSV.",
};

export default function Page() {
  return (
    <>
      <LedgerLinkCalculator />
      <ProductLaunchVideo slug="ledgerlink" />
      <ProductPricing slug="ledgerlink" />
    </>
  );
}
