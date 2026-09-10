import { describe, expect, it } from "vitest";
import balance from "../fixtures/dungeon-balance/the_stockade.json";
import { loadBrowserContentRegistry } from "../../src/content/manifest";
import { asBrandedId } from "../../src/domain/shared/ids";

const content = loadBrowserContentRegistry();

describe("The Stockade balance", () => {
  it("keeps the recommended route in the agreed clear-rate band", () => {
    expect(balance.samplesPerScenario).toBeGreaterThanOrEqual(100_000);
    expect(balance.scenarios.standard.required.clearRate).toBeGreaterThanOrEqual(0.79);
    expect(balance.scenarios.standard.required.clearRate).toBeLessThanOrEqual(0.84);
    expect(balance.scenarios.standard["with-rare"].clearRate).toBeLessThan(
      balance.scenarios.standard.required.clearRate,
    );
  });

  it("keeps composition pressure without breaking veteran clears", () => {
    expect(balance.scenarios["no-tank"].required.clearRate).toBeLessThan(
      balance.scenarios.standard.required.clearRate,
    );
    expect(balance.scenarios["no-healing"].required.clearRate).toBeLessThan(
      balance.scenarios.standard.required.clearRate,
    );
    expect(balance.scenarios["max-level"].required.clearRate).toBeGreaterThanOrEqual(0.98);
  });

  it("preserves the short-run duration floor and hidden rare route", () => {
    const dungeon = content.dungeonById.get(asBrandedId<"DungeonId">("the_stockade"))!;
    expect(dungeon.route.filter((node) => node.type === "rare")).toHaveLength(1);
    expect(balance.scenarios["max-level"].required.durationSeconds).toBeGreaterThanOrEqual(
      dungeon.duration.baseSeconds * dungeon.duration.minimumRatio,
    );
  });
});
