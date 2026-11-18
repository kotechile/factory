/**
 * The offline demo scenario: a declared-fields record that exercises the engine WITHOUT a model.
 *
 * It is a fixture, not a vendored schedule: the numbers are a worked example (a True GDM-49F claim
 * with two refrigeration repairs, an over-cap nitrogen fee, and a labour short-payment). The
 * schedule's real allowances come from the vendored `truemfg@2022-06` file, never from here.
 */

/**
 * Two refrigeration repairs → multiple-repair: highest (compressor 4.5 h) full + 1 h increment for
 * the leak locate = 5.5 h allowed. At $120/h = $660.00 expected labour. The shop over-claims
 * nitrogen at $15.00 (capped $12.00, $3.00 excess named). The OEM paid $540.00 labour → underpaid
 * $120.00.
 */
export const DEFAULT_SCENARIO_RECORD: Record<string, unknown> = {
  claimId: { value: "CL-2026-0041", provenance: "extracted", page: 1, quote: "Claim CL-2026-0041" },
  model: { value: "GDM-49F", provenance: "extracted", page: 1, quote: "Model: GDM-49F" },
  serial: { value: "TRU-8821-113", provenance: "extracted", page: 1, quote: "Serial: TRU-8821-113" },
  serviceDate: { value: "2026-06-01", provenance: "extracted", page: 1, quote: "Date Repaired: 6/1/2026" },
  laborRateCentsPerHour: { value: 12000, provenance: "extracted", page: 1, quote: "Labor Rate Per Hour: $120.00" },
  repairs: [
    {
      code: { value: "refrig-compressor", provenance: "extracted", page: 1, quote: "replaced defective compressor" },
      description: { value: "Diagnose and replace defective compressor", provenance: "extracted", page: 1, quote: "replaced defective compressor" },
      hoursClaimedTenths: { value: 45, provenance: "extracted", page: 1, quote: "4.5 hrs" },
    },
    {
      code: { value: "refrig-locate-leak", provenance: "extracted", page: 1, quote: "located refrigeration leak" },
      description: { value: "Locate refrigeration leak", provenance: "extracted", page: 1, quote: "located refrigeration leak" },
      hoursClaimedTenths: { value: 40, provenance: "extracted", page: 1, quote: "4.0 hrs" },
    },
  ],
  partsCents: { value: 25000, provenance: "extracted", page: 1, quote: "Part Reimbursement: $250.00" },
  travel: {
    milesOneWay: { value: 22, provenance: "extracted", page: 1, quote: "22 miles one way" },
    hoursClaimedTenths: { value: 10, provenance: "extracted", page: 1, quote: "Travel Hours: 1.0" },
    claimedCents: { value: 12000, provenance: "extracted", page: 1, quote: "Travel $120.00" },
  },
  fees: {
    nitrogen: { value: 1500, provenance: "extracted", page: 1, quote: "Nitrogen Usage Fee: $15.00" },
    miscMaterials: { value: 4000, provenance: "extracted", page: 1, quote: "Miscellaneous Material Fee: $40.00" },
    reclaim: { value: 3000, provenance: "extracted", page: 1, quote: "Reclaim Fee: $30.00" },
  },
  payment: {
    laborCents: { value: 54000, provenance: "extracted", page: 2, quote: "Labor Paid: $540.00" },
    partsCents: { value: 25000, provenance: "extracted", page: 2, quote: "Parts Paid: $250.00" },
    travelCents: { value: 12000, provenance: "extracted", page: 2, quote: "Travel Paid: $120.00" },
    fees: {
      nitrogen: { value: 1200, provenance: "extracted", page: 2, quote: "Nitrogen: $12.00" },
      miscMaterials: { value: 4000, provenance: "extracted", page: 2, quote: "Misc Materials: $40.00" },
      reclaim: { value: 3000, provenance: "extracted", page: 2, quote: "Reclaim: $30.00" },
    },
  },
  unreadableRegions: [],
};

export interface ClaimProofScenario {
  key: string;
  label: string;
  scheduleSlug: string;
  record: Record<string, unknown>;
}

export const CLAIMPROOF_SCENARIOS: ClaimProofScenario[] = [
  {
    key: "underpaid-multi-repair",
    label: "Two refrigeration repairs, short-paid labour, over-cap nitrogen",
    scheduleSlug: "truemfg@2022-06",
    record: DEFAULT_SCENARIO_RECORD,
  },
];

export const DEFAULT_SCENARIO: ClaimProofScenario = CLAIMPROOF_SCENARIOS[0];

export function scenarioByKey(key: string): ClaimProofScenario | undefined {
  return CLAIMPROOF_SCENARIOS.find((scenario) => scenario.key === key);
}
