import { expect, it } from "vitest";
import {
  InvalidInitialRevisionError,
  SaveSlotAlreadyExistsError,
  type SaveRepository,
} from "../../src/application/ports/save-repository";
import { asBrandedId } from "../../src/domain/shared/ids";
import { createGameStateV2Fixture } from "../helpers/game-state-v2-factory";

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
      const initial = createGameStateV2Fixture();
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
      const initial = createGameStateV2Fixture();
      await harness.repository.create(initial);
      await expect(harness.repository.create(initial)).rejects.toBeInstanceOf(
        SaveSlotAlreadyExistsError,
      );
      await expect(
        harness.repository.create(
          createGameStateV2Fixture({
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
      const state = createGameStateV2Fixture();
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

  it("reports stale revisions without overwriting the current save", async () => {
    const harness = await createHarness();
    try {
      const state = createGameStateV2Fixture();
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
      const missing = createGameStateV2Fixture({
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
