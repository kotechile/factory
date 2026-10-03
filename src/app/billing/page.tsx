import type { Metadata } from "next";
import FactoryBillingPortal from "@/components/factory-billing-portal";

export const metadata: Metadata = {
  title: "Factory Billing Portal — Autonomous Product & Software Factory",
  description:
    "Self-service onboarding for $0.25/query WebMCP agent metering, Factory Pro subscriptions, and Stripe Customer Portal account management.",
};

export default function BillingPage() {
  return <FactoryBillingPortal />;
}
