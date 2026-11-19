/**
 * The offline demo scenario: a declared composite that exercises the engine WITHOUT a model.
 *
 * It is a fixture, not an award rule table: every figure is a worked example (a $100,000 award with
 * a $0.04 cash drift, a $5,000 match shortfall, and an unstated prior-approval threshold). The award
 * terms here are the DEMO's terms, never a shared rule table — the engine reads terms per filing.
 */

/** The whole demo as one pasteable JSON object: report + declared award terms + declared drawdown
 * statement + GL CSV + approved-budget CSV. Money is integer cents; percentages are basis points. */
export const DEFAULT_SCENARIO_RECORD: Record<string, unknown> = {
  report: {
    cashReceiptsCents: 9500000,
    cashDisbursementsCents: 8500000,
    cashOnHandCents: 1000000,
    totalFederalAwardCents: 10000000,
    federalExpendituresCents: 6000000,
    unliquidatedObligationsCents: 1000000,
    federalShareCents: 7000000,
    unobligatedBalanceCents: 3000000,
    requiredRecipientShareCents: 2000000,
    recipientShareProvidedCents: 1500000,
    remainingRecipientShareCents: 500000,
    periodEnd: "2026-09-30",
    isFinal: false,
  },
  awardTerms: {
    awardId: { value: "FA-2026-0117", provenance: "extracted", page: 1, quote: "Award No. FA-2026-0117" },
    authorizedFederalAmountCents: {
      value: 10000000,
      provenance: "extracted",
      page: 1,
      quote: "Total federal funds authorized: $100,000.00",
    },
    periodOfPerformance: {
      start: { value: "2025-10-01", provenance: "extracted", page: 1, quote: "Period of performance: October 1, 2025" },
      end: { value: "2026-09-30", provenance: "extracted", page: 1, quote: "through September 30, 2026" },
    },
    requiredMatchPercentBps: {
      value: 2000,
      provenance: "extracted",
      page: 2,
      quote: "Recipient cost share: 20% of total project costs",
    },
    reportingFrequency: { value: "quarterly", provenance: "extracted", page: 3, quote: "Financial reports are due quarterly" },
    priorApprovalThresholdBps: { value: null, provenance: "unstated", page: null, quote: null },
    agencyLineInstructions: { value: null, provenance: "unstated", page: null, quote: null },
    unreadableRegions: [],
  },
  drawdown: {
    totalReceiptsCents: { value: 9499996, provenance: "extracted", page: 1, quote: "Total receipts: $94,999.96" },
    totalDisbursementsCents: { value: 8500000, provenance: "extracted", page: 1, quote: "Total disbursements: $85,000.00" },
    subaccounts: [
      {
        subaccount: { value: "10-55-1000", provenance: "extracted", page: 1, quote: "Subaccount 10-55-1000" },
        receiptsCents: { value: 6000000, provenance: "extracted", page: 1, quote: "Receipts $60,000.00" },
        disbursementsCents: { value: 5500000, provenance: "extracted", page: 1, quote: "Disbursements $55,000.00" },
      },
      {
        subaccount: { value: "10-55-2000", provenance: "extracted", page: 1, quote: "Subaccount 10-55-2000" },
        receiptsCents: { value: 3499996, provenance: "extracted", page: 1, quote: "Receipts $34,999.96" },
        disbursementsCents: { value: 3000000, provenance: "extracted", page: 1, quote: "Disbursements $30,000.00" },
      },
    ],
    unreadableRegions: [],
  },
  glCsv: [
    "category,actual_usd",
    "personnel,40000.00",
    "equipment,12000.00",
    "supplies,8000.00",
    "travel,5000.00",
  ].join("\n"),
  budgetCsv: [
    "category,approved_usd",
    "personnel,42000.00",
    "equipment,12000.00",
    "supplies,7000.00",
    "travel,6000.00",
  ].join("\n"),
  priorReport: null,
};

/** The demo record serialized for the "Load sample" button. */
export const DEFAULT_SCENARIO_JSON = JSON.stringify(DEFAULT_SCENARIO_RECORD, null, 2);
