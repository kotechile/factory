/**
 * CanopyProof — input refusal. One error type, named rule, named field: a bad batch never
 * half-runs, and the message says what the caller has to fix (AGENTS.md rule 5).
 */
export class CanopyProofInputError extends Error {
  readonly code = "cp-input";
  readonly ruleId: string;
  readonly field: string;

  constructor(ruleId: string, field: string, message: string) {
    super(message);
    this.name = "CanopyProofInputError";
    this.ruleId = ruleId;
    this.field = field;
  }
}
