import { IDBKeyRange, indexedDB } from "fake-indexeddb";
import { afterEach, describe, expect, it, vi } from "vitest";
import { MemorySaveRepository } from "../../src/infrastructure/persistence/memory-save-repository";
import { IndexedDbSaveRepository } from "../../src/infrastructure/persistence/indexeddb-save-repository";
import {
  inspectLegacyV1Save,
  LEGACY_V1_SAVE_KEY,
} from "../../src/infrastructure/persistence/legacy-v1-save";
import { runSaveRepositoryContract } from "./save-repository.contract";

describe("MemorySaveRepository", () => {
  runSaveRepositoryContract(() => ({
    repository: new MemorySaveRepository(),
    async dispose() {},
  }));
});

describe("IndexedDbSaveRepository", () => {
  let sequence = 0;
  runSaveRepositoryContract(() => {
    const repository = new IndexedDbSaveRepository({
      databaseName: `save-repository-test-${sequence++}`,
      indexedDB,
      IDBKeyRange,
    });
    return {
      repository,
      async dispose() {
        await repository.deleteDatabase();
      },
    };
  });

  afterEach(() => vi.unstubAllGlobals());

  it("uses browser IndexedDB globals when dependencies are not explicitly injected", async () => {
    vi.stubGlobal("indexedDB", indexedDB);
    vi.stubGlobal("IDBKeyRange", IDBKeyRange);
    const repository = new IndexedDbSaveRepository({
      databaseName: `save-repository-default-dependencies-${sequence++}`,
    });
    try {
      const state = (await import("../helpers/game-state-v2-factory")).createGameStateFixture();
      await repository.create(state);
      await expect(repository.load(state.slotId)).resolves.toEqual(state);
    } finally {
      await repository.deleteDatabase();
    }
  });
});

describe("legacy V1 save detection", () => {
  it("warns about a fresh V2 start without deleting the old value", () => {
    const values = new Map([[LEGACY_V1_SAVE_KEY, '{"guildName":"旧公会"}']]);
    const storage = {
      getItem(key: string) {
        return values.get(key) ?? null;
      },
    };

    expect(inspectLegacyV1Save(storage)).toEqual({
      found: true,
      message: "检测到旧版存档。V2 不迁移该存档，将创建一个全新的游戏。",
    });
    expect(values.get(LEGACY_V1_SAVE_KEY)).toBe('{"guildName":"旧公会"}');
  });

  it("does not warn when no V1 save exists", () => {
    expect(inspectLegacyV1Save({ getItem: () => null })).toEqual({ found: false });
  });
});
