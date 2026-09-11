import { describe, expect, it } from "vitest";
import balance from "../fixtures/dungeon-balance/zulfarrak.json";
import { loadBrowserContentRegistry } from "../../src/content/manifest";
import { asBrandedId } from "../../src/domain/shared/ids";

const content = loadBrowserContentRegistry();

describe("Zul'Farrak balance", () => {
  it("keeps the recommended-level required route in the stage-end clear-rate band", () => {
    expect(balance.samplesPerScenario).toBeGreaterThanOrEqual(100_000);
    expect(balance.scenarios.standard.required.clearRate).toBeGreaterThanOrEqual(0.85);
    expect(balance.scenarios.standard.required.clearRate).toBeLessThanOrEqual(0.88);
    expect(balance.scenarios.standard.required.previewClearProbability).toBeCloseTo(
      balance.scenarios.standard.required.clearRate,
      2,
    );
  });

  it("keeps optional and rare routes viable while making the level-42 full route riskier", () => {
    expect(balance.scenarios.standard["with-optional"].clearRate).toBeGreaterThanOrEqual(0.82);
    expect(balance.scenarios.standard["with-rare"].clearRate).toBeGreaterThanOrEqual(0.79);
    expect(balance.scenarios.standard["with-rare"].clearRate).toBeLessThan(
      balance.scenarios.standard.required.clearRate,
    );
    expect(balance.scenarios.overlevel["with-optional"].clearRate).toBeGreaterThanOrEqual(0.74);
    expect(balance.scenarios.overlevel["with-optional"].clearRate).toBeLessThanOrEqual(0.79);
    expect(balance.scenarios.overlevel["with-optional"].clearRate).toBeLessThan(
      balance.scenarios.overlevel.required.clearRate,
    );
  });

  it("preserves role pressure, route cost, and the configured duration floor", () => {
    const dungeon = content.dungeonById.get(asBrandedId<"DungeonId">("zulfarrak"))!;
    const minimumDuration =
      dungeon.route.reduce(
        (sum, node) => sum + content.encounterById.get(node.encounterId)!.stageSeconds,
        0,
      ) * dungeon.duration.minimumRatio;

    expect(balance.scenarios["no-tank"].required.clearRate).toBeLessThan(0.001);
    expect(balance.scenarios["no-healing"].required.clearRate).toBeLessThan(0.001);
    expect(balance.scenarios.standard["with-optional"].durationSeconds).toBeGreaterThan(
      balance.scenarios.standard.required.durationSeconds,
    );
    expect(balance.scenarios.standard["with-rare"].durationSeconds).toBeGreaterThan(
      balance.scenarios.standard.required.durationSeconds,
    );
    expect(balance.scenarios.standard["with-optional"].durationSeconds).toBeGreaterThanOrEqual(
      2_350,
    );
    expect(balance.scenarios.standard["with-optional"].durationSeconds).toBeLessThanOrEqual(2_500);
    expect(balance.scenarios["max-level"]["with-optional"].durationSeconds).toBeGreaterThanOrEqual(
      minimumDuration,
    );
  });
});
