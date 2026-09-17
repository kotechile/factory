/**
 * Deterministic VAT / legal-identifier maths for FacturGate.
 *
 * Everything here is offline: formats are validated against the published national rules and
 * checksums are recomputed locally. VIES *status* is NOT queried — a network lookup would make
 * the engine non-deterministic and un-cacheable, so `checkEuVatId` reports `formatValid` /
 * `checksumValid` and says so explicitly (`checksumVerified: false` when a country's checksum is
 * not implemented in v1). No silent passes: an unknown country is a failure, not a default.
 */

import type { TargetCountry } from "./types";

export interface VatIdCheck {
  country: string;
  input: string;
  normalized: string;
  valid: boolean;
  formatValid: boolean;
  checksumVerified: boolean;
  checksumValid: boolean | null;
  format: string;
  notes: string[];
}

export function normalizeVatId(value: string): string {
  return value.replace(/[\s.\-_/]/g, "").toUpperCase();
}

/** Standard Luhn (ISO/IEC 7812) over a digit string. */
export function luhnValid(digits: string): boolean {
  if (!/^[0-9]+$/.test(digits)) return false;
  let sum = 0;
  let double = false;
  for (let i = digits.length - 1; i >= 0; i -= 1) {
    let digit = digits.charCodeAt(i) - 48;
    if (double) {
      digit *= 2;
      if (digit > 9) digit -= 9;
    }
    sum += digit;
    double = !double;
  }
  return sum % 10 === 0;
}

/**
 * SIRET = 9-digit SIREN + 5-digit NIC, normally Luhn-validated as a 14-digit number.
 * Exception (documented in INSEE's own rules): SIREN 356000000 (La Poste) validates when the sum
 * of the 14 digits is a multiple of 5 instead of by Luhn.
 */
export const LA_POSTE_SIREN = "356000000";

export function isValidSiret(siret: string): boolean {
  const value = normalizeVatId(siret);
  if (!/^[0-9]{14}$/.test(value)) return false;
  const siren = value.slice(0, 9);
  if (siren === LA_POSTE_SIREN) {
    const digitSum = [...value].reduce((sum, ch) => sum + Number(ch), 0);
    return digitSum % 5 === 0;
  }
  return luhnValid(value);
}

/**
 * French VAT identifier: FR + 2-character key + 9-digit SIREN.
 * Numeric keys are checkable: key = (12 + 3 × (SIREN mod 97)) mod 97.
 */
export function frenchVatKey(siren: string): string | null {
  if (!/^[0-9]{9}$/.test(siren)) return null;
  return String((12 + 3 * (Number(siren) % 97)) % 97).padStart(2, "0");
}

export function splitFrenchVatId(vatId: string): { key: string; siren: string } | null {
  const value = normalizeVatId(vatId);
  const match = /^FR([0-9A-Z]{2})([0-9]{9})$/.exec(value);
  if (!match) return null;
  return { key: match[1], siren: match[2] };
}

function germanVatChecksum(first8: string): number {
  // ISO 7064 MOD 11,10 — the published USt-IdNr. check-digit algorithm.
  let product = 10;
  for (const ch of first8) {
    let total = (Number(ch) + product) % 10;
    if (total === 0) total = 10;
    product = (2 * total) % 11;
  }
  const check = 11 - product;
  return check === 10 ? 0 : check;
}

function belgianMod97(digits10: string): boolean {
  const base = Number(digits10.slice(0, 8));
  const check = Number(digits10.slice(8));
  let remainder = base % 97;
  if (remainder === 0) remainder = 97;
  return remainder === check;
}

function dutchMod11(digits9: string): boolean {
  const weights = [9, 8, 7, 6, 5, 4, 3, 2, 1];
  const total = [...digits9].reduce((sum, ch, i) => sum + Number(ch) * weights[i], 0);
  return total % 11 === 0;
}

function polishNipChecksum(digits10: string): boolean {
  const weights = [6, 5, 7, 2, 3, 4, 5, 6, 7];
  const total = [...digits10.slice(0, 9)].reduce((sum, ch, i) => sum + Number(ch) * weights[i], 0);
  const remainder = total % 11;
  return remainder !== 10 && remainder === Number(digits10[9]);
}

interface CountryRule {
  format: string;
  pattern: RegExp;
  /** Returns null when the country's checksum is not implemented (reported as unverified). */
  checksum?: (value: string) => boolean;
}

const COUNTRY_RULES: Record<string, CountryRule> = {
  FR: {
    format: "FR + 2-char key + 9-digit SIREN",
    pattern: /^FR[0-9A-Z]{2}[0-9]{9}$/,
    checksum: (value) => {
      const parts = splitFrenchVatId(value);
      if (!parts) return false;
      const key = /^[0-9]{2}$/.test(parts.key) ? parts.key : null;
      if (!key) return true; // alphabetic keys are valid but not formula-checkable
      const expected = frenchVatKey(parts.siren);
      return expected !== null && expected === key;
    },
  },
  DE: {
    format: "DE + 9 digits (ISO 7064 MOD 11,10)",
    pattern: /^DE[0-9]{9}$/,
    checksum: (value) => germanVatChecksum(value.slice(2, 10)) === Number(value[10]),
  },
  BE: {
    format: "BE + 10 digits (mod 97)",
    pattern: /^BE[01][0-9]{9}$/,
    checksum: (value) => belgianMod97(value.slice(2)),
  },
  PL: {
    format: "PL + 10 digits (NIP checksum)",
    pattern: /^PL[0-9]{10}$/,
    checksum: (value) => polishNipChecksum(value.slice(2)),
  },
  NL: {
    format: "NL + 9 digits + B + 2 digits (mod 11)",
    pattern: /^NL[0-9]{9}B[0-9]{2}$/,
    checksum: (value) => dutchMod11(value.slice(2, 11)),
  },
  IT: {
    format: "IT + 11 digits (Luhn)",
    pattern: /^IT[0-9]{11}$/,
    checksum: (value) => luhnValid(value.slice(2)),
  },
  ES: {
    format: "ES + 1 alphanumeric + 7 digits + 1 alphanumeric",
    pattern: /^ES[0-9A-Z][0-9]{7}[0-9A-Z]$/,
  },
  LU: { format: "LU + 8 digits", pattern: /^LU[0-9]{8}$/ },
  AT: { format: "ATU + 8 digits", pattern: /^ATU[0-9]{8}$/ },
  IE: { format: "IE + 8 or 9 characters", pattern: /^IE[0-9][0-9A-Z*+][0-9]{5}[A-Z]{1,2}$/ },
  PT: { format: "PT + 9 digits", pattern: /^PT[0-9]{9}$/ },
  SE: { format: "SE + 12 digits", pattern: /^SE[0-9]{12}$/ },
  DK: { format: "DK + 8 digits", pattern: /^DK[0-9]{8}$/ },
  FI: { format: "FI + 8 digits", pattern: /^FI[0-9]{8}$/ },
  CZ: { format: "CZ + 8-10 digits", pattern: /^CZ[0-9]{8,10}$/ },
  EE: { format: "EE + 9 digits", pattern: /^EE[0-9]{9}$/ },
  LT: { format: "LT + 9 or 12 digits", pattern: /^LT([0-9]{9}|[0-9]{12})$/ },
  LV: { format: "LV + 11 digits", pattern: /^LV[0-9]{11}$/ },
  SK: { format: "SK + 10 digits", pattern: /^SK[0-9]{10}$/ },
  SI: { format: "SI + 8 digits", pattern: /^SI[0-9]{8}$/ },
  HU: { format: "HU + 8 digits", pattern: /^HU[0-9]{8}$/ },
  RO: { format: "RO + 2-10 digits", pattern: /^RO[0-9]{2,10}$/ },
  BG: { format: "BG + 9 or 10 digits", pattern: /^BG[0-9]{9,10}$/ },
  HR: { format: "HR + 11 digits", pattern: /^HR[0-9]{11}$/ },
  EL: { format: "EL + 9 digits", pattern: /^EL[0-9]{9}$/ },
  CY: { format: "CY + 8 digits + 1 letter", pattern: /^CY[0-9]{8}[A-Z]$/ },
  MT: { format: "MT + 8 digits", pattern: /^MT[0-9]{8}$/ },
  GR: { format: "EL/GR + 9 digits", pattern: /^(EL|GR)[0-9]{9}$/ },
};

export const SUPPORTED_VAT_COUNTRIES: readonly string[] = Object.keys(COUNTRY_RULES).sort();

/**
 * Validates an EU VAT identifier offline. `valid` is true only when the format matches AND, where
 * implemented, the checksum verifies. Unsupported country or un-checkable key ⇒ not valid.
 */
export function checkEuVatId(vatId: string, country: string): VatIdCheck {
  const cc = (country || "").trim().toUpperCase();
  const normalized = normalizeVatId(vatId || "");
  const rule = COUNTRY_RULES[cc];
  const base: VatIdCheck = {
    country: cc,
    input: vatId,
    normalized,
    valid: false,
    formatValid: false,
    checksumVerified: false,
    checksumValid: null,
    format: rule ? rule.format : "unknown country",
    notes: [],
  };

  if (!rule) {
    base.notes.push(
      `country '${cc || "(empty)"}' is not in the v1 VAT-format set (${SUPPORTED_VAT_COUNTRIES.join(", ")}). ` +
        "Nothing is assumed about an unknown country.",
    );
    return base;
  }
  if (!rule.pattern.test(normalized)) {
    base.notes.push(`does not match the ${cc} format (${rule.format}).`);
    return base;
  }

  base.formatValid = true;
  if (!rule.checksum) {
    base.notes.push(
      `${cc} checksum is not implemented in v1 — the format is correct but the identifier is unverified.`,
    );
    return base;
  }

  base.checksumVerified = true;
  base.checksumValid = rule.checksum(normalized);
  if (!base.checksumValid) {
    base.notes.push(`${cc} checksum failed (${rule.format}).`);
    return base;
  }
  base.valid = true;
  base.notes.push("Format and checksum verified offline. VIES status is not queried by v1.");
  return base;
}

/** ISO 4217 codes accepted by this engine (BR-05 / BR-CL-03). */
export const ISO_4217_CODES: readonly string[] = [
  "AED", "AUD", "BGN", "BRL", "CAD", "CHF", "CLP", "CNY", "COP", "CZK", "DKK", "EGP", "EUR",
  "GBP", "HKD", "HRK", "HUF", "IDR", "ILS", "INR", "ISK", "JPY", "KRW", "KRW", "KZT", "MAD",
  "MXN", "MYR", "NOK", "NZD", "PEN", "PHP", "PLN", "QAR", "RON", "RSD", "RUB", "SAR", "SEK",
  "SGD", "THB", "TRY", "TWD", "UAH", "USD", "VND", "ZAR",
].sort();

export function isIso4217(code: string | undefined): code is string {
  if (typeof code !== "string") return false;
  return ISO_4217_CODES.includes(code.trim().toUpperCase());
}

/** The four v1 target countries (PRD §5) — used to reject an out-of-scope target loudly. */
export const TARGET_COUNTRIES: readonly TargetCountry[] = ["FR", "PL", "BE", "DE"];
