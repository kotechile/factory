/**
 * The worked examples SpendProof ships with.
 *
 * They are the PRD's test vectors, expressed as the two files a FinOps operator actually has, so the
 * page's examples and the engine's known-answer tests are the SAME data: a scenario cannot drift
 * from the vector it demonstrates.
 */
export type ScenarioKey =
  | "untagged-batch"
  | "dropped-usage"
  | "period-boundary"
  | "price-drift"
  | "clean";

export interface SpendProofScenario {
  key: ScenarioKey;
  label: string;
  description: string;
  /** What the engine must do with it — the claim the button makes. */
  expects: string;
  invoiceCsv: string;
  ledgerCsv: string;
}

const ONE_LINE_INVOICE = [
  "provider,period_start,period_end,service,model,sku,quantity,unit_price_usd_per_thousand,amount_usd,invoice_total_usd",
  "openai,2026-09-01,2026-09-30,chat.completions,gpt-4o,gpt-4o-input,1000000,0.003,3.00,3.00",
].join("\n");

const TWO_RATE_INVOICE = [
  "provider,period_start,period_end,service,model,sku,quantity,unit_price_usd_per_thousand,amount_usd,invoice_total_usd",
  "openai,2026-09-01,2026-09-30,chat.completions,gpt-4o,gpt-4o-input,600000,0.003,1.80,2.80",
  "openai,2026-09-01,2026-09-30,chat.completions,gpt-4o,gpt-4o-input,400000,0.0025,1.00,2.80",
].join("\n");

const LEDGER_HEADER = "bucket,service,model,sku,quantity,timestamp";

export const SPENDPROOF_SCENARIOS: readonly SpendProofScenario[] = [
  {
    key: "untagged-batch",
    label: "Untagged batch",
    description:
      "A batch of calls was made before a tag was attached, so the ledger holds usage no bucket can claim.",
    expects:
      "An unattributed finding that BLOCKS the close, with the bucket that cannot be shown to reconcile reported unmatched.",
    invoiceCsv: ONE_LINE_INVOICE,
    ledgerCsv: [
      LEDGER_HEADER,
      "payments,chat.completions,gpt-4o,gpt-4o-input,900000,2026-09-10T12:00:00Z",
      ",chat.completions,gpt-4o,gpt-4o-input,100000,2026-09-15T09:00:00Z",
    ].join("\n"),
  },
  {
    key: "dropped-usage",
    label: "Dropped usage rows",
    description:
      "A run of usage rows never reached the ledger (a failed exporter), so the tagged ledger undershoots the invoice.",
    expects:
      "Missing usage against the invoice, and the affected bucket reported unmatched — no rate is blamed for it.",
    invoiceCsv: ONE_LINE_INVOICE,
    ledgerCsv: [
      LEDGER_HEADER,
      "payments,chat.completions,gpt-4o,gpt-4o-input,900000,2026-09-10T12:00:00Z",
    ].join("\n"),
  },
  {
    key: "period-boundary",
    label: "Period-boundary overlap",
    description:
      "A batch is timestamped just after the billing window closed — clock skew and timezone edges put rows either side of a month.",
    expects:
      "A period-boundary overlap, NOT missing usage: the rows exist, they sit outside the window.",
    invoiceCsv: ONE_LINE_INVOICE,
    ledgerCsv: [
      LEDGER_HEADER,
      "payments,chat.completions,gpt-4o,gpt-4o-input,700000,2026-09-10T12:00:00Z",
      "payments,chat.completions,gpt-4o,gpt-4o-input,300000,2026-10-01T02:00:00Z",
    ].join("\n"),
  },
  {
    key: "price-drift",
    label: "Mid-period rate change",
    description:
      "The provider changed the model's price inside the period, so the invoice carries two declared rates for the same SKU.",
    expects:
      "Price drift — and NO variance: recomputing a two-rate period at one rate is exactly the phantom variance this product exists to prevent.",
    invoiceCsv: TWO_RATE_INVOICE,
    ledgerCsv: [
      LEDGER_HEADER,
      "payments,chat.completions,gpt-4o,gpt-4o-input,600000,2026-09-10T12:00:00Z",
      "payments,chat.completions,gpt-4o,gpt-4o-input,400000,2026-09-20T12:00:00Z",
    ].join("\n"),
  },
  {
    key: "clean",
    label: "Clean pair",
    description: "Every billed unit is tagged, in period, and recomputes to the invoice exactly.",
    expects: "Zero findings and a close-ready verdict.",
    invoiceCsv: ONE_LINE_INVOICE,
    ledgerCsv: [
      LEDGER_HEADER,
      "payments,chat.completions,gpt-4o,gpt-4o-input,600000,2026-09-10T12:00:00Z",
      "payments,chat.completions,gpt-4o,gpt-4o-input,400000,2026-09-20T08:00:00Z",
    ].join("\n"),
  },
];

/** The worked example the page loads with: it shows both a money figure and a withheld close. */
export const DEFAULT_SCENARIO: ScenarioKey = "untagged-batch";

/**
 * The invoice DOCUMENT the extraction box ships with — the same period as the default scenario, as
 * the provider would print it. A surface that demonstrates reading a document should open on a real
 * document rather than an empty placeholder (and the vision review then sees the product's actual
 * state, not a blank field).
 */
export const INVOICE_DOCUMENT_EXAMPLE = [
  "OPENAI — invoice for the period 2026-09-01 to 2026-09-30",
  "Account: acme-ai-prod",
  "",
  "Line 1   chat.completions | gpt-4o | input tokens (sku gpt-4o-input)",
  "         1,000,000 tokens at $0.0030 / 1K tokens            $3.00",
  "",
  "TOTAL DUE                                                $3.00",
].join("\n");

export function scenarioByKey(key: ScenarioKey): SpendProofScenario | undefined {
  return SPENDPROOF_SCENARIOS.find((scenario) => scenario.key === key);
}

export const SCENARIO_KEYS_NOTE =
  "Worked examples are the PRD's own test vectors, run by the same deterministic engine the agent tool calls. The invoice document is read as DECLARED fields — this browser preview takes the provider's own line-item export, so nothing leaves the page.";
