export interface IdGeneratorState {
  readonly counter: number;
}

/** Creates stable runtime entity identifiers inside one save slot. */
export interface IdGenerator {
  next(prefix: string): string;
  snapshot(): IdGeneratorState;
}
