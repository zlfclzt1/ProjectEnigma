import { describe, expect, it } from "vitest";
import balance from "../fixtures/dungeon-balance/scarlet_monastery_cathedral.json";
import { loadBrowserContentRegistry } from "../../src/content/manifest";
import { asBrandedId } from "../../src/domain/shared/ids";

const content = loadBrowserContentRegistry();

describe("Scarlet Monastery Cathedral balance", () => {
  it("keeps the two-stage required route in the agreed clear-rate band", () => {
    expect(balance.samplesPerScenario).toBeGreaterThanOrEqual(100_000);
    expect(balance.scenarios.standard.required.clearRate).toBeGreaterThanOrEqual(0.82);
    expect(balance.scenarios.standard.required.clearRate).toBeLessThanOrEqual(0.86);
  });

  it("makes Fairbanks a meaningful optional cost without overwhelming the main route", () => {
    expect(balance.scenarios.standard["with-optional"].clearRate).toBeLessThan(
      balance.scenarios.standard.required.clearRate,
    );
    expect(balance.scenarios.standard["with-optional"].clearRate).toBeGreaterThanOrEqual(0.76);
    expect(balance.scenarios.standard["with-optional"].durationSeconds).toBeGreaterThan(
      balance.scenarios.standard.required.durationSeconds,
    );
  });

  it("preserves role pressure, repeat farming, and the eighteen-minute full-route target", () => {
    const dungeon = content.dungeonById.get(
      asBrandedId<"DungeonId">("scarlet_monastery_cathedral"),
    )!;
    const minimumDuration =
      dungeon.route.reduce(
        (sum, node) => sum + content.encounterById.get(node.encounterId)!.stageSeconds,
        0,
      ) * dungeon.duration.minimumRatio;

    expect(balance.scenarios["no-tank"].required.clearRate).toBeLessThan(0.01);
    expect(balance.scenarios["no-healing"].required.clearRate).toBeLessThan(0.01);
    expect(balance.scenarios["max-level"].required.clearRate).toBeGreaterThanOrEqual(0.83);
    expect(balance.scenarios.standard["with-optional"].durationSeconds).toBeGreaterThanOrEqual(990);
    expect(balance.scenarios.standard["with-optional"].durationSeconds).toBeLessThanOrEqual(1_100);
    expect(balance.scenarios["max-level"]["with-optional"].durationSeconds).toBeGreaterThanOrEqual(
      minimumDuration,
    );
  });
});
