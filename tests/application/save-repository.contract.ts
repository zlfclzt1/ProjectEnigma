import { expect, it } from "vitest";
import {
  InvalidInitialRevisionError,
  SaveSlotAlreadyExistsError,
  type SaveRepository,
} from "../../src/application/ports/save-repository";
import { asBrandedId } from "../../src/domain/shared/ids";
import { createGameStateFixture } from "../helpers/game-state-v2-factory";

export interface SaveRepositoryHarness {
  readonly repository: SaveRepository;
  dispose(): Promise<void>;
}

export function runSaveRepositoryContract(
  createHarness: () => Promise<SaveRepositoryHarness> | SaveRepositoryHarness,
): void {
  it("creates and asynchronously loads an isolated save", async () => {
    const harness = await createHarness();
    try {
      const initial = createGameStateFixture();
      await harness.repository.create(initial);
      initial.guild.funds = 999;

      const loaded = await harness.repository.load(initial.slotId);
      expect(loaded?.guild.funds).toBe(100);

      loaded!.guild.funds = 555;
      expect((await harness.repository.load(initial.slotId))?.guild.funds).toBe(100);
    } finally {
      await harness.dispose();
    }
  });

  it("rejects duplicate slots and non-zero initial revisions", async () => {
    const harness = await createHarness();
    try {
      const initial = createGameStateFixture();
      await harness.repository.create(initial);
      await expect(harness.repository.create(initial)).rejects.toBeInstanceOf(
        SaveSlotAlreadyExistsError,
      );
      await expect(
        harness.repository.create(
          createGameStateFixture({
            slotId: asBrandedId<"SaveSlotId">("slot_2"),
            revision: 1,
          }),
        ),
      ).rejects.toBeInstanceOf(InvalidInitialRevisionError);
    } finally {
      await harness.dispose();
    }
  });

  it("increments revisions without mutating the caller state", async () => {
    const harness = await createHarness();
    try {
      const state = createGameStateFixture();
      await harness.repository.create(state);
      state.guild.funds = 75;

      const result = await harness.repository.save(state, 0);
      expect(result.status).toBe("saved");
      if (result.status !== "saved") throw new Error("Expected save to succeed");
      expect(result.state.revision).toBe(1);
      expect(result.state.guild.funds).toBe(75);
      expect(state.revision).toBe(0);

      result.state.guild.funds = 1;
      expect((await harness.repository.load(state.slotId))?.guild.funds).toBe(75);
    } finally {
      await harness.dispose();
    }
  });

  it("persists an item instance random suffix unchanged", async () => {
    const harness = await createHarness();
    try {
      const state = createGameStateFixture();
      const instance = Object.values(state.itemInstances)[0]!;
      instance.randomSuffixId = asBrandedId<"RandomSuffixId">("prototype_of_readiness");
      await harness.repository.create(state);

      const loaded = await harness.repository.load(state.slotId);
      const loadedInstance = loaded?.itemInstances[instance.id] as
        { randomSuffixId?: unknown } | undefined;

      expect(loaded?.saveVersion).toBe(5);
      expect(loadedInstance?.randomSuffixId).toBe("prototype_of_readiness");
    } finally {
      await harness.dispose();
    }
  });

  it("reports stale revisions without overwriting the current save", async () => {
    const harness = await createHarness();
    try {
      const state = createGameStateFixture();
      await harness.repository.create(state);
      const first = await harness.repository.save(state, 0);
      expect(first.status).toBe("saved");

      state.guild.funds = 1;
      await expect(harness.repository.save(state, 0)).resolves.toEqual({
        status: "conflict",
        expectedRevision: 0,
        actualRevision: 1,
      });
      expect((await harness.repository.load(state.slotId))?.guild.funds).toBe(100);
    } finally {
      await harness.dispose();
    }
  });

  it("reports a missing slot", async () => {
    const harness = await createHarness();
    try {
      const missing = createGameStateFixture({
        slotId: asBrandedId<"SaveSlotId">("missing"),
      });
      await expect(harness.repository.save(missing, 0)).resolves.toEqual({
        status: "not-found",
        expectedRevision: 0,
      });
      await expect(harness.repository.load(missing.slotId)).resolves.toBeNull();
    } finally {
      await harness.dispose();
    }
  });
}
