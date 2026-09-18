/**
 * Known-answer fixtures for the ParcelProof engine (PRD §2).
 *
 * Two kinds of data live here:
 *  - typed `AuditInput` builders the test suite drives (exact finding lists are asserted, not just
 *    booleans), and
 *  - the CSV scenario texts the UI loads ("load a working invoice" / "load an invoice with money in
 *    it"), so the product a visitor sees is the same data the gate proves.
 *
 * Contract rate card (`CONTRACT_RATE_CARD`) is a small, monotonic customer contract; every
 * recomputed weight in these fixtures falls inside exactly one bracket, so a line is only ever
 * `unverifiable-rate` when a fixture deliberately omits the card.
 */
import type { AuditInput, InvoiceLine, RateCard, ShipmentRecord } from "./types";

export const CONTRACT_RATE_CARD: RateCard = {
  source: "ACME 2026 parcel contract (sample)",
  rows: [
    // USPS Ground Advantage, zone 4
    { carrier: "usps", service: "usps_ground_advantage", zone: "4", minWeightLb: 1, maxWeightLb: 10, rateCents: 900 },
    { carrier: "usps", service: "usps_ground_advantage", zone: "4", minWeightLb: 11, maxWeightLb: 12, rateCents: 1050 },
    { carrier: "usps", service: "usps_ground_advantage", zone: "4", minWeightLb: 13, maxWeightLb: 13, rateCents: 1150 },
    // USPS Priority Mail Express, zone 4
    { carrier: "usps", service: "usps_priority_mail_express", zone: "4", minWeightLb: 1, maxWeightLb: 10, rateCents: 2350 },
    // FedEx Express, zone 2 (the 8 lb / 9 lb split prices the round-up case)
    { carrier: "fedex", service: "fedex_express", zone: "2", minWeightLb: 1, maxWeightLb: 8, rateCents: 4100 },
    { carrier: "fedex", service: "fedex_express", zone: "2", minWeightLb: 9, maxWeightLb: 9, rateCents: 4600 },
    // FedEx Ground, zone 5
    { carrier: "fedex", service: "fedex_ground", zone: "5", minWeightLb: 1, maxWeightLb: 8, rateCents: 1350 },
    { carrier: "fedex", service: "fedex_ground", zone: "5", minWeightLb: 9, maxWeightLb: 12, rateCents: 1500 },
    { carrier: "fedex", service: "fedex_ground", zone: "5", minWeightLb: 13, maxWeightLb: 19, rateCents: 1650 },
    { carrier: "fedex", service: "fedex_ground", zone: "5", minWeightLb: 20, maxWeightLb: 50, rateCents: 1900 },
    // UPS Ground / air, zone 3
    { carrier: "ups", service: "ups_ground", zone: "3", minWeightLb: 1, maxWeightLb: 50, rateCents: 1450 },
    { carrier: "ups", service: "ups_air", zone: "3", minWeightLb: 1, maxWeightLb: 100, rateCents: 5200 },
  ],
};

export const CONTRACT_RATE_CARD_CSV = [
  "carrier,service,zone,min_weight_lb,max_weight_lb,rate_usd",
  "usps,usps_ground_advantage,4,1,10,9.00",
  "usps,usps_ground_advantage,4,11,12,10.50",
  "usps,usps_ground_advantage,4,13,13,11.50",
  "usps,usps_priority_mail_express,4,1,10,23.50",
  "fedex,fedex_express,2,1,8,41.00",
  "fedex,fedex_express,2,9,9,46.00",
  "fedex,fedex_ground,5,1,8,13.50",
  "fedex,fedex_ground,5,9,12,15.00",
  "fedex,fedex_ground,5,13,19,16.50",
  "fedex,fedex_ground,5,20,50,19.00",
  "ups,ups_ground,3,1,50,14.50",
  "ups,ups_air,3,1,100,52.00",
].join("\n");

/** A record with every field the audit can verify, defaulted only in *this test file*. */
function record(overrides: Partial<ShipmentRecord> & Pick<ShipmentRecord, "tracking" | "carrier" | "service" | "shipDate" | "dims" | "actualWeightLb" | "zone">): ShipmentRecord {
  return {
    orderId: "SO-0000",
    residential: true,
    addressCorrection: false,
    ...overrides,
  };
}

function line(overrides: Partial<InvoiceLine> & Pick<InvoiceLine, "tracking" | "billedWeightLb" | "zone" | "baseChargeCents" | "totalCents" | "invoiceDate">): InvoiceLine {
  return {
    surcharges: [],
    ...overrides,
  };
}

/**
 * Vector 1 — the divisor swap (USPS 166 → 139 on 2026-07-12).
 * Both lines bill 13 lb for the same 1,800 cu in parcel:
 *  - shipped 2026-08-01 (divisor 139) → 13 lb is correct: accepted as billed, zero findings.
 *  - shipped 2026-06-01 (divisor 166) → 13 lb is the *new* divisor applied to an old shipment:
 *    2 lb over, priced at $1.00 vs $11.50.
 */
export function divisorSwapInput(rateCard: RateCard | null = CONTRACT_RATE_CARD): AuditInput {
  return {
    asOfDate: "2026-09-18",
    ...(rateCard ? { rateCard } : {}),
    shipmentRecords: [
      record({
        orderId: "SO-1001",
        tracking: "9400111899223197420010",
        carrier: "usps",
        service: "usps_ground_advantage",
        shipDate: "2026-08-01",
        dims: { length: 20, width: 15, height: 6 },
        actualWeightLb: 10,
        zone: "4",
        promisedDate: "2026-08-05",
        deliveredAt: "2026-08-05",
      }),
      record({
        orderId: "SO-1002",
        tracking: "9400111899223197420020",
        carrier: "usps",
        service: "usps_ground_advantage",
        shipDate: "2026-06-01",
        dims: { length: 20, width: 15, height: 6 },
        actualWeightLb: 10,
        zone: "4",
        promisedDate: "2026-06-05",
        deliveredAt: "2026-06-05",
      }),
    ],
    invoiceLines: [
      line({
        tracking: "9400111899223197420010",
        carrier: "usps",
        service: "usps_ground_advantage",
        billedWeightLb: 13,
        zone: "4",
        baseChargeCents: 1150,
        totalCents: 1150,
        invoiceDate: "2026-09-10",
      }),
      line({
        tracking: "9400111899223197420020",
        carrier: "usps",
        service: "usps_ground_advantage",
        billedWeightLb: 13,
        zone: "4",
        baseChargeCents: 1150,
        totalCents: 1150,
        invoiceDate: "2026-09-10",
      }),
    ],
  };
}

/**
 * Vector 2 — the round-up rule: 11.2″ is billed from 12″.
 * Both lines bill the same 1120 cu in parcel (FedEx Express, divisor 139, no cubic-inch minimum):
 *  - billed 9 lb (from 12×10×10 = 1200 / 139 → 8.63 → 9 lb) → correct: zero findings.
 *  - billed 8 lb (from truncated 11×10×10) → the carrier *under*-billed: reported, never claimed.
 */
export function roundUpInput(rateCard: RateCard | null = CONTRACT_RATE_CARD): AuditInput {
  return {
    asOfDate: "2026-09-18",
    ...(rateCard ? { rateCard } : {}),
    shipmentRecords: [
      record({
        orderId: "SO-2001",
        tracking: "772019283746510",
        carrier: "fedex",
        service: "fedex_express",
        shipDate: "2026-08-05",
        dims: { length: 11.2, width: 10, height: 10 },
        actualWeightLb: 4.5,
        zone: "2",
        residential: false,
        promisedDate: "2026-08-08",
        deliveredAt: "2026-08-08",
      }),
      record({
        orderId: "SO-2002",
        tracking: "772019283746511",
        carrier: "fedex",
        service: "fedex_express",
        shipDate: "2026-08-05",
        dims: { length: 11.2, width: 10, height: 10 },
        actualWeightLb: 4.5,
        zone: "2",
        residential: false,
        promisedDate: "2026-08-08",
        deliveredAt: "2026-08-08",
      }),
    ],
    invoiceLines: [
      line({
        tracking: "772019283746510",
        carrier: "fedex",
        service: "fedex_express",
        billedWeightLb: 9,
        billedDims: { length: 12, width: 10, height: 10 },
        zone: "2",
        baseChargeCents: 4600,
        totalCents: 4600,
        invoiceDate: "2026-09-10",
      }),
      line({
        tracking: "772019283746511",
        carrier: "fedex",
        service: "fedex_express",
        billedWeightLb: 8,
        billedDims: { length: 11, width: 10, height: 10 },
        zone: "2",
        baseChargeCents: 4100,
        totalCents: 4100,
        invoiceDate: "2026-09-10",
      }),
    ],
  };
}

/**
 * Vector 3 — AHS-Dimension billed on a 40″ parcel.
 * The PRD's tariff table puts FedEx's trigger at a longest side > 48 in and UPS's at > 96 in, so a
 * 40 in parcel is ineligible at both carriers; the third line (100 in at UPS) proves eligibility is
 * evaluated from the trigger rather than hardcoded, and produces no finding.
 */
export function ahsDimensionInput(rateCard: RateCard | null = CONTRACT_RATE_CARD): AuditInput {
  return {
    asOfDate: "2026-09-18",
    ...(rateCard ? { rateCard } : {}),
    shipmentRecords: [
      record({
        orderId: "SO-3001",
        tracking: "772019283746520",
        carrier: "fedex",
        service: "fedex_ground",
        shipDate: "2026-08-05",
        dims: { length: 40, width: 10, height: 10 },
        actualWeightLb: 12,
        zone: "5",
        promisedDate: "2026-08-10",
        deliveredAt: "2026-08-10",
      }),
      record({
        orderId: "SO-3002",
        tracking: "1Z999AA10123456784",
        carrier: "ups",
        service: "ups_ground",
        shipDate: "2026-08-05",
        dims: { length: 40, width: 10, height: 10 },
        actualWeightLb: 12,
        zone: "3",
        promisedDate: "2026-08-08",
        deliveredAt: "2026-08-08",
      }),
      record({
        orderId: "SO-3003",
        tracking: "1Z999AA10123456799",
        carrier: "ups",
        service: "ups_air",
        shipDate: "2026-08-06",
        dims: { length: 100, width: 10, height: 10 },
        actualWeightLb: 20,
        zone: "3",
        residential: false,
        promisedDate: "2026-08-09",
        deliveredAt: "2026-08-09",
      }),
    ],
    invoiceLines: [
      line({
        tracking: "772019283746520",
        carrier: "fedex",
        service: "fedex_ground",
        billedWeightLb: 29,
        zone: "5",
        baseChargeCents: 1900,
        surcharges: [{ code: "AHS-DIM", amountCents: 2950 }],
        totalCents: 4850,
        invoiceDate: "2026-09-10",
      }),
      line({
        tracking: "1Z999AA10123456784",
        carrier: "ups",
        service: "ups_ground",
        billedWeightLb: 29,
        zone: "3",
        baseChargeCents: 1450,
        surcharges: [{ code: "Additional Handling - Dimension", amountCents: 2950 }],
        totalCents: 4400,
        invoiceDate: "2026-09-10",
      }),
      line({
        tracking: "1Z999AA10123456799",
        carrier: "ups",
        service: "ups_air",
        billedWeightLb: 72,
        zone: "3",
        baseChargeCents: 5200,
        surcharges: [{ code: "AHS-DIM", amountCents: 2950 }],
        totalCents: 8150,
        invoiceDate: "2026-09-10",
      }),
    ],
  };
}

/**
 * Vector 4 — a late-delivery refund inside vs outside the money-back window (FedEx Express, 21 days).
 * asOfDate 2026-08-20: line 1 delivered 8 days ago → claimable; line 2 delivered 48 days ago →
 * window closed, no claim asserted.
 */
export function lateDeliveryInput(rateCard: RateCard | null = CONTRACT_RATE_CARD): AuditInput {
  return {
    asOfDate: "2026-08-20",
    ...(rateCard ? { rateCard } : {}),
    shipmentRecords: [
      record({
        orderId: "SO-4001",
        tracking: "772019283746530",
        carrier: "fedex",
        service: "fedex_express",
        shipDate: "2026-08-04",
        dims: { length: 12, width: 10, height: 8 },
        actualWeightLb: 6,
        zone: "2",
        residential: false,
        promisedDate: "2026-08-10",
        deliveredAt: "2026-08-12",
      }),
      record({
        orderId: "SO-4002",
        tracking: "772019283746531",
        carrier: "fedex",
        service: "fedex_express",
        shipDate: "2026-07-01",
        dims: { length: 12, width: 10, height: 8 },
        actualWeightLb: 6,
        zone: "2",
        residential: false,
        promisedDate: "2026-07-01",
        deliveredAt: "2026-07-03",
      }),
    ],
    invoiceLines: [
      line({
        tracking: "772019283746530",
        carrier: "fedex",
        service: "fedex_express",
        billedWeightLb: 7,
        zone: "2",
        baseChargeCents: 4100,
        totalCents: 4100,
        invoiceDate: "2026-08-13",
      }),
      line({
        tracking: "772019283746531",
        carrier: "fedex",
        service: "fedex_express",
        billedWeightLb: 7,
        zone: "2",
        baseChargeCents: 4100,
        totalCents: 4100,
        invoiceDate: "2026-07-04",
      }),
    ],
  };
}

/**
 * Vector 5 — the dispute clock on three identically over-billed USPS lines (30-day window, asOf
 * 2026-09-18): open (27 days left), expiring (7 days left), expired (18 days past).
 */
export function disputeClockInput(rateCard: RateCard | null = CONTRACT_RATE_CARD): AuditInput {
  const base = {
    carrier: "usps" as const,
    service: "usps_ground_advantage" as const,
    shipDate: "2026-06-01",
    dims: { length: 20, width: 15, height: 6 },
    actualWeightLb: 10,
    zone: "4",
  };
  const trackings = ["9400111899223197420100", "9400111899223197420101", "9400111899223197420102"];
  return {
    asOfDate: "2026-09-18",
    ...(rateCard ? { rateCard } : {}),
    shipmentRecords: trackings.map((tracking, index) =>
      record({
        ...base,
        orderId: `SO-500${index + 1}`,
        tracking,
        promisedDate: "2026-06-05",
        deliveredAt: "2026-06-05",
      }),
    ),
    invoiceLines: trackings.map((tracking, index) =>
      line({
        tracking,
        carrier: "usps",
        service: "usps_ground_advantage",
        billedWeightLb: 13,
        zone: "4",
        baseChargeCents: 1150,
        totalCents: 1150,
        invoiceDate: ["2026-09-15", "2026-08-26", "2026-08-01"][index] as string,
      }),
    ),
  };
}

/**
 * Vector 6 — a clean invoice: correct weights, eligible accessorials, on-time delivery, verified
 * contract rates and open dispute windows. It must produce ZERO findings.
 */
export function cleanInput(rateCard: RateCard | null = CONTRACT_RATE_CARD): AuditInput {
  return {
    asOfDate: "2026-09-18",
    ...(rateCard ? { rateCard } : {}),
    shipmentRecords: [
      record({
        orderId: "SO-6001",
        tracking: "1Z999AA10123456701",
        carrier: "ups",
        service: "ups_ground",
        shipDate: "2026-09-01",
        dims: { length: 12, width: 10, height: 8 },
        actualWeightLb: 12,
        zone: "3",
        promisedDate: "2026-09-04",
        deliveredAt: "2026-09-04",
      }),
      record({
        orderId: "SO-6002",
        tracking: "772019283746540",
        carrier: "fedex",
        service: "fedex_ground",
        shipDate: "2026-09-02",
        dims: { length: 18, width: 14, height: 10 },
        actualWeightLb: 15,
        zone: "5",
        promisedDate: "2026-09-06",
        deliveredAt: "2026-09-06",
      }),
      record({
        orderId: "SO-6003",
        tracking: "9400111899223197420200",
        carrier: "usps",
        service: "usps_priority_mail_express",
        shipDate: "2026-09-03",
        dims: { length: 12, width: 10, height: 8 },
        actualWeightLb: 6,
        zone: "4",
        promisedDate: "2026-09-05",
        deliveredAt: "2026-09-05",
      }),
    ],
    invoiceLines: [
      line({
        tracking: "1Z999AA10123456701",
        carrier: "ups",
        service: "ups_ground",
        billedWeightLb: 12,
        zone: "3",
        baseChargeCents: 1450,
        surcharges: [{ code: "RESIDENTIAL", amountCents: 620 }],
        totalCents: 2070,
        invoiceDate: "2026-09-10",
      }),
      line({
        tracking: "772019283746540",
        carrier: "fedex",
        service: "fedex_ground",
        billedWeightLb: 19,
        zone: "5",
        baseChargeCents: 1650,
        totalCents: 1650,
        invoiceDate: "2026-09-10",
      }),
      line({
        tracking: "9400111899223197420200",
        carrier: "usps",
        service: "usps_priority_mail_express",
        billedWeightLb: 6,
        zone: "4",
        baseChargeCents: 2350,
        totalCents: 2350,
        invoiceDate: "2026-09-10",
      }),
    ],
  };
}

/**
 * Vector 7 — the same over-billed invoice with no contract rate card: the weights are still proven,
 * the money is `unverifiable-rate` (advisory), and the exposure summary counts the lines as
 * unpriced rather than as $0 of recovery.
 */
export function noRateCardInput(): AuditInput {
  return divisorSwapInput(null);
}

/**
 * Vector 8 — DIM weight billed below the cubic-inch threshold (FedEx Ground, 1,600 cu in ≤ 1,728):
 * the carrier charged the dimensional weight its own tariff says does not apply.
 */
export function thresholdInput(rateCard: RateCard | null = CONTRACT_RATE_CARD): AuditInput {
  return {
    asOfDate: "2026-09-18",
    ...(rateCard ? { rateCard } : {}),
    shipmentRecords: [
      record({
        orderId: "SO-8001",
        tracking: "772019283746550",
        carrier: "fedex",
        service: "fedex_ground",
        shipDate: "2026-08-20",
        dims: { length: 16, width: 10, height: 10 },
        actualWeightLb: 8,
        zone: "5",
        promisedDate: "2026-08-24",
        deliveredAt: "2026-08-24",
      }),
    ],
    invoiceLines: [
      line({
        tracking: "772019283746550",
        carrier: "fedex",
        service: "fedex_ground",
        billedWeightLb: 12,
        zone: "5",
        baseChargeCents: 1500,
        totalCents: 1500,
        invoiceDate: "2026-09-10",
      }),
    ],
  };
}

/** A shipment the v1 divisor table does not cover (LTL freight). */
export function unsupportedServiceInput(): AuditInput {
  const base = cleanInput();
  const first = base.shipmentRecords[0] as ShipmentRecord;
  return {
    ...base,
    shipmentRecords: [
      { ...first, service: "ltl_freight" as unknown as ShipmentRecord["service"] },
      ...base.shipmentRecords.slice(1),
    ],
    invoiceLines: base.invoiceLines.slice(0, 1),
  };
}

/** A ship date before the v1 rule table starts (2026-01-01) — never extrapolated. */
export function dateOutOfRangeInput(): AuditInput {
  const base = divisorSwapInput();
  const first = base.shipmentRecords[0] as ShipmentRecord;
  return {
    ...base,
    shipmentRecords: [{ ...first, shipDate: "2025-12-31" }, ...base.shipmentRecords.slice(1)],
  };
}

/** A record with no tracking number, audited directly (an API caller, not a CSV). */
export function missingTrackingInput(): AuditInput {
  const base = divisorSwapInput();
  const first = base.shipmentRecords[0] as ShipmentRecord;
  return {
    ...base,
    shipmentRecords: [{ ...first, tracking: "" }, ...base.shipmentRecords.slice(1)],
    invoiceLines: [{ ...(base.invoiceLines[0] as InvoiceLine), tracking: "" }, ...base.invoiceLines.slice(1)],
  };
}

// ---------------------------------------------------------------------------------------------
// CSV scenarios the UI loads. Each one is the exact text a shipper would paste.
// ---------------------------------------------------------------------------------------------

export const SHIPMENT_RECORDS_CSV_HEADER =
  "order_id,tracking,carrier,service,ship_date,length,width,height,actual_weight_lb,zone,declared_value_usd,residential,address_correction,promised_date,delivered_at";
export const INVOICE_LINES_CSV_HEADER =
  "tracking,invoice_date,carrier,service,billed_weight_lb,zone,base_charge_usd,surcharges,total_usd";

const CLEAN_RECORDS_CSV = [
  SHIPMENT_RECORDS_CSV_HEADER,
  "SO-6001,1Z999AA10123456701,ups,ups_ground,2026-09-01,12,10,8,12,3,180.00,true,false,2026-09-04,2026-09-04",
  "SO-6002,772019283746540,fedex,fedex_ground,2026-09-02,18,14,10,15,5,420.00,true,false,2026-09-06,2026-09-06",
  "SO-6003,9400111899223197420200,usps,usps_priority_mail_express,2026-09-03,12,10,8,6,4,95.00,true,false,2026-09-05,2026-09-05",
].join("\n");

const CLEAN_LINES_CSV = [
  INVOICE_LINES_CSV_HEADER,
  "1Z999AA10123456701,2026-09-10,ups,ups_ground,12,3,14.50,RESIDENTIAL:6.20,20.70",
  "772019283746540,2026-09-10,fedex,fedex_ground,19,5,16.50,,16.50",
  "9400111899223197420200,2026-09-10,usps,usps_priority_mail_express,6,4,23.50,,23.50",
].join("\n");

const OVERCHARGE_RECORDS_CSV = [
  SHIPMENT_RECORDS_CSV_HEADER,
  "SO-1002,9400111899223197420020,usps,usps_ground_advantage,2026-06-01,20,15,6,10,4,240.00,true,false,2026-06-05,2026-06-05",
  "SO-3001,772019283746520,fedex,fedex_ground,2026-08-05,40,10,10,12,5,610.00,true,false,2026-08-10,2026-08-10",
  "SO-4003,772019283746560,fedex,fedex_express,2026-09-09,12,10,8,6,2,300.00,false,false,2026-09-12,2026-09-14",
].join("\n");

const OVERCHARGE_LINES_CSV = [
  INVOICE_LINES_CSV_HEADER,
  "9400111899223197420020,2026-09-10,usps,usps_ground_advantage,13,4,11.50,,11.50",
  "772019283746520,2026-09-10,fedex,fedex_ground,29,5,19.00,AHS-DIM:29.50,48.50",
  "772019283746560,2026-09-10,fedex,fedex_express,7,2,41.00,,41.00",
].join("\n");

const DEADLINE_RECORDS_CSV = [
  SHIPMENT_RECORDS_CSV_HEADER,
  "SO-5001,9400111899223197420100,usps,usps_ground_advantage,2026-06-01,20,15,6,10,4,240.00,true,false,2026-06-05,2026-06-05",
  "SO-5002,9400111899223197420101,usps,usps_ground_advantage,2026-06-01,20,15,6,10,4,240.00,true,false,2026-06-05,2026-06-05",
  "SO-5003,9400111899223197420102,usps,usps_ground_advantage,2026-06-01,20,15,6,10,4,240.00,true,false,2026-06-05,2026-06-05",
].join("\n");

const DEADLINE_LINES_CSV = [
  INVOICE_LINES_CSV_HEADER,
  "9400111899223197420100,2026-09-15,usps,usps_ground_advantage,13,4,11.50,,11.50",
  "9400111899223197420101,2026-08-26,usps,usps_ground_advantage,13,4,11.50,,11.50",
  "9400111899223197420102,2026-08-01,usps,usps_ground_advantage,13,4,11.50,,11.50",
].join("\n");

const ROUNDUP_RECORDS_CSV = [
  SHIPMENT_RECORDS_CSV_HEADER,
  "SO-2001,772019283746510,fedex,fedex_express,2026-08-05,11.2,10,10,4.5,2,300.00,false,false,2026-08-08,2026-08-08",
  "SO-2002,772019283746511,fedex,fedex_express,2026-08-05,11.2,10,10,4.5,2,300.00,false,false,2026-08-08,2026-08-08",
].join("\n");

const ROUNDUP_LINES_CSV = [
  INVOICE_LINES_CSV_HEADER,
  "772019283746510,2026-09-10,fedex,fedex_express,9,2,46.00,,46.00",
  "772019283746511,2026-09-10,fedex,fedex_express,8,2,41.00,,41.00",
].join("\n");

const THRESHOLD_RECORDS_CSV = [
  SHIPMENT_RECORDS_CSV_HEADER,
  "SO-8001,772019283746550,fedex,fedex_ground,2026-08-20,16,10,10,8,5,290.00,true,false,2026-08-24,2026-08-24",
].join("\n");

const THRESHOLD_LINES_CSV = [
  INVOICE_LINES_CSV_HEADER,
  "772019283746550,2026-09-10,fedex,fedex_ground,12,5,15.00,,15.00",
].join("\n");

const MESSY_RECORDS_CSV = [
  // `zone` is deliberately absent: the audit must refuse to price a line without it.
  "order_id,tracking,carrier,service,ship_date,length,width,height,actual_weight_lb",
  "SO-9001,9400111899223197420300,usps,usps_ground_advantage,2026-09-01,20,15,6,10",
].join("\n");

const MESSY_LINES_CSV = [
  INVOICE_LINES_CSV_HEADER,
  "9400111899223197420300,2026-09-10,usps,usps_ground_advantage,13,4,11.50,,11.50",
].join("\n");

export type ScenarioKey = "clean" | "overcharge" | "deadline" | "roundup" | "threshold" | "unverified" | "messy";

export interface AuditScenario {
  key: ScenarioKey;
  label: string;
  description: string;
  shipmentRecordsCsv: string;
  invoiceLinesCsv: string;
  /** Empty string = no rate card supplied (every line becomes `unverifiable-rate`). */
  rateCardCsv: string;
  asOfDate: string;
}

export const AUDIT_SCENARIOS: AuditScenario[] = [
  {
    key: "clean",
    label: "Load clean example",
    description:
      "Three correct lines (UPS Ground, FedEx Ground, USPS Priority Mail Express): right billable weight, eligible residential surcharge, on-time delivery, contract rates that match. Must audit to zero flags.",
    shipmentRecordsCsv: CLEAN_RECORDS_CSV,
    invoiceLinesCsv: CLEAN_LINES_CSV,
    rateCardCsv: CONTRACT_RATE_CARD_CSV,
    asOfDate: "2026-09-18",
  },
  {
    key: "overcharge",
    label: "Load overcharge example",
    description:
      "Three lines with money on them: a USPS divisor swap (166 → 139 applied to a June shipment), an AHS-Dimension billed on a 40″ FedEx Ground parcel, and a two-day-late FedEx Express delivery still inside the money-back window.",
    shipmentRecordsCsv: OVERCHARGE_RECORDS_CSV,
    invoiceLinesCsv: OVERCHARGE_LINES_CSV,
    rateCardCsv: CONTRACT_RATE_CARD_CSV,
    asOfDate: "2026-09-18",
  },
  {
    key: "deadline",
    label: "Load dispute-clock example",
    description:
      "The same 2 lb USPS overcharge on three invoices: one still open, one closing within a week, one already expired — the difference between claimable and expired money.",
    shipmentRecordsCsv: DEADLINE_RECORDS_CSV,
    invoiceLinesCsv: DEADLINE_LINES_CSV,
    rateCardCsv: CONTRACT_RATE_CARD_CSV,
    asOfDate: "2026-09-18",
  },
  {
    key: "roundup",
    label: "Load round-up example",
    description:
      "One parcel measured at 11.2″: billed at 9 lb from the rounded 12″ (correct, no flags) and at 8 lb from the truncated 11″ (the carrier under-billed — reported, never claimed).",
    shipmentRecordsCsv: ROUNDUP_RECORDS_CSV,
    invoiceLinesCsv: ROUNDUP_LINES_CSV,
    rateCardCsv: CONTRACT_RATE_CARD_CSV,
    asOfDate: "2026-09-18",
  },
  {
    key: "threshold",
    label: "Load DIM-below-threshold example",
    description:
      "A 16×10×10 FedEx Ground parcel (1,600 cu in, under the 1,728 cu in threshold) billed on its dimensional weight: the trigger that says DIM does not apply, and the overcharge it priced.",
    shipmentRecordsCsv: THRESHOLD_RECORDS_CSV,
    invoiceLinesCsv: THRESHOLD_LINES_CSV,
    rateCardCsv: CONTRACT_RATE_CARD_CSV,
    asOfDate: "2026-09-18",
  },
  {
    key: "unverified",
    label: "Load without a rate card",
    description:
      "An over-billed USPS line audited with no contract rate card: the weight proof holds, the money is reported unverifiable rather than guessed.",
    shipmentRecordsCsv: OVERCHARGE_RECORDS_CSV.split("\n").slice(0, 2).join("\n"),
    invoiceLinesCsv: OVERCHARGE_LINES_CSV.split("\n").slice(0, 2).join("\n"),
    rateCardCsv: "",
    asOfDate: "2026-09-18",
  },
  {
    key: "messy",
    label: "Load a broken export",
    description:
      "A shipment export with no zone column: the audit stops with the missing column named instead of pricing the line from a default.",
    shipmentRecordsCsv: MESSY_RECORDS_CSV,
    invoiceLinesCsv: MESSY_LINES_CSV,
    rateCardCsv: CONTRACT_RATE_CARD_CSV,
    asOfDate: "2026-09-18",
  },
];

export function scenarioByKey(key: string): AuditScenario | undefined {
  return AUDIT_SCENARIOS.find((scenario) => scenario.key === key);
}

export const DEFAULT_SCENARIO: ScenarioKey = "overcharge";

/**
 * Shown under the example buttons: the demos are the fixtures the build gate asserts against, so
 * what a visitor loads is what the test suite proves — and nothing they paste leaves the page.
 */
export const SCENARIO_KEYS_NOTE =
  "The examples are synthetic worked cases (the same fixtures the build gate asserts against). Your own files are audited in the browser: no upload, no LLM, no third-party call.";
