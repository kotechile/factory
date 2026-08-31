import { describe, it, expect } from "vitest";
import { monthlyPayment, totalInterest } from "./loan";

// Known-answer test vectors from standard amortization tables (PMT formula).
// The factory rule: deterministic engines are proven against canonical values,
// never "looks about right".
describe("loan engine", () => {
  it("matches the canonical $100k @ 6% / 30yr case", () => {
    const input = { principal: 100000, annualRate: 0.06, termMonths: 360 };
    expect(monthlyPayment(input)).toBeCloseTo(599.55, 2);
    expect(totalInterest(input)).toBeCloseTo(115838.19, 0);
  });

  it("zero-interest loan amortizes principal evenly", () => {
    const input = { principal: 12000, annualRate: 0, termMonths: 12 };
    expect(monthlyPayment(input)).toBeCloseTo(1000, 2);
    expect(totalInterest(input)).toBeCloseTo(0, 2);
  });

  it("shorter term raises the monthly payment", () => {
    const a = monthlyPayment({ principal: 100000, annualRate: 0.06, termMonths: 360 });
    const b = monthlyPayment({ principal: 100000, annualRate: 0.06, termMonths: 180 });
    expect(b).toBeGreaterThan(a);
  });

  it("zero principal returns zero payment", () => {
    expect(monthlyPayment({ principal: 0, annualRate: 0.06, termMonths: 360 })).toBe(0);
  });
});
