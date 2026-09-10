import { describe, expect, it } from "vitest";
import balance from "../fixtures/dungeon-balance/blackrock_depths_detention_block.json";
import { loadBrowserContentRegistry } from "../../src/content/manifest";
import { asBrandedId } from "../../src/domain/shared/ids";

const content = loadBrowserContentRegistry();

describe("Blackrock Depths Detention Block balance", () => {
  it("keeps the recommended-level key route in its progression band", () => {
    expect(balance.samplesPerScenario).toBeGreaterThanOrEqual(100_000);
    expect(balance.scenarios.standard.required.clearRate).toBeGreaterThanOrEqual(0.77);
    expect(balance.scenarios.standard.required.clearRate).toBeLessThanOrEqual(0.82);
    expect(balance.scenarios.standard.required.previewClearProbability).toBeCloseTo(
      balance.scenarios.standard.required.clearRate,
      2,
    );
  });

  it("keeps the full active route viable while preserving level-51 pressure", () => {
    expect(balance.scenarios.standard["with-optional"].durationSeconds).toBeGreaterThanOrEqual(
      2_350,
    );
    expect(balance.scenarios.standard["with-optional"].durationSeconds).toBeLessThanOrEqual(2_480);
    expect(balance.scenarios.standard["with-optional"].clearRate).toBeGreaterThanOrEqual(0.67);
    expect(balance.scenarios.standard["with-optional"].clearRate).toBeLessThanOrEqual(0.72);
    expect(balance.scenarios.overlevel["with-optional"].level).toBe(51);
    expect(balance.scenarios.overlevel["with-optional"].clearRate).toBeGreaterThanOrEqual(0.48);
    expect(balance.scenarios.overlevel["with-optional"].clearRate).toBeLessThanOrEqual(0.54);
  });

  it("preserves role pressure and the high-level repeat-clear duration floor", () => {
    const dungeon = content.dungeonById.get(
      asBrandedId<"DungeonId">("blackrock_depths_detention_block"),
    )!;
    const minimumDuration = dungeon.duration.baseSeconds * dungeon.duration.minimumRatio;

    expect(balance.scenarios["no-tank"].required.clearRate).toBeLessThan(0.001);
    expect(balance.scenarios["no-healing"].required.clearRate).toBeLessThan(0.001);
    expect(balance.scenarios["max-level"]["with-optional"].level).toBe(60);
    expect(balance.scenarios["max-level"]["with-optional"].clearRate).toBeGreaterThanOrEqual(0.76);
    expect(balance.scenarios["max-level"]["with-optional"].durationSeconds).toBeGreaterThanOrEqual(
      minimumDuration,
    );
  });
});
