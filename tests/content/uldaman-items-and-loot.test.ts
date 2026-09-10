import { describe, expect, it } from "vitest";
import { loadBrowserContentRegistry } from "../../src/content/manifest";
import { asBrandedId } from "../../src/domain/shared/ids";

const content = loadBrowserContentRegistry();

describe("Uldaman items and loot", () => {
  it("defines the complete 25-item boss pool and excludes quest objects", () => {
    const expectedSizes = new Map([
      ["uldaman_lost_dwarves", 6],
      ["uldaman_revelosh", 4],
      ["uldaman_ironaya", 3],
      ["uldaman_ancient_stone_keeper", 2],
      ["uldaman_galgann_firehammer", 4],
      ["uldaman_grimlok", 3],
      ["uldaman_archaedas", 3],
    ]);
    const itemIds = new Set<string>();

    for (const [lootTableId, size] of expectedSizes) {
      const table = content.lootTableById.get(asBrandedId<"LootTableId">(lootTableId))!;
      expect(table.items).toHaveLength(size);
      table.items.forEach(({ itemId }) => itemIds.add(String(itemId)));
    }

    expect(itemIds.size).toBe(25);
    expect(itemIds).not.toContain("8053");
    expect(itemIds).not.toContain("9399");
    expect(itemIds).not.toContain("7741");
    expect(
      content.lootTableById.get(asBrandedId<"LootTableId">("uldaman_lost_dwarves"))
        ?.guaranteedEquipmentDrops,
    ).toBe(3);
  });

  it("registers authentic random suffix pools for all seven random-enchant items", () => {
    const expectedSuffixCounts = new Map([
      ["9389", 12],
      ["9388", 14],
      ["9390", 8],
      ["9387", 9],
      ["9409", 14],
      ["9410", 10],
      ["11118", 23],
    ]);

    for (const [itemId, suffixCount] of expectedSuffixCounts) {
      expect(
        content.getRandomSuffixesForItem(asBrandedId<"ItemDefinitionId">(itemId)),
      ).toHaveLength(suffixCount);
    }
    expect(
      content.itemSuffixById.get(asBrandedId<"RandomSuffixId">("uldaman_11118_regeneration")),
    ).toMatchObject({
      relativeWeight: 1.9,
      tiers: [{ stats: { spell: { healthRegenPer5Seconds: 3 } } }],
    });
  });

  it("keeps all five authentic task reward appearances separate from boss loot", () => {
    for (const itemId of ["9626", "9627", "6723", "7673", "7888"]) {
      expect(content.itemById.has(asBrandedId<"ItemDefinitionId">(itemId))).toBe(true);
    }
    expect(content.itemById.get(asBrandedId<"ItemDefinitionId">("7673"))?.stats).toEqual(
      content.itemById.get(asBrandedId<"ItemDefinitionId">("7888"))?.stats,
    );
  });
});
