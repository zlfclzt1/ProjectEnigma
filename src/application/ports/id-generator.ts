import type { IdGeneratorState } from "../../domain/shared/runtime-state";

export type { IdGeneratorState } from "../../domain/shared/runtime-state";

/** Creates stable runtime entity identifiers inside one save slot. */
export interface IdGenerator {
  next(prefix: string): string;
  snapshot(): IdGeneratorState;
}
