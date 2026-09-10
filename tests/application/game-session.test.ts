import { describe, expect, it } from "vitest";
import type { SaveRepository, SaveResult } from "../../src/application/ports/save-repository";
import { createNewGameSession } from "../../src/application/commands/create-new-game";
import { getGameSnapshot } from "../../src/application/queries/get-game-snapshot";
import { GameSession } from "../../src/application/services/game-session";
import { loadBrowserContentRegistry } from "../../src/content/manifest";
import type { GameState, PersistedGameState } from "../../src/domain/game-state";
import { asBrandedId, type SaveSlotId } from "../../src/domain/shared/ids";
import { LocalIdGenerator } from "../../src/infrastructure/ids/local-id-generator";
import { MemorySaveRepository } from "../../src/infrastructure/persistence/memory-save-repository";
import { SeededRandomSource } from "../../src/infrastructure/random/seeded-random-source";
import { FakeClock } from "../helpers/runtime-fakes";
import { createGameStateFixture } from "../helpers/game-state-v2-factory";

class CountingSaveRepository implements SaveRepository {
  saveCalls = 0;

  constructor(readonly inner = new MemorySaveRepository()) {}

  load(slotId: SaveSlotId): Promise<PersistedGameState | null> {
    return this.inner.load(slotId);
  }

  create(initialState: GameState): Promise<void> {
    return this.inner.create(initialState);
  }

  save(state: GameState, expectedRevision: number): Promise<SaveResult> {
    this.saveCalls += 1;
    return this.inner.save(state, expectedRevision);
  }
}

describe("GameSession", () => {
  it("creates, persists, and restores the current game state", async () => {
    const saves = new MemorySaveRepository();
    const slotId = asBrandedId<"SaveSlotId">("main");
    const created = await createNewGameSession({
      saves,
      slotId,
      content: loadBrowserContentRegistry(),
      contentVersion: asBrandedId<"ContentVersion">("classic-v1"),
      clock: new FakeClock(1_000),
      ids: new LocalIdGenerator(),
      random: new SeededRandomSource("session-seed"),
    });

    const restored = await GameSession.load(saves, slotId);
    expect(restored).not.toBeNull();
    expect(getGameSnapshot(restored!)).toEqual(getGameSnapshot(created));
    expect(Object.values(getGameSnapshot(restored!).members)).toHaveLength(5);
  });

  it("commits a successful command exactly once", async () => {
    const saves = new CountingSaveRepository();
    const initial = createGameStateFixture();
    await saves.create(initial);
    const session = GameSession.fromState(saves, initial);

    const result = await session.execute({
      type: "spend-funds",
      execute(draft) {
        draft.guild.funds -= 25;
        return { remainingFunds: draft.guild.funds };
      },
    });

    expect(result.status).toBe("committed");
    expect(saves.saveCalls).toBe(1);
    expect(getGameSnapshot(session).guild.funds).toBe(75);
    expect(getGameSnapshot(session).revision).toBe(1);
    expect((await saves.load(initial.slotId))?.guild.funds).toBe(75);
  });

  it("discards partial mutations and skips persistence when a command fails", async () => {
    const saves = new CountingSaveRepository();
    const initial = createGameStateFixture();
    await saves.create(initial);
    const session = GameSession.fromState(saves, initial);

    await expect(
      session.execute({
        type: "broken-command",
        execute(draft) {
          draft.guild.funds = 0;
          throw new Error("command failed");
        },
      }),
    ).rejects.toThrow("command failed");

    expect(saves.saveCalls).toBe(0);
    expect(getGameSnapshot(session).guild.funds).toBe(100);
    expect((await saves.load(initial.slotId))?.guild.funds).toBe(100);
  });

  it("returns a save conflict without adopting the rejected draft", async () => {
    const saves = new MemorySaveRepository();
    const initial = createGameStateFixture();
    await saves.create(initial);
    const session = GameSession.fromState(saves, initial);
    await saves.save(initial, 0);

    const result = await session.execute({
      type: "stale-spend",
      execute(draft) {
        draft.guild.funds = 0;
      },
    });

    expect(result).toEqual({ status: "conflict", expectedRevision: 0, actualRevision: 1 });
    expect(getGameSnapshot(session).guild.funds).toBe(100);
    expect(getGameSnapshot(session).revision).toBe(0);
  });

  it("serializes concurrent commands and returns isolated snapshots", async () => {
    const saves = new MemorySaveRepository();
    const initial = createGameStateFixture();
    await saves.create(initial);
    const session = GameSession.fromState(saves, initial);

    await Promise.all([
      session.execute({
        type: "spend-10",
        execute(draft) {
          draft.guild.funds -= 10;
        },
      }),
      session.execute({
        type: "spend-20",
        execute(draft) {
          draft.guild.funds -= 20;
        },
      }),
    ]);

    const snapshot = getGameSnapshot(session);
    expect(snapshot.guild.funds).toBe(70);
    expect(snapshot.revision).toBe(2);
    snapshot.guild.funds = 999;
    expect(getGameSnapshot(session).guild.funds).toBe(70);
  });

  it("returns null when the requested slot does not exist", async () => {
    await expect(
      GameSession.load(new MemorySaveRepository(), asBrandedId<"SaveSlotId">("missing")),
    ).resolves.toBeNull();
  });
});
