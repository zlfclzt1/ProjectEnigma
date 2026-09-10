import { describe, expect, it } from "vitest";
import balance from "../fixtures/dungeon-balance/uldaman.json";
import { loadBrowserContentRegistry } from "../../src/content/manifest";
import { asBrandedId } from "../../src/domain/shared/ids";

const content = loadBrowserContentRegistry();

describe("Uldaman balance", () => {
  it("keeps the recommended-level required route in the agreed clear-rate band", () => {
    expect(balance.samplesPerScenario).toBeGreaterThanOrEqual(100_000);
    expect(balance.scenarios.standard.required.clearRate).toBeGreaterThanOrEqual(0.84);
    expect(balance.scenarios.standard.required.clearRate).toBeLessThanOrEqual(0.88);
    expect(balance.scenarios.standard.required.previewClearProbability).toBeCloseTo(
      balance.scenarios.standard.required.clearRate,
      2,
    );
  });

  it("keeps the full route viable at level 45 and punishing at level 42", () => {
    expect(balance.scenarios.standard["with-optional"].durationSeconds).toBeGreaterThan(
      balance.scenarios.standard.required.durationSeconds,
    );
    expect(balance.scenarios.standard["with-optional"].clearRate).toBeGreaterThanOrEqual(0.82);
    expect(balance.scenarios.overlevel["with-optional"].clearRate).toBeGreaterThanOrEqual(0.7);
    expect(balance.scenarios.overlevel["with-optional"].clearRate).toBeLessThanOrEqual(0.79);
    expect(balance.scenarios.overlevel["with-optional"].clearRate).toBeLessThan(
      balance.scenarios.overlevel.required.clearRate,
    );
  });

  it("preserves role pressure and the long-route duration floor", () => {
    const dungeon = content.dungeonById.get(asBrandedId<"DungeonId">("uldaman"))!;
    const minimumDuration =
      dungeon.route.reduce(
        (sum, node) => sum + content.encounterById.get(node.encounterId)!.stageSeconds,
        0,
      ) * dungeon.duration.minimumRatio;

    expect(balance.scenarios["no-tank"].required.clearRate).toBeLessThan(0.001);
    expect(balance.scenarios["no-healing"].required.clearRate).toBeLessThan(0.001);
    expect(balance.scenarios.standard["with-optional"].durationSeconds).toBeGreaterThanOrEqual(
      1_700,
    );
    expect(balance.scenarios.standard["with-optional"].durationSeconds).toBeLessThanOrEqual(1_900);
    expect(balance.scenarios["max-level"]["with-optional"].durationSeconds).toBeGreaterThanOrEqual(
      minimumDuration,
    );
  });
});
