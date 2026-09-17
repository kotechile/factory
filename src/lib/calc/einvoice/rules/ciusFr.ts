/**
 * CIUS-FR overlay (French B2B e-invoicing mandate, live since 2026-09-01).
 *
 * These are the factory's overlay checks — the French CIUS adds identity and profile constraints on
 * top of EN 16931, and these rules encode them against the canonical model:
 *  - the document must be at the EN 16931 profile or above (MINIMUM / BASIC WL / BASIC are illegal
 *    for the mandate);
 *  - the seller carries a 14-digit, Luhn-valid SIRET and a French VAT identifier whose key
 *    satisfies the VAT-key formula;
 *  - a French buyer is identified by SIRET, a non-French buyer by a VAT identifier that is
 *    well-formed for its own country.
 *
 * Applied only when targetCountry === "FR" (they are a national overlay, not core EN 16931).
 */
import type { Rule, RuleFinding } from "./engine";
import { parseSpecificationProfile, BELOW_EN16931, PROFILE_LABELS } from "./en16931";
import { isFilled } from "./engine";
import { checkEuVatId, isValidSiret, normalizeVatId, splitFrenchVatId, frenchVatKey } from "../vat";

const SIRET_LENGTH = 14;

function blank(value: unknown): boolean {
  return !isFilled(value);
}

export const CIUS_FR_RULES: readonly Rule[] = [
  {
    ruleId: "BR-FR-01",
    severity: "blocking",
    fieldPath: "invoice.specificationId",
    message: "The document declares a profile below EN 16931, which the French mandate does not accept.",
    fix:
      'Emit at "urn:cen.eu:en16931:2017" or above (Factur-X EN 16931 / EXTENDED-CTC-FR, Peppol BIS 3.0). A PDF library that defaults to MINIMUM or BASIC produces invoices the platform rejects.',
    check: ({ input }) => {
      const profile = parseSpecificationProfile(input.invoice?.specificationId);
      return BELOW_EN16931.includes(profile)
        ? [{ message: `Declared profile: ${PROFILE_LABELS[profile]} — illegal for the FR mandate (2026-09-01).` }]
        : [];
    },
  },
  {
    ruleId: "BR-FR-02",
    severity: "blocking",
    fieldPath: "seller.siret",
    message: "The seller SIRET (BT-30, scheme 0009) is required on a French e-invoice.",
    fix: "Send the seller's 14-digit SIRET; the mandate identifies both parties by SIRET.",
    check: ({ input }) => (blank(input.seller?.siret) ? [{}] : []),
  },
  {
    ruleId: "BR-FR-03",
    severity: "blocking",
    fieldPath: "seller.siret",
    message: "The seller SIRET is not a valid 14-digit SIRET.",
    fix:
      "Send the full 14 digits (SIREN + NIC) and check the Luhn check digit (La Poste, SIREN 356000000, uses the digit-sum rule instead).",
    check: ({ input }) => {
      const value = input.seller?.siret;
      if (blank(value)) return [];
      const normalized = normalizeVatId(value as string);
      if (!/^[0-9]{14}$/.test(normalized)) {
        return [{ message: `"${value}" is not ${SIRET_LENGTH} digits.` }];
      }
      return isValidSiret(normalized) ? [] : [{}];
    },
  },
  {
    ruleId: "BR-FR-04",
    severity: "blocking",
    fieldPath: "buyer.siret",
    message: "A French buyer must be identified by SIRET (BT-47, scheme 0009).",
    fix: "Add the buyer SIRET; without it the platform cannot route the invoice to the right French counterparty.",
    check: ({ input }) => {
      if (input.buyer?.address?.country !== "FR") return [];
      return blank(input.buyer?.siret) ? [{}] : [];
    },
  },
  {
    ruleId: "BR-FR-05",
    severity: "blocking",
    fieldPath: "buyer.siret",
    message: "The buyer SIRET is not a valid 14-digit SIRET.",
    fix: "Send the full 14 digits (SIREN + NIC) and check the Luhn check digit.",
    check: ({ input }) => {
      const value = input.buyer?.siret;
      if (blank(value)) return [];
      const normalized = normalizeVatId(value as string);
      if (!/^[0-9]{14}$/.test(normalized)) {
        return [{ message: `"${value}" is not ${SIRET_LENGTH} digits.` }];
      }
      return isValidSiret(normalized) ? [] : [{}];
    },
  },
  {
    ruleId: "BR-FR-06",
    severity: "blocking",
    fieldPath: "seller.vatId",
    message: "The seller VAT identifier is not a French VAT identifier (FR + 2-character key + 9-digit SIREN).",
    fix: 'Send the seller\'s FR VAT number (e.g. "FR83404833048"). A trade name or an intra-EU number in the FR field is a rejection.',
    check: ({ input }) => {
      const value = input.seller?.vatId;
      if (blank(value)) return [];
      return splitFrenchVatId(value as string) ? [] : [{}];
    },
  },
  {
    ruleId: "BR-FR-07",
    severity: "blocking",
    fieldPath: "seller.vatId",
    message: "The seller VAT identifier's key does not match the VAT-key formula (key = (12 + 3 × SIREN mod 97) mod 97).",
    fix: "Recompute the key from the SIREN, or send the identifier as issued by the tax authority.",
    check: ({ input }) => {
      const value = input.seller?.vatId;
      if (blank(value)) return [];
      const parts = splitFrenchVatId(value as string);
      if (!parts) return []; // BR-FR-06 owns the malformed-format case
      if (!/^[0-9]{2}$/.test(parts.key)) return []; // alphabetic keys are valid but not formula-checkable
      const expected = frenchVatKey(parts.siren);
      return expected === parts.key ? [] : [{ message: `Key "${parts.key}" does not match the expected key "${expected}" for SIREN ${parts.siren}.` }];
    },
  },
  {
    ruleId: "BR-FR-08",
    severity: "blocking",
    fieldPath: "buyer.vatId",
    message: "A non-French buyer must be identified by its VAT identifier (BT-48).",
    fix: "Send the buyer's VAT identifier including its country prefix (e.g. DE123456788).",
    check: ({ input }) => {
      if (!isFilled(input.buyer?.address?.country) || input.buyer?.address?.country === "FR") return [];
      return blank(input.buyer?.vatId) ? [{}] : [];
    },
  },
  {
    ruleId: "BR-FR-09",
    severity: "blocking",
    fieldPath: "buyer.vatId",
    message: "The buyer VAT identifier is not well-formed for its country.",
    fix: "Send the identifier with its country prefix and a valid national format/checksum.",
    check: ({ input }) => {
      const value = input.buyer?.vatId;
      if (blank(value)) return [];
      const normalized = normalizeVatId(value as string);
      const country = normalized.slice(0, 2);
      const check = checkEuVatId(normalized, country);
      return check.valid ? [] : [{ message: check.notes.join(" ") }];
    },
  },
  {
    ruleId: "BR-FR-10",
    severity: "blocking",
    fieldPath: "seller.vatId",
    message: "The seller VAT identifier's country prefix does not match the seller's country.",
    fix: "Align the VAT identifier's prefix with the seller postal address country code.",
    check: ({ input }): RuleFinding[] => {
      const value = input.seller?.vatId;
      const country = input.seller?.address?.country;
      if (blank(value) || blank(country)) return [];
      const prefix = normalizeVatId(value as string).slice(0, 2);
      return prefix === country ? [] : [{ message: `VAT identifier prefix "${prefix}" ≠ seller country "${country}".` }];
    },
  },
];
