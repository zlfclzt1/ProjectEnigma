import { describe, expect, it } from "vitest";
import balance from "../fixtures/dungeon-balance/blackrock_depths_shadowforge_city.json";
import { loadBrowserContentRegistry } from "../../src/content/manifest";
import { asBrandedId } from "../../src/domain/shared/ids";

const content = loadBrowserContentRegistry();

describe("Blackrock Depths Shadowforge City balance", () => {
  it("keeps the recommended-level final route in its progression band", () => {
    expect(balance.samplesPerScenario).toBeGreaterThanOrEqual(100_000);
    expect(balance.scenarios.standard.required.clearRate).toBeGreaterThanOrEqual(0.79);
    expect(balance.scenarios.standard.required.clearRate).toBeLessThanOrEqual(0.83);
    expect(balance.scenarios.standard.required.previewClearProbability).toBeCloseTo(
      balance.scenarios.standard.required.clearRate,
      2,
    );
    expect(balance.scenarios.standard.required.durationSeconds).toBeGreaterThanOrEqual(2_450);
    expect(balance.scenarios.standard.required.durationSeconds).toBeLessThanOrEqual(2_600);
  });

  it("keeps the full active route viable while preserving level-53 pressure", () => {
    expect(balance.scenarios.standard["with-optional"].durationSeconds).toBeGreaterThanOrEqual(
      3_300,
    );
    expect(balance.scenarios.standard["with-optional"].durationSeconds).toBeLessThanOrEqual(3_450);
    expect(balance.scenarios.standard["with-optional"].clearRate).toBeGreaterThanOrEqual(0.68);
    expect(balance.scenarios.standard["with-optional"].clearRate).toBeLessThanOrEqual(0.73);
    expect(balance.scenarios.overlevel["with-optional"].level).toBe(53);
    expect(balance.scenarios.overlevel["with-optional"].clearRate).toBeGreaterThanOrEqual(0.51);
    expect(balance.scenarios.overlevel["with-optional"].clearRate).toBeLessThanOrEqual(0.57);
  });

  it("preserves role pressure and the high-level repeat-clear duration floor", () => {
    const dungeon = content.dungeonById.get(
      asBrandedId<"DungeonId">("blackrock_depths_shadowforge_city"),
    )!;
    const minimumDuration = dungeon.duration.baseSeconds * dungeon.duration.minimumRatio;

    expect(balance.scenarios["no-tank"].required.clearRate).toBeLessThan(0.001);
    expect(balance.scenarios["no-healing"].required.clearRate).toBeLessThan(0.001);
    expect(balance.scenarios["max-level"]["with-optional"].level).toBe(60);
    expect(balance.scenarios["max-level"]["with-optional"].clearRate).toBeGreaterThanOrEqual(0.8);
    expect(balance.scenarios["max-level"]["with-optional"].durationSeconds).toBeGreaterThanOrEqual(
      minimumDuration,
    );
  });
});
