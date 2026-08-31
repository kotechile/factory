// Deterministic loan amortization engine.
// This is the factory's "deterministic core" pattern: pure functions, no I/O,
// exact-answer testable against known industry values.

export interface LoanInput {
  principal: number;
  annualRate: number; // e.g. 0.06 = 6%
  termMonths: number;
}

/** Monthly payment for a fixed-rate, fully-amortizing loan. */
export function monthlyPayment({ principal, annualRate, termMonths }: LoanInput): number {
  const r = annualRate / 12;
  if (principal <= 0) return 0;
  if (r === 0) return principal / termMonths;
  const factor = Math.pow(1 + r, termMonths);
  return (principal * r * factor) / (factor - 1);
}

/** Total interest paid over the life of the loan. */
export function totalInterest(input: LoanInput): number {
  return monthlyPayment(input) * input.termMonths - input.principal;
}
