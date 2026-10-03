import type { Metadata } from "next";
import FactoryBillingPortal from "@/components/factory-billing-portal";
import { agentRateRange } from "@/products/pricing";

const rateRange = agentRateRange();

export const metadata: Metadata = {
  title: "Factory Billing Portal — Autonomous Product & Software Factory",
  description: `Self-service onboarding for usage-based WebMCP agent metering ($${rateRange.min.toFixed(
    2,
  )}–$${rateRange.max.toFixed(
    2,
  )} per successful call by tool), Factory Pro subscriptions, and Stripe Customer Portal account management.`,
};

export default function BillingPage() {
  return <FactoryBillingPortal />;
}
