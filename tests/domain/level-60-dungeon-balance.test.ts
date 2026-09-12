import { describe, expect, it } from "vitest";
import { loadBrowserContentRegistry } from "../../src/content/manifest";
import { asBrandedId } from "../../src/domain/shared/ids";
import lowerBlackrockSpire from "../fixtures/dungeon-balance/lower_blackrock_spire.json";
import direMaulEast from "../fixtures/dungeon-balance/dire_maul_east.json";
import direMaulWest from "../fixtures/dungeon-balance/dire_maul_west.json";
import direMaulNorth from "../fixtures/dungeon-balance/dire_maul_north.json";
import scholomance from "../fixtures/dungeon-balance/scholomance.json";
import stratholmeLive from "../fixtures/dungeon-balance/stratholme_live.json";
import stratholmeUndead from "../fixtures/dungeon-balance/stratholme_undead.json";
import upperBlackrockSpire from "../fixtures/dungeon-balance/upper_blackrock_spire.json";

const content = loadBrowserContentRegistry();
const fixtures = [
  lowerBlackrockSpire,
  direMaulEast,
  direMaulWest,
  direMaulNorth,
  scholomance,
  stratholmeLive,
  stratholmeUndead,
  upperBlackrockSpire,
] as const;

describe("60 级副本终局难度矩阵", () => {
  it.each(fixtures.map((fixture) => [fixture.dungeonId, fixture] as const))(
    "%s 保存了 100,000 样本和完整场景",
    (dungeonId, fixture) => {
      expect(fixture.samplesPerScenario).toBeGreaterThanOrEqual(100_000);
      for (const scenario of [
        "standard",
        "no-tank",
        "no-healing",
        "overlevel",
        "max-level",
        "speed-run",
      ] as const) {
        expect(Object.keys(fixture.scenarios[scenario])).toEqual([
          "required",
          "with-optional",
          "with-rare",
        ]);
        expect(fixture.scenarios[scenario].required.simulatedRuns).toBe(fixture.samplesPerScenario);
      }
      const dungeon = content.dungeonById.get(asBrandedId<"DungeonId">(dungeonId));
      expect(dungeon).toBeDefined();
      const floor = dungeon!.duration.baseSeconds * dungeon!.duration.minimumRatio;
      expect(fixture.scenarios.standard.required.durationSeconds).toBeGreaterThanOrEqual(floor);
    },
  );

  it.each(fixtures.map((fixture) => [fixture.dungeonId, fixture] as const))(
    "%s 对缺坦克/缺治疗保持显著惩罚",
    (_dungeonId, fixture) => {
      const standard = fixture.scenarios.standard.required.clearRate;
      expect(fixture.scenarios["no-tank"].required.clearRate).toBeLessThan(standard);
      expect(fixture.scenarios["no-healing"].required.clearRate).toBeLessThan(standard);
    },
  );
});
