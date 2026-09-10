import { describe, expect, it } from "vitest";
import balance from "../fixtures/dungeon-balance/scarlet_monastery_library.json";
import { loadBrowserContentRegistry } from "../../src/content/manifest";
import { asBrandedId } from "../../src/domain/shared/ids";

const content = loadBrowserContentRegistry();

describe("Scarlet Monastery Library balance", () => {
  it("keeps the direct Doan route in the agreed clear-rate band", () => {
    expect(balance.samplesPerScenario).toBeGreaterThanOrEqual(100_000);
    expect(balance.scenarios.standard.required.clearRate).toBeGreaterThanOrEqual(0.79);
    expect(balance.scenarios.standard.required.clearRate).toBeLessThanOrEqual(0.84);
    expect(balance.scenarios.standard["with-optional"].clearRate).toBeLessThan(
      balance.scenarios.standard.required.clearRate,
    );
  });

  it("keeps composition pressure and Loksey's side-room cost meaningful", () => {
    expect(balance.scenarios["no-tank"].required.clearRate).toBeLessThan(
      balance.scenarios.standard.required.clearRate,
    );
    expect(balance.scenarios["no-healing"].required.clearRate).toBeLessThan(
      balance.scenarios.standard.required.clearRate,
    );
    expect(balance.scenarios.standard["with-optional"].durationSeconds).toBeGreaterThan(
      balance.scenarios.standard.required.durationSeconds,
    );
  });

  it("preserves repeat farming and the duration floor at level 45", () => {
    const dungeon = content.dungeonById.get(asBrandedId<"DungeonId">("scarlet_monastery_library"))!;
    expect(balance.scenarios["max-level"].required.clearRate).toBeGreaterThanOrEqual(0.84);
    expect(balance.scenarios["max-level"].required.durationSeconds).toBeGreaterThanOrEqual(
      dungeon.route
        .filter((node) => node.type === "required")
        .reduce((sum, node) => sum + content.encounterById.get(node.encounterId)!.stageSeconds, 0) *
        dungeon.duration.minimumRatio,
    );
  });
});
