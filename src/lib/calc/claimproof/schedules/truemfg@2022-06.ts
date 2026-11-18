/**
 * Vendored schedule: True Manufacturing — USA Warranty labour schedule.
 *
 * SOURCES (primary, both downloaded from truemfg.com on 2026-11-18):
 *   1. "USA Warranty | Labor Claim Instructions" — WA_FM_006 Rev. D, dated 6/10/22.
 *      https://www.truemfg.com/wp-content/uploads/2023/04/USA-Warranty-Labor-Claim-Instructions-INTERACTIVE_072822.pdf
 *      • Multiple Repairs During Same Service Call (p.1): "use up to the highest allowable time for the
 *        single repair, then add ½ hour for each additional repair."
 *      • Labour claim form (p.2): Nitrogen Usage Fee (Maximum $12.00), Miscellaneous Material Fee
 *        (Maximum $40.00), Reclaim Fee (Maximum $30.00 — for 134a/404a only), travel hours line.
 *      • "True reserves the right to pay no more than the average commercial hourly rates within the
 *        distributor territory or region of the country." — no fixed hourly rate is published.
 *   2. "USA Warranty | Repair Guidelines by Model" — WA_RM_025 Rev. D, dated 6/10/22 (Upright /
 *      Reach-In Refrigerators and Freezers — GDM, FLM, STA, STG, STM, STR, T, TAC, THAC, TS, TSD, TVM).
 *      https://www.truemfg.com/wp-content/uploads/2023/07/USA-Warranty_Labor_Repair_Reimbursement-forms_ALL-1.pdf
 *      • Allowed-hours table (refrigeration / electrical / cabinet), quoted below with its page.
 *      • Multiple Refrigeration Repairs (p.1): "paid at the highest rate for the part changed, plus
 *        1 hour for each additional refrigeration component changed."
 *      • Travel (p.1, customer responsibility f.): "covers reasonable travel time which is defined as
 *        30 miles one way, anything more than this must be pre-approved."
 *
 * The two multiple-repair texts disagree (½ h general vs 1 h refrigeration). ClaimProof v1 scopes to
 * COMMERCIAL REFRIGERATION labour, so the 1-hour refrigeration increment is the vendored value and the
 * discrepancy is recorded here, not resolved by guesswork.
 */
import type { LabourSchedule } from "../types";

const REFRIGERATION_PAGE = "Repair Guidelines by Model p.1 (refrigeration)";
const ELECTRICAL_PAGE = "Repair Guidelines by Model p.1 (electrical)";
const CABINET_PAGE = "Repair Guidelines by Model p.1 (cabinet)";

export const TRUEMFG_2022_06: LabourSchedule = {
  oem: "True Manufacturing",
  slug: "truemfg@2022-06",
  version: "2022-06",
  effectiveFrom: "2022-06-10",
  revisionDate: "2022-06-10",
  supersededAfter: null,
  sourceUrl:
    "https://www.truemfg.com/wp-content/uploads/2023/04/USA-Warranty-Labor-Claim-Instructions-INTERACTIVE_072822.pdf (WA_FM_006 Rev. D) · https://www.truemfg.com/wp-content/uploads/2023/07/USA-Warranty_Labor_Repair_Reimbursement-forms_ALL-1.pdf (WA_RM_025 Rev. D)",
  sourceLabel:
    "USA Warranty | Labor Claim Instructions (WA_FM_006 Rev. D) + Repair Guidelines by Model (WA_RM_025 Rev. D), both dated 6/10/22",
  rules: {
    // ── Refrigeration — Upright / Reach-In (GDM, FLM, STA, STG, STM, STR, T, TAC, THAC, TS, TSD, TVM)
    "refrig-compressor": {
      code: "refrig-compressor",
      description: "Diagnose and replace defective compressor",
      allowedTenths: 45,
      page: REFRIGERATION_PAGE,
      category: "refrigeration",
    },
    "refrig-compressor-gdm72f": {
      code: "refrig-compressor-gdm72f",
      description: "Diagnose and replace defective compressor for GDM-72F/T-72F",
      allowedTenths: 55,
      page: REFRIGERATION_PAGE,
      category: "refrigeration",
    },
    "refrig-condensing-unit": {
      code: "refrig-condensing-unit",
      description: "Diagnose and replace defective condensing unit",
      allowedTenths: 40,
      page: REFRIGERATION_PAGE,
      category: "refrigeration",
    },
    "refrig-condensing-unit-gdm72f": {
      code: "refrig-condensing-unit-gdm72f",
      description: "Diagnose and replace defective condensing unit for GDM-72F/T-72F",
      allowedTenths: 50,
      page: REFRIGERATION_PAGE,
      category: "refrigeration",
    },
    "refrig-evaporator-coil": {
      code: "refrig-evaporator-coil",
      description: "Diagnose and replace defective evaporator coil",
      allowedTenths: 45,
      page: REFRIGERATION_PAGE,
      category: "refrigeration",
    },
    "refrig-evaporator-coil-multi": {
      code: "refrig-evaporator-coil-multi",
      description: "Diagnose and replace defective evaporator coil with multiple condensing units",
      allowedTenths: 60,
      page: REFRIGERATION_PAGE,
      category: "refrigeration",
    },
    "refrig-locate-leak": {
      code: "refrig-locate-leak",
      description: "Locate refrigeration leak",
      allowedTenths: 40,
      page: REFRIGERATION_PAGE,
      category: "refrigeration",
    },
    "refrig-reroute-capillary": {
      code: "refrig-reroute-capillary",
      description: "Diagnose and reroute defective capillary tube and replace the condensing unit",
      allowedTenths: 60,
      page: REFRIGERATION_PAGE,
      category: "refrigeration",
    },
    "refrig-reroute-capillary-gdm72f": {
      code: "refrig-reroute-capillary-gdm72f",
      description:
        "Diagnose and reroute defective capillary tube and replace the condensing unit for GDM-72F/T-72F",
      allowedTenths: 65,
      page: REFRIGERATION_PAGE,
      category: "refrigeration",
    },
    "refrig-other-open-system": {
      code: "refrig-other-open-system",
      description:
        "Diagnose and repair or replace defective refrigeration parts, other than listed above, which require opening the refrigeration system",
      allowedTenths: 40,
      page: REFRIGERATION_PAGE,
      category: "refrigeration",
    },
    // ── Electrical
    "elec-temp-control-module": {
      code: "elec-temp-control-module",
      description: "Diagnose and replace temperature control, module, display",
      allowedTenths: 20,
      page: ELECTRICAL_PAGE,
      category: "electrical",
    },
    "elec-probes": {
      code: "elec-probes",
      description: "Diagnose and replace probe(s)",
      allowedTenths: 15,
      page: ELECTRICAL_PAGE,
      category: "electrical",
    },
    "elec-evap-coil-heater": {
      code: "elec-evap-coil-heater",
      description: "Diagnose and replace evaporator coil heater",
      allowedTenths: 40,
      page: ELECTRICAL_PAGE,
      category: "electrical",
    },
    "elec-termination-switch": {
      code: "elec-termination-switch",
      description: "Diagnose and replace termination/high limit switch",
      allowedTenths: 30,
      page: ELECTRICAL_PAGE,
      category: "electrical",
    },
    "elec-drain-line-heater": {
      code: "elec-drain-line-heater",
      description: "Diagnose and replace drain line heater",
      allowedTenths: 35,
      page: ELECTRICAL_PAGE,
      category: "electrical",
    },
    "elec-perimeter-heater": {
      code: "elec-perimeter-heater",
      description: "Diagnose and replace perimeter heater",
      allowedTenths: 40,
      page: ELECTRICAL_PAGE,
      category: "electrical",
    },
    "elec-mullion-heater": {
      code: "elec-mullion-heater",
      description: "Diagnose and replace mullion heater",
      allowedTenths: 15,
      page: ELECTRICAL_PAGE,
      category: "electrical",
    },
    "elec-time-clock": {
      code: "elec-time-clock",
      description: "Diagnose and replace time clock",
      allowedTenths: 15,
      page: ELECTRICAL_PAGE,
      category: "electrical",
    },
    "elec-driver-led": {
      code: "elec-driver-led",
      description: "Diagnose and replace driver, LED module",
      allowedTenths: 15,
      page: ELECTRICAL_PAGE,
      category: "electrical",
    },
    "elec-idl-door-cord": {
      code: "elec-idl-door-cord",
      description: "Diagnose and replace the IDL door cord",
      allowedTenths: 20,
      page: ELECTRICAL_PAGE,
      category: "electrical",
    },
    "elec-condenser-fan-motor": {
      code: "elec-condenser-fan-motor",
      description: "Diagnose and replace condenser fan motor",
      allowedTenths: 20,
      page: ELECTRICAL_PAGE,
      category: "electrical",
    },
    "elec-evap-fan-motor": {
      code: "elec-evap-fan-motor",
      description: "Diagnose and replace evaporator fan motor",
      allowedTenths: 15,
      page: ELECTRICAL_PAGE,
      category: "electrical",
    },
    "elec-compressor-start": {
      code: "elec-compressor-start",
      description: "Diagnose and replace compressor starting components",
      allowedTenths: 20,
      page: ELECTRICAL_PAGE,
      category: "electrical",
    },
    // ── Cabinet
    "cab-doors": {
      code: "cab-doors",
      description: "Diagnose and replace door(s)",
      allowedTenths: 10,
      page: CABINET_PAGE,
      category: "cabinet",
    },
    "cab-door-torsion-hinges": {
      code: "cab-door-torsion-hinges",
      description: "Diagnose and replace door torsion spring / cartridge / door hinges",
      allowedTenths: 20,
      page: CABINET_PAGE,
      category: "cabinet",
    },
    "cab-door-cord-retractor": {
      code: "cab-door-cord-retractor",
      description: "Diagnose and replace door cord/retractor (GDM / TSD Slide Door)",
      allowedTenths: 15,
      page: CABINET_PAGE,
      category: "cabinet",
    },
    "cab-door-cams": {
      code: "cab-door-cams",
      description: "Diagnose and replace door cams on STA, STG, STM, STR",
      allowedTenths: 10,
      page: CABINET_PAGE,
      category: "cabinet",
    },
    "cab-general-repair": {
      code: "cab-general-repair",
      description: "General cabinet repair",
      allowedTenths: 15,
      page: CABINET_PAGE,
      category: "cabinet",
    },
  },
  multipleRepair: {
    incrementTenths: 10, // 1 hour
    ruleText:
      "Multiple refrigeration repairs are paid at the highest rate for the part changed, plus 1 hour for each additional refrigeration component changed.",
    page: "Repair Guidelines by Model p.1 (refrigeration) · Labor Claim Instructions p.1",
  },
  travel: {
    maxMilesOneWay: 30,
    fixedHoursTenths: null,
    ruleText:
      "True's warranty covers reasonable travel time, defined as 30 miles one way; anything more must be pre-approved and is not covered without pre-approval.",
    page: "Repair Guidelines by Model p.1 (customer responsibilities, f.)",
  },
  caps: [
    {
      key: "nitrogen",
      label: "Nitrogen usage fee",
      maxCents: 1200,
      page: "Labor Claim Instructions p.2 (claim form)",
      note: "Maximum $12.00.",
    },
    {
      key: "miscMaterials",
      label: "Miscellaneous material fee",
      maxCents: 4000,
      page: "Labor Claim Instructions p.2 (claim form)",
      note: "Maximum $40.00 — soldering supplies, vacuum pump, line tap/access valves, etc.",
    },
    {
      key: "reclaim",
      label: "Reclaim fee",
      maxCents: 3000,
      page: "Labor Claim Instructions p.2 (claim form)",
      note: "Maximum $30.00 — for 134a/404a only.",
    },
  ],
  hourlyRateCents: null,
  hourlyRateNote:
    "The schedule publishes no fixed hourly rate: True reserves the right to pay no more than the average commercial hourly rates within the territory. Labour is priced at the claim's own declared rate.",
};
