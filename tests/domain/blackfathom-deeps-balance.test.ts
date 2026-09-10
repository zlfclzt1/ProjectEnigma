import { describe, expect, it } from "vitest";
import balance from "../fixtures/dungeon-balance/blackfathom_deeps.json";
import { loadBrowserContentRegistry } from "../../src/content/manifest";
import { asBrandedId } from "../../src/domain/shared/ids";

const content = loadBrowserContentRegistry();

describe("Blackfathom Deeps vertical slice balance", () => {
  it("keeps the recommended required route in the agreed clear-rate band", () => {
    expect(balance.samplesPerScenario).toBeGreaterThanOrEqual(100_000);
    expect(balance.scenarios.standard.required.clearRate).toBeGreaterThanOrEqual(0.79);
    expect(balance.scenarios.standard.required.clearRate).toBeLessThanOrEqual(0.84);
    expect(balance.scenarios.standard["with-optional"].clearRate).toBeLessThan(
      balance.scenarios.standard.required.clearRate,
    );
  });

  it("keeps composition pressure and the minimum duration floor meaningful", () => {
    expect(balance.scenarios["no-tank"].required.clearRate).toBeLessThan(
      balance.scenarios.standard.required.clearRate,
    );
    expect(balance.scenarios["no-tank"].required.durationSeconds).toBeGreaterThan(
      balance.scenarios.standard.required.durationSeconds,
    );
  });

  it("contains the two optional bosses and preserves max-level speed floors", () => {
    const dungeon = content.dungeonById.get(asBrandedId<"DungeonId">("blackfathom_deeps"))!;
    expect(dungeon.route.filter((node) => node.type === "optional")).toHaveLength(2);
    expect(balance.scenarios["max-level"].required.clearRate).toBeGreaterThanOrEqual(0.99);
    expect(balance.scenarios["max-level"].required.durationSeconds).toBeGreaterThanOrEqual(
      dungeon.duration.baseSeconds * dungeon.duration.minimumRatio,
    );
  });
});
