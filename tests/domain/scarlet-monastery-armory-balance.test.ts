import { describe, expect, it } from "vitest";
import balance from "../fixtures/dungeon-balance/scarlet_monastery_armory.json";
import { loadBrowserContentRegistry } from "../../src/content/manifest";
import { asBrandedId } from "../../src/domain/shared/ids";

const content = loadBrowserContentRegistry();

describe("Scarlet Monastery Armory balance", () => {
  it("keeps the recommended Herod clear rate in the agreed band", () => {
    expect(balance.samplesPerScenario).toBeGreaterThanOrEqual(100_000);
    expect(balance.scenarios.standard.required.clearRate).toBeGreaterThanOrEqual(0.82);
    expect(balance.scenarios.standard.required.clearRate).toBeLessThanOrEqual(0.86);
  });

  it("makes a real tank and healer necessary without hard-gating utility classes", () => {
    expect(balance.scenarios["no-tank"].required.clearRate).toBeLessThan(0.08);
    expect(balance.scenarios["no-healing"].required.clearRate).toBeLessThan(0.08);
    expect(balance.scenarios.standard.required.previewClearProbability).toBeGreaterThan(0.8);
  });

  it("supports level-45 repeat farming near the thirty-nine-minute target and above the floor", () => {
    const dungeon = content.dungeonById.get(asBrandedId<"DungeonId">("scarlet_monastery_armory"))!;
    const minimumDuration =
      content.encounterById.get(asBrandedId<"EncounterId">("scarlet_armory_herod"))!.stageSeconds *
      dungeon.duration.minimumRatio;

    expect(balance.scenarios["max-level"].required.clearRate).toBeGreaterThanOrEqual(0.85);
    expect(balance.scenarios.standard.required.durationSeconds).toBeGreaterThanOrEqual(2_400);
    expect(balance.scenarios.standard.required.durationSeconds).toBeLessThanOrEqual(2_550);
    expect(balance.scenarios["max-level"].required.durationSeconds).toBeGreaterThanOrEqual(
      minimumDuration,
    );
  });
});
