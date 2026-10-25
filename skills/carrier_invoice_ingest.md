# SOP — reading a customer's real export (carrier invoices, billing files, manifests)

Applies to any product whose input is a file the CUSTOMER's system produced rather than one this
factory defines: carrier invoices (ParcelProof), provider invoices (SpendProof), tariff and interval
files (RatchetProof), and the shipment/manifest exports behind them.

The failure this SOP prevents: a product that documents its own column names, ships two paste boxes,
and is unusable by every visitor who owns a real export — because "Tracking Number" is not `tracking`.

## 1. Never require the customer to reformat a file they already have

- **Map headers, do not assert them.** Match on a normalised form of the header — lowercased, with
  spacing/punctuation/unit suffixes folded (`normaliseHeader`: `Billed Weight (lb)` →
  `billed_weight_lb`) — against a synonym table per canonical field. Carriers and platforms spell the
  same field differently and always will; the synonym list is data, not a per-vendor claim.
- **Report what you could not map, by the name the file used.** A column the audit ignores silently is
  a number the reader will believe was checked.
- **Fail loud on ambiguity.** Two columns resolving to one field is an error: choosing one silently
  audits a column the customer did not pick.
- **A file with no header row cannot be mapped** — a positional 270-column export has no names at all.
  Refuse it with the fix (download the headed summary, or add the carrier's published header row) and
  never guess by column index. Index-based parsing of a vendor's positional format is only acceptable
  from their published dictionary, pinned by a fixture, and versioned.
- **Name the way out in the UI.** Under the inputs, state where each file is downloaded from (billing
  portal → CSV, shipping platform → shipment export) and say plainly that the PDF copy is not the
  input when it is not. A product that asks for a file it never explains loses the visitor at the
  first step.

## 2. A missing input must not zero the whole answer

The rate card is the classic case: the number the product sells is gated on the one input the buyer
usually cannot export. Before shipping, ask of every required input *"does this buyer have it, in
this shape?"* and split the answer:

- **Observed, not interpolated.** Where the same source already contains the price at another weight
  (another parcel in the same carrier/service/zone lane on the same invoice), use THAT charge and label
  it an observation (`observed-bracket`), never `verified`. A contract card, when supplied, wins.
- **Refuse to smooth.** No regression, no interpolation between weight brackets, no extrapolation: a
  stepped rate table is not a straight line, and a fitted rate is a guess wearing a number's clothes.
- **Drop an unusable observation.** Charges at one weight/lane that disagree beyond a small tolerance
  (2%) mean the lane is not homogeneous (minimum charge, freight-inclusive line, mixed rate base);
  drop the observation and leave the line unpriced.
- **State the basis on the report**, in a field the reader sees (`pricing.note` + a per-line label),
  so "where did this dollar figure come from" is answerable without reading code.
- Keep the strict behaviour the DEFAULT for existing callers; make the new basis an explicit opt-in
  (`pricingBasis` / `pricing_basis`) and switch it on where the buyer sees it.

## 3. Prove it on a file shaped like the customer's, and on the live page

- Fixtures in `src/lib/calc/<slug>/*.test.ts` must include at least one file whose headers are the
  vendor's spelling (Title Case, `$`, `(lb)`) and one with a column the audit cannot map.
- Then drive the DEPLOYED page: paste the vendor-shaped file into the real inputs and read the rendered
  result — the number, the label, and the unmapped-column list. Unit tests did not catch the case where
  the demo scenario and the UI state disagree; the live page did.
- Gate: `bash scripts/verify-build.sh` (`tsc → lint → tokens → verticals → recon cadence → vitest →
  build → Playwright → visual QA`). Judge it by its own "Verification passed." text, never by a pipe's
  exit code.

## 4. What is deliberately still out of scope

PDF/scanned invoices are NOT an input for these products yet. The extraction path (LlamaParse +
declared-field set + provenance per field, as shipped in SpendProof) is the right front end, but a
parcel/tariff document is a TABLE: a per-row extraction where an unreadable row blocks that row's
verdict, never one inferred row. Do not claim PDF support in page copy until that exists.
