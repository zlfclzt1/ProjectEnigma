import type { GameStateV2 } from "../../domain/game-state";
import type { SaveSlotId } from "../../domain/shared/ids";

export type SaveResult =
  | { readonly status: "saved"; readonly state: GameStateV2 }
  | {
      readonly status: "conflict";
      readonly expectedRevision: number;
      readonly actualRevision: number;
    }
  | { readonly status: "not-found"; readonly expectedRevision: number };

export interface SaveRepository {
  load(slotId: SaveSlotId): Promise<GameStateV2 | null>;
  create(initialState: GameStateV2): Promise<void>;
  save(state: GameStateV2, expectedRevision: number): Promise<SaveResult>;
}

export class SaveSlotAlreadyExistsError extends Error {
  constructor(readonly slotId: SaveSlotId) {
    super(`Save slot already exists: ${slotId}`);
    this.name = "SaveSlotAlreadyExistsError";
  }
}

export class InvalidInitialRevisionError extends Error {
  constructor(readonly revision: number) {
    super(`A new save must start at revision 0, received ${revision}`);
    this.name = "InvalidInitialRevisionError";
  }
}
