import { describe, it, expect } from "vitest";
import { stubEngine, executeCalculation, type StubCalculationInput } from "./index";

describe("generic stub calculation engine", () => {
  it("calculates deterministic output with default multiplier and offset", () => {
    const input = { baseValue: 100 };
    const result = executeCalculation(stubEngine, input);
    expect(result.success).toBe(true);
    expect(result.data).toEqual({
      calculatedValue: 100,
      baseValue: 100,
      multiplier: 1,
      offset: 0,
    });
  });

  it("calculates deterministic output with custom multiplier and offset", () => {
    const input = { baseValue: 50, multiplier: 2.5, offset: 10 };
    const result = executeCalculation(stubEngine, input);
    expect(result.success).toBe(true);
    expect(result.data?.calculatedValue).toBe(135);
  });

  it("returns validation failure for non-number input", () => {
    const input = { baseValue: "invalid" } as unknown as StubCalculationInput;
    const result = executeCalculation(stubEngine, input);
    expect(result.success).toBe(false);
    expect(result.error).toContain("baseValue must be a valid number");
  });
});
