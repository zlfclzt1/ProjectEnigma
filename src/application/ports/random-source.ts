export interface RandomState {
  readonly seed: string;
  readonly counter: number;
}

/**
 * Produces deterministic unit values in the range [0, 1).
 * Tags make a call site visible in saved state diagnostics without changing
 * the single ordered stream semantics.
 */
export interface RandomSource {
  next(tag?: string): number;
  snapshot(): RandomState;
}
