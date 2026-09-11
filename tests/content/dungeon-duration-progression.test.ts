import { describe, expect, it } from "vitest";
import { loadBrowserContentRegistry } from "../../src/content/manifest";
import { asBrandedId } from "../../src/domain/shared/ids";

const content = loadBrowserContentRegistry();

const progression = [
  ["ragefire_chasm", 20],
  ["wailing_caverns", 22],
  ["deadmines", 24],
  ["shadowfang_keep", 26],
  ["blackfathom_deeps", 28],
  ["the_stockade", 30],
  ["gnomeregan", 32],
  ["razorfen_kraul", 34],
  ["scarlet_monastery_graveyard", 36],
  ["scarlet_monastery_library", 38],
  ["scarlet_monastery_armory", 39],
  ["scarlet_monastery_cathedral", 41],
  ["razorfen_downs", 43],
  ["uldaman", 45],
  ["zulfarrak", 47],
  ["maraudon", 49],
  ["sunken_temple", 51],
  ["blackrock_depths_detention_block", 53],
  ["blackrock_depths_shadowforge_city", 55],
] as const;

describe("dungeon duration progression", () => {
  it("follows the twenty-to-fifty-five-minute near-linear curve", () => {
    const durations = progression.map(([id, minutes]) => {
      const dungeon = content.dungeonById.get(asBrandedId<"DungeonId">(id));
      expect(dungeon, id).toBeDefined();
      expect(dungeon!.duration.baseSeconds, id).toBe(minutes * 60);
      return dungeon!.duration.baseSeconds;
    });

    expect(durations[0]).toBe(20 * 60);
    expect(durations.at(-1)).toBe(55 * 60);
    for (let index = 1; index < durations.length; index += 1) {
      expect(durations[index]! - durations[index - 1]!).toBeGreaterThanOrEqual(60);
      expect(durations[index]! - durations[index - 1]!).toBeLessThanOrEqual(120);
    }
  });
});
