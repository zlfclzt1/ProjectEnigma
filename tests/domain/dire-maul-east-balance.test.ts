import { describe, expect, it } from "vitest";
import balance from "../fixtures/dungeon-balance/dire_maul_east.json";
import { loadBrowserContentRegistry } from "../../src/content/manifest";
import { asBrandedId } from "../../src/domain/shared/ids";

const content = loadBrowserContentRegistry();

describe("Dire Maul East balance", () => {
  it("keeps the first-pass level-56 main route deliberately demanding", () => {
    expect(balance.samplesPerScenario).toBeGreaterThanOrEqual(100_000);
    expect(balance.scenarios.standard.required.clearRate).toBeGreaterThanOrEqual(0.53);
    expect(balance.scenarios.standard.required.clearRate).toBeLessThanOrEqual(0.58);
    expect(balance.scenarios.standard.required.previewClearProbability).toBeCloseTo(
      balance.scenarios.standard.required.clearRate,
      2,
    );
    expect(balance.scenarios.standard.required.durationSeconds).toBeGreaterThanOrEqual(2_150);
    expect(balance.scenarios.standard.required.durationSeconds).toBeLessThanOrEqual(2_250);
  });

  it("makes the two player-selected branches materially longer and riskier", () => {
    expect(balance.scenarios.standard["with-optional"].durationSeconds).toBeGreaterThanOrEqual(
      3_150,
    );
    expect(balance.scenarios.standard["with-optional"].durationSeconds).toBeLessThanOrEqual(3_300);
    expect(balance.scenarios.standard["with-optional"].clearRate).toBeGreaterThanOrEqual(0.34);
    expect(balance.scenarios.standard["with-optional"].clearRate).toBeLessThanOrEqual(0.39);
    expect(balance.scenarios.standard["with-optional"].clearRate).toBeLessThan(
      balance.scenarios.standard.required.clearRate - 0.15,
    );
  });

  it("preserves mandatory role pressure and the repeat-clear duration floor", () => {
    const dungeon = content.dungeonById.get(asBrandedId<"DungeonId">("dire_maul_east"))!;
    const minimumDuration = dungeon.duration.baseSeconds * dungeon.duration.minimumRatio;

    expect(balance.scenarios["no-tank"].required.clearRate).toBeLessThan(0.001);
    expect(balance.scenarios["no-healing"].required.clearRate).toBeLessThan(0.001);
    expect(balance.scenarios["max-level"]["with-optional"].clearRate).toBeGreaterThanOrEqual(0.6);
    expect(balance.scenarios["max-level"]["with-optional"].durationSeconds).toBeGreaterThanOrEqual(
      minimumDuration,
    );
  });
});
