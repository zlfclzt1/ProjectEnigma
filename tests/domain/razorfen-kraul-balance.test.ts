import { describe, expect, it } from "vitest";
import balance from "../fixtures/dungeon-balance/razorfen_kraul.json";
import { loadBrowserContentRegistry } from "../../src/content/manifest";
import { asBrandedId } from "../../src/domain/shared/ids";

const content = loadBrowserContentRegistry();

describe("Razorfen Kraul vertical slice balance", () => {
  it("keeps the recommended speed route in the agreed clear-rate band", () => {
    expect(balance.samplesPerScenario).toBeGreaterThanOrEqual(100_000);
    expect(balance.scenarios.standard.required.clearRate).toBeGreaterThanOrEqual(0.79);
    expect(balance.scenarios.standard.required.clearRate).toBeLessThanOrEqual(0.84);
    expect(balance.scenarios.standard["with-optional"].clearRate).toBeLessThan(
      balance.scenarios.standard.required.clearRate,
    );
  });

  it("keeps missing roles meaningfully punitive", () => {
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

  it("preserves rare routes and the minimum duration floor", () => {
    const dungeon = content.dungeonById.get(asBrandedId<"DungeonId">("razorfen_kraul"))!;
    expect(dungeon.route.filter((node) => node.type === "optional")).toHaveLength(1);
    expect(dungeon.route.filter((node) => node.type === "rare")).toHaveLength(2);
    expect(balance.scenarios["max-level"].required.clearRate).toBeGreaterThanOrEqual(0.9);
    expect(balance.scenarios["max-level"].required.durationSeconds).toBeGreaterThanOrEqual(
      dungeon.duration.baseSeconds * dungeon.duration.minimumRatio,
    );
  });
});
