import {
  InvalidInitialRevisionError,
  SaveSlotAlreadyExistsError,
  type SaveRepository,
  type SaveResult,
} from "../../application/ports/save-repository";
import type { GameState, PersistedGameState } from "../../domain/game-state";
import type { SaveSlotId } from "../../domain/shared/ids";

export class MemorySaveRepository implements SaveRepository {
  private readonly saves = new Map<SaveSlotId, PersistedGameState>();

  constructor(initialStates: readonly PersistedGameState[] = []) {
    for (const state of initialStates) this.saves.set(state.slotId, structuredClone(state));
  }

  async load(slotId: SaveSlotId): Promise<PersistedGameState | null> {
    const state = this.saves.get(slotId);
    return state ? structuredClone(state) : null;
  }

  async create(initialState: GameState): Promise<void> {
    if (initialState.revision !== 0) {
      throw new InvalidInitialRevisionError(initialState.revision);
    }
    if (this.saves.has(initialState.slotId)) {
      throw new SaveSlotAlreadyExistsError(initialState.slotId);
    }
    this.saves.set(initialState.slotId, structuredClone(initialState));
  }

  async save(state: GameState, expectedRevision: number): Promise<SaveResult> {
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
