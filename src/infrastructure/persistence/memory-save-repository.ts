import {
  InvalidInitialRevisionError,
  SaveSlotAlreadyExistsError,
  type SaveRepository,
  type SaveResult,
} from "../../application/ports/save-repository";
import type { GameStateV2 } from "../../domain/game-state";
import type { SaveSlotId } from "../../domain/shared/ids";

export class MemorySaveRepository implements SaveRepository {
  private readonly saves = new Map<SaveSlotId, GameStateV2>();

  async load(slotId: SaveSlotId): Promise<GameStateV2 | null> {
    const state = this.saves.get(slotId);
    return state ? structuredClone(state) : null;
  }

  async create(initialState: GameStateV2): Promise<void> {
    if (initialState.revision !== 0) {
      throw new InvalidInitialRevisionError(initialState.revision);
    }
    if (this.saves.has(initialState.slotId)) {
      throw new SaveSlotAlreadyExistsError(initialState.slotId);
    }
    this.saves.set(initialState.slotId, structuredClone(initialState));
  }

  async save(state: GameStateV2, expectedRevision: number): Promise<SaveResult> {
    const current = this.saves.get(state.slotId);
    if (!current) return { status: "not-found", expectedRevision };
    if (current.revision !== expectedRevision) {
      return {
        status: "conflict",
        expectedRevision,
        actualRevision: current.revision,
      };
    }

    const savedState = structuredClone(state);
    savedState.revision = expectedRevision + 1;
    this.saves.set(savedState.slotId, savedState);
    return { status: "saved", state: structuredClone(savedState) };
  }
}
