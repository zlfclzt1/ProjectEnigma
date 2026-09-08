import Dexie, { type EntityTable } from "dexie";
import {
  InvalidInitialRevisionError,
  SaveSlotAlreadyExistsError,
  type SaveRepository,
  type SaveResult,
} from "../../application/ports/save-repository";
import type { GameStateV2 } from "../../domain/game-state";
import type { SaveSlotId } from "../../domain/shared/ids";

export interface IndexedDbSaveRepositoryOptions {
  readonly databaseName?: string;
  readonly indexedDB?: IDBFactory;
  readonly IDBKeyRange?: typeof globalThis.IDBKeyRange;
}

class GameSaveDatabase extends Dexie {
  readonly saves!: EntityTable<GameStateV2, "slotId">;

  constructor(options: IndexedDbSaveRepositoryOptions) {
    super(options.databaseName ?? "mystery-guild-master-v2", {
      indexedDB: options.indexedDB ?? globalThis.indexedDB,
      IDBKeyRange: options.IDBKeyRange ?? globalThis.IDBKeyRange,
    });
    this.version(1).stores({ saves: "&slotId" });
  }
}

export class IndexedDbSaveRepository implements SaveRepository {
  private readonly database: GameSaveDatabase;

  constructor(options: IndexedDbSaveRepositoryOptions = {}) {
    this.database = new GameSaveDatabase(options);
  }

  async load(slotId: SaveSlotId): Promise<GameStateV2 | null> {
    const state = await this.database.saves.get(slotId);
    return state ? structuredClone(state) : null;
  }

  async create(initialState: GameStateV2): Promise<void> {
    if (initialState.revision !== 0) {
      throw new InvalidInitialRevisionError(initialState.revision);
    }

    await this.database.transaction("rw", this.database.saves, async () => {
      if (await this.database.saves.get(initialState.slotId)) {
        throw new SaveSlotAlreadyExistsError(initialState.slotId);
      }
      await this.database.saves.add(structuredClone(initialState));
    });
  }

  async save(state: GameStateV2, expectedRevision: number): Promise<SaveResult> {
    return this.database.transaction("rw", this.database.saves, async () => {
      const current = await this.database.saves.get(state.slotId);
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
      await this.database.saves.put(savedState);
      return { status: "saved", state: structuredClone(savedState) };
    });
  }

  close(): void {
    this.database.close();
  }

  async deleteDatabase(): Promise<void> {
    await this.database.delete();
  }
}
