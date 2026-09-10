import { describe, expect, it } from "vitest";
import balance from "../fixtures/dungeon-balance/maraudon.json";
import { loadBrowserContentRegistry } from "../../src/content/manifest";
import { asBrandedId } from "../../src/domain/shared/ids";

const content = loadBrowserContentRegistry();

describe("Maraudon balance", () => {
  it("keeps the recommended-level main route in the level-60 roadmap band", () => {
    expect(balance.samplesPerScenario).toBeGreaterThanOrEqual(100_000);
    expect(balance.scenarios.standard.required.clearRate).toBeGreaterThanOrEqual(0.79);
    expect(balance.scenarios.standard.required.clearRate).toBeLessThanOrEqual(0.84);
    expect(balance.scenarios.standard.required.previewClearProbability).toBeCloseTo(
      balance.scenarios.standard.required.clearRate,
      2,
    );
  });

  it("keeps the full route viable while preserving minimum-level pressure", () => {
    expect(balance.scenarios.standard["with-optional"].durationSeconds).toBeGreaterThanOrEqual(
      1_700,
    );
    expect(balance.scenarios.standard["with-optional"].durationSeconds).toBeLessThanOrEqual(1_850);
    expect(balance.scenarios.standard["with-optional"].clearRate).toBeGreaterThanOrEqual(0.74);
    expect(balance.scenarios.standard["with-optional"].clearRate).toBeLessThanOrEqual(0.8);
    expect(balance.scenarios.overlevel["with-optional"].level).toBe(46);
    expect(balance.scenarios.overlevel["with-optional"].clearRate).toBeGreaterThanOrEqual(0.58);
    expect(balance.scenarios.overlevel["with-optional"].clearRate).toBeLessThanOrEqual(0.65);
  });

  it("preserves role pressure and uses level 60 for high-level repeat clears", () => {
    const dungeon = content.dungeonById.get(asBrandedId<"DungeonId">("maraudon"))!;
    const minimumDuration =
      dungeon.route.reduce(
        (sum, node) => sum + content.encounterById.get(node.encounterId)!.stageSeconds,
        0,
      ) * dungeon.duration.minimumRatio;

    expect(balance.scenarios["no-tank"].required.clearRate).toBeLessThan(0.001);
    expect(balance.scenarios["no-healing"].required.clearRate).toBeLessThan(0.001);
    expect(balance.scenarios["max-level"]["with-optional"].level).toBe(60);
    expect(balance.scenarios["max-level"]["with-optional"].clearRate).toBeGreaterThanOrEqual(0.8);
    expect(balance.scenarios["max-level"]["with-optional"].durationSeconds).toBeGreaterThanOrEqual(
      minimumDuration,
    );
  });
});
