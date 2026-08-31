/**
 * Generic Deterministic Calculation Engine Contract.
 * Every factory product implements this contract for its deterministic core.
 */

export interface EngineMetadata {
  id: string;
  name: string;
  version: string;
  description: string;
}

export interface CalculationResult<TOutput> {
  success: boolean;
  data?: TOutput;
  error?: string;
  computedAt: string;
}

export interface CalculationEngine<TInput, TOutput> {
  metadata: EngineMetadata;
  validate: (input: TInput) => { valid: boolean; errors?: string[] };
  calculate: (input: TInput) => TOutput;
}

// ---------------------------------------------------------------------------
// Generic Stub Engine (Trivial Reference Implementation)
// ---------------------------------------------------------------------------

export interface StubCalculationInput {
  baseValue: number;
  multiplier?: number;
  offset?: number;
}

export interface StubCalculationOutput {
  calculatedValue: number;
  baseValue: number;
  multiplier: number;
  offset: number;
}

/**
 * Trivial reference calculation engine.
 * Pure deterministic transformation without I/O or side effects.
 */
export const stubEngine: CalculationEngine<StubCalculationInput, StubCalculationOutput> = {
  metadata: {
    id: "stub_calculation_engine",
    name: "Generic Stub Calculation Engine",
    version: "1.0.0",
    description: "Generic baseline calculation engine implementing the factory contract.",
  },
  validate(input: StubCalculationInput) {
    const errors: string[] = [];
    if (typeof input.baseValue !== "number" || Number.isNaN(input.baseValue)) {
      errors.push("baseValue must be a valid number.");
    }
    if (input.multiplier !== undefined && (typeof input.multiplier !== "number" || Number.isNaN(input.multiplier))) {
      errors.push("multiplier must be a valid number if provided.");
    }
    if (input.offset !== undefined && (typeof input.offset !== "number" || Number.isNaN(input.offset))) {
      errors.push("offset must be a valid number if provided.");
    }
    return {
      valid: errors.length === 0,
      errors: errors.length > 0 ? errors : undefined,
    };
  },
  calculate({ baseValue, multiplier = 1, offset = 0 }: StubCalculationInput): StubCalculationOutput {
    return {
      calculatedValue: baseValue * multiplier + offset,
      baseValue,
      multiplier,
      offset,
    };
  },
};

/**
 * Helper to safely execute any CalculationEngine instance with validation.
 */
export function executeCalculation<TInput, TOutput>(
  engine: CalculationEngine<TInput, TOutput>,
  input: TInput,
): CalculationResult<TOutput> {
  const validation = engine.validate(input);
  if (!validation.valid) {
    return {
      success: false,
      error: validation.errors?.join("; ") || "Invalid input parameters.",
      computedAt: new Date().toISOString(),
    };
  }

  try {
    const data = engine.calculate(input);
    return {
      success: true,
      data,
      computedAt: new Date().toISOString(),
    };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Engine execution failure";
    return {
      success: false,
      error: message,
      computedAt: new Date().toISOString(),
    };
  }
}

// Re-export specific engines
export * from "./loan";
export * from "./selfEmployment2026";
