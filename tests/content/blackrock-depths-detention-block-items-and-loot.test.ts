import { describe, expect, it } from "vitest";
import { loadBrowserContentRegistry } from "../../src/content/manifest";
import { asBrandedId } from "../../src/domain/shared/ids";

const content = loadBrowserContentRegistry();

describe("Blackrock Depths Detention Block items and loot", () => {
  it("defines every authentic boss and vault pool with one guaranteed equipment drop", () => {
    const expectedSizes = new Map([
      ["brd_detention_lord_roccor", 4],
      ["brd_detention_high_interrogator_gerstahn", 4],
      ["brd_detention_houndmaster_grebmar", 4],
      ["brd_detention_arena_gorosh", 4],
      ["brd_detention_arena_grizzle", 4],
      ["brd_detention_arena_eviscerator", 4],
      ["brd_detention_arena_okthor", 4],
      ["brd_detention_arena_anubshiah", 4],
      ["brd_detention_arena_hedrum", 4],
      ["brd_detention_pyromancer_loregrain", 4],
      ["brd_detention_black_vault", 7],
      ["brd_detention_watchman_doomgrip", 4],
      ["brd_detention_warder_stilgiss", 4],
      ["brd_detention_verek", 2],
      ["brd_detention_fineous_darkvire", 4],
      ["brd_detention_lord_incendius", 5],
      ["brd_detention_baelgar", 4],
    ]);
    const uniqueIds = new Set<string>();

    for (const [tableId, size] of expectedSizes) {
      const table = content.lootTableById.get(asBrandedId<"LootTableId">(tableId))!;
      expect(table.guaranteedEquipmentDrops).toBe(1);
      expect(table.items).toHaveLength(size);
      expect(table.items.reduce((sum, item) => sum + item.weight, 0)).toBeCloseTo(1, 12);
      table.items.forEach(({ itemId }) => uniqueIds.add(String(itemId)));
    }

    expect(uniqueIds.size).toBe(66);
    for (const excludedId of [
      "11630",
      "11140",
      "11197",
      "11813",
      "11207",
      "19268",
      "11840",
      "11751",
      "11752",
      "11753",
    ]) {
      expect(uniqueIds).not.toContain(excludedId);
    }
  });

  it("defines shared vault equipment once while exposing both authentic sources", () => {
    const shared = ["22205", "22254", "22255", "22256"];
    for (const itemId of shared) {
      expect(content.items.filter((item) => item.id === itemId)).toHaveLength(1);
      const sourceTables = content.lootTables
        .filter((table) => table.items.some((entry) => entry.itemId === itemId))
        .map((table) => String(table.id));
      expect(sourceTables).toEqual(
        expect.arrayContaining(["brd_detention_black_vault", "brd_detention_watchman_doomgrip"]),
      );
    }
  });

  it("preserves representative Classic stats, slots, relic handling, and random affixes", () => {
    expect(content.itemById.get(asBrandedId<"ItemDefinitionId">("22234"))).toMatchObject({
      requiredLevel: 48,
      slot: "shoulder",
      armorType: "cloth",
      stats: { primary: { staminaPoints: 5, intellectPoints: 11 } },
    });
    expect(content.itemById.get(asBrandedId<"ItemDefinitionId">("22397"))).toMatchObject({
      slot: "ranged",
      restrictions: { allowedClassIds: ["druid"] },
      stats: {},
    });
    expect(content.itemById.get(asBrandedId<"ItemDefinitionId">("11803"))).toMatchObject({
      slot: "mainHand",
      twoHanded: true,
      stats: { weapon: { speedSeconds: 3.2 } },
    });
    expect(
      content.itemById.get(asBrandedId<"ItemDefinitionId">("11945"))!.randomSuffixIds,
    ).toHaveLength(23);
    expect(
      content.itemById.get(asBrandedId<"ItemDefinitionId">("11946"))!.randomSuffixIds,
    ).toHaveLength(23);
  });

  it("registers all eight quest rewards outside boss and vault pools", () => {
    const bossIds = new Set(
      content.lootTables.flatMap((table) => table.items.map(({ itemId }) => String(itemId))),
    );
    const questIds = content.quests
      .filter((quest) => quest.dungeonId === "blackrock_depths_detention_block")
      .flatMap((quest) => [...quest.rewards.fixedItemIds, ...quest.rewards.itemChoiceIds]);

    expect(new Set(questIds).size).toBe(8);
    for (const itemId of questIds) {
      expect(content.itemById.has(itemId)).toBe(true);
      expect(bossIds).not.toContain(String(itemId));
    }
  });
});
