import { describe, expect, it } from "vitest";
import balance from "../fixtures/dungeon-balance/scarlet_monastery_graveyard.json";
import { loadBrowserContentRegistry } from "../../src/content/manifest";
import { asBrandedId } from "../../src/domain/shared/ids";

const content = loadBrowserContentRegistry();

describe("Scarlet Monastery Graveyard balance", () => {
  it("keeps the recommended required route in the agreed clear-rate band", () => {
    expect(balance.samplesPerScenario).toBeGreaterThanOrEqual(100_000);
    expect(balance.scenarios.standard.required.clearRate).toBeGreaterThanOrEqual(0.79);
    expect(balance.scenarios.standard.required.clearRate).toBeLessThanOrEqual(0.84);
    expect(balance.scenarios.standard["with-rare"].clearRate).toBeLessThan(
      balance.scenarios.standard.required.clearRate,
    );
  });

  it("keeps missing roles punitive while veteran clears remain viable", () => {
    expect(balance.scenarios["no-tank"].required.clearRate).toBeLessThan(0.01);
    expect(balance.scenarios["no-healing"].required.clearRate).toBeLessThan(0.01);
    expect(balance.scenarios["max-level"].required.clearRate).toBeGreaterThanOrEqual(0.9);
  });

  it("preserves three rare bosses and the short-run duration floor", () => {
    const dungeon = content.dungeonById.get(
      asBrandedId<"DungeonId">("scarlet_monastery_graveyard"),
    )!;
    expect(dungeon.route.filter((node) => node.type === "rare")).toHaveLength(3);
    expect(balance.scenarios["max-level"].required.durationSeconds).toBeGreaterThanOrEqual(
      dungeon.duration.baseSeconds * dungeon.duration.minimumRatio,
    );
  });
});
