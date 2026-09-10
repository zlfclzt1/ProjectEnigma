import { describe, expect, it } from "vitest";
import balance from "../fixtures/dungeon-balance/gnomeregan.json";
import { loadBrowserContentRegistry } from "../../src/content/manifest";
import { asBrandedId } from "../../src/domain/shared/ids";

const content = loadBrowserContentRegistry();

describe("Gnomeregan vertical slice balance", () => {
  it("keeps the recommended required route in the agreed clear-rate band", () => {
    expect(balance.samplesPerScenario).toBeGreaterThanOrEqual(100_000);
    expect(balance.scenarios.standard.required.clearRate).toBeGreaterThanOrEqual(0.79);
    expect(balance.scenarios.standard.required.clearRate).toBeLessThanOrEqual(0.84);
    expect(balance.scenarios.standard["with-rare"].clearRate).toBeLessThan(
      balance.scenarios.standard.required.clearRate,
    );
  });

  it("keeps composition pressure and the minimum duration floor meaningful", () => {
    expect(balance.scenarios["no-tank"].required.clearRate).toBeLessThan(
      balance.scenarios.standard.required.clearRate,
    );
    expect(balance.scenarios["no-healing"].required.clearRate).toBeLessThan(
      balance.scenarios.standard.required.clearRate,
    );
    expect(balance.scenarios["no-tank"].required.durationSeconds).toBeGreaterThan(
      balance.scenarios.standard.required.durationSeconds,
    );
  });

  it("preserves the long-run speed floor and hidden rare route", () => {
    const dungeon = content.dungeonById.get(asBrandedId<"DungeonId">("gnomeregan"))!;
    expect(dungeon.route.filter((node) => node.type === "rare")).toHaveLength(1);
    expect(balance.scenarios["max-level"].required.clearRate).toBeGreaterThanOrEqual(0.9);
    expect(balance.scenarios["max-level"].required.durationSeconds).toBeGreaterThanOrEqual(
      dungeon.duration.baseSeconds * dungeon.duration.minimumRatio,
    );
  });
});
