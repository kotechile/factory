/**
 * LedgerLink known-answer test fixtures.
 *
 * Two fixtures:
 *  1. SAMPLE — a small, hand-checked payout where every bucket is verifiable by
 *     inspection (pence).
 *  2. WORKED_EXAMPLE — the real worked case from the recon proposal: a single
 *     £4,378.21 payout = 87 charges + 4 refunds + 3 chargebacks + 162 fees + 1
 *     FX adjustment. Built deterministically (no randomness) so the invariant
 *     Σ(net) == payout.amount holds EXACTLY and the expected GL totals are
 *     stable known-answer vectors.
 */

import type { BalanceTransactionInput, PayoutInput } from "./stripeRecon";

export const GBP_PAYOUT_PENCE = 437821; // £4,378.21

// ---------------------------------------------------------------------------
// SMALL SAMPLE — hand-checked (amounts in pence)
// ---------------------------------------------------------------------------
export interface ReconFixture {
  payout: PayoutInput;
  balanceTransactions: BalanceTransactionInput[];
}

export function smallSampleFixture(): ReconFixture {
  const base = 1_700_000_000; // fixed created timestamps for stable dates
  const balanceTransactions: BalanceTransactionInput[] = [
    {
      id: "txn_ch_1",
      type: "charge",
      amount: 6000,
      fee: -180,
      net: 5820,
      created: base,
      source: "ch_1",
    },
    {
      id: "txn_ch_2",
      type: "charge",
      amount: 3000,
      fee: -90,
      net: 2910,
      created: base + 60,
      source: "ch_2",
    },
    {
      id: "txn_re_1",
      type: "refund",
      amount: -1200,
      fee: 0,
      net: -1200,
      created: base + 120,
      source: "re_1",
    },
    {
      id: "txn_dp_1",
      type: "dispute",
      amount: -500,
      fee: -40,
      net: -540,
      created: base + 180,
      source: "dp_1",
    },
    {
      id: "txn_fe_1",
      type: "fee",
      amount: -350,
      fee: 0,
      net: -350,
      created: base + 240,
      source: "fee_1",
    },
    {
      id: "txn_adj_1",
      type: "adjustment",
      amount: 38,
      fee: 0,
      net: 38,
      created: base + 300,
      source: "adj_1",
    },
  ];

  const sumNet = balanceTransactions.reduce((s, t) => s + (t.net ?? t.amount + (t.fee ?? 0)), 0);

  return {
    payout: {
      id: "po_sample_1",
      amount: sumNet,
      currency: "gbp",
      arrivalDate: "2026-08-01",
      status: "paid",
    },
    balanceTransactions,
  };
}

// ---------------------------------------------------------------------------
// WORKED EXAMPLE — 87 charges / 4 refunds / 3 chargebacks / 162 fees / 1 FX
// ---------------------------------------------------------------------------
export function workedExampleFixture(): ReconFixture {
  const base = 1_752_000_000; // fixed, stable journal dates
  const balanceTransactions: BalanceTransactionInput[] = [];

  // 87 charges — gross cycles through a deterministic pool; fee ~2.9%.
  const chargeGrossPool = [4500, 3200, 7800, 1500, 6000, 2400, 9999, 1250, 5050, 3400];
  for (let i = 0; i < 87; i++) {
    const gross = chargeGrossPool[i % chargeGrossPool.length];
    const fee = -Math.round(gross * 0.029);
    balanceTransactions.push({
      id: `txn_chg_${i}`,
      type: "charge",
      amount: gross,
      fee,
      net: gross + fee,
      created: base + i * 3,
      source: `ch_${i}`,
    });
  }

  // 4 refunds.
  const refundAmounts = [-1500, -2200, -900, -3100];
  for (let i = 0; i < 4; i++) {
    balanceTransactions.push({
      id: `txn_re_${i}`,
      type: "refund",
      amount: refundAmounts[i],
      fee: 0,
      net: refundAmounts[i],
      created: base + 100 + i * 5,
      source: `re_${i}`,
    });
  }

  // 3 chargebacks (dispute gross + dispute fee).
  const disputes: Array<[number, number]> = [
    [-2800, -200],
    [-1500, -100],
    [-6400, -350],
  ];
  for (let i = 0; i < disputes.length; i++) {
    const [amount, fee] = disputes[i];
    balanceTransactions.push({
      id: `txn_dp_${i}`,
      type: "dispute",
      amount,
      fee,
      net: amount + fee,
      created: base + 200 + i * 5,
      source: `dp_${i}`,
    });
  }

  // 162 standalone Stripe fees (deterministic small negative amounts).
  for (let i = 0; i < 162; i++) {
    const fee = -Math.round(400 + (i % 12) * 41 + Math.floor(i / 12));
    balanceTransactions.push({
      id: `txn_fe_${i}`,
      type: "fee",
      amount: fee,
      fee: 0,
      net: fee,
      created: base + 300 + i,
      source: `fee_${i}`,
    });
  }

  // 1 FX adjustment — the balancing remainder that makes Σ(net) == £4,378.21.
  const sumSoFar = balanceTransactions.reduce((s, t) => s + (t.net ?? 0), 0);
  const fxAdjustment = GBP_PAYOUT_PENCE - sumSoFar;
  balanceTransactions.push({
    id: "txn_fx_0",
    type: "adjustment",
    amount: fxAdjustment,
    fee: 0,
    net: fxAdjustment,
    created: base + 5000,
    source: "fx_0",
  });

  return {
    payout: {
      id: "po_work_001",
      amount: GBP_PAYOUT_PENCE,
      currency: "gbp",
      arrivalDate: "2026-08-31",
      status: "paid",
    },
    balanceTransactions,
  };
}
