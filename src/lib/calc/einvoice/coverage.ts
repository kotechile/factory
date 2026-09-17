/**
 * Honest coverage statement (PRD §2 "Known limit (stated, not hidden)").
 *
 * EN 16931 is ~1,300 rules; v1 implements the measured high-frequency families and says so. A
 * document that passes v1 is *not* claimed to satisfy every EN 16931 rule — the unsupported
 * families are published next to the findings, never folded into a pass.
 */
import type { CoverageNote } from "./types";

export const UNSUPPORTED_FAMILIES: readonly string[] = [
  "the remaining EN 16931 rule families (BR-CL-* code lists, BR-DEC-* decimals, BT/BG cardinalities beyond the validated set) are not implemented in v1",
  "BR-IGIC-* / BR-IPSI-* (Canary Islands IGIC, Ceuta/Melilla IPSI) — outside the v1 target-country set (FR/PL/BE/DE)",
  "national serializations other than EN 16931 CII/UBL: Polish KSeF FA(3) XML, FR EXTENDED-CTC-FR lifecycle fields, e-reporting / CDAR status messages",
  "PDF/A-3 hybrid container authoring (Factur-X PDF + embedded XML) — P1; v1 emits standalone CII/UBL XML",
  "VIES/registro status of a VAT identifier — check_eu_vat_id verifies format and checksum offline only",
];

export function buildCoverage(implementedRuleIds: readonly string[]): CoverageNote {
  return {
    implementedRuleIds: [...implementedRuleIds],
    unsupportedFamilies: [...UNSUPPORTED_FAMILIES],
    note:
      `v1 implements ${implementedRuleIds.length} high-frequency rule checks. ` +
      "A rule that is not listed as implemented is never reported as passing — it is reported as unsupported here.",
  };
}
