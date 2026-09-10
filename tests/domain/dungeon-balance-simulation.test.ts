import { describe, expect, it } from "vitest";
import { simulateDungeon } from "../../scripts/dungeon-balance-simulation";
import { loadBrowserContentRegistry } from "../../src/content/manifest";
import { asBrandedId } from "../../src/domain/shared/ids";

describe("single dungeon balance simulation", () => {
  it("covers the required party and route variants deterministically", () => {
    const content = loadBrowserContentRegistry();
    const dungeonId = asBrandedId<"DungeonId">("ragefire_chasm");
    const first = simulateDungeon(content, dungeonId, 10, "test-seed");
    const second = simulateDungeon(content, dungeonId, 10, "test-seed");
    expect(first).toEqual(second);
    expect(Object.keys(first.scenarios)).toEqual([
      "standard",
      "no-tank",
      "no-healing",
      "overlevel",
      "max-level",
      "speed-run",
    ]);
    expect(Object.keys(first.scenarios.standard)).toEqual([
      "required",
      "with-optional",
      "with-rare",
    ]);
    expect(first.scenarios.standard.required.simulatedRuns).toBe(10);
  }, 30_000);
});
