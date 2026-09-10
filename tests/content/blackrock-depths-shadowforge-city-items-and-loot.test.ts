import { describe, expect, it } from "vitest";
import { loadBrowserContentRegistry } from "../../src/content/manifest";
import { asBrandedId } from "../../src/domain/shared/ids";

const content = loadBrowserContentRegistry();

describe("Blackrock Depths Shadowforge City items and loot", () => {
  it("defines every supported authentic boss pool with one guaranteed equipment drop", () => {
    const expectedSizes = new Map([
      ["brd_shadowforge_general_angerforge", 6],
      ["brd_shadowforge_golem_lord_argelmach", 4],
      ["brd_shadowforge_hurley_blackbreath", 4],
      ["brd_shadowforge_plugger_spazzring", 2],
      ["brd_shadowforge_phalanx", 4],
      ["brd_shadowforge_ambassador_flamelash", 5],
      ["brd_shadowforge_panzor", 4],
      ["brd_shadowforge_seven", 8],
      ["brd_shadowforge_magmus", 5],
      ["brd_shadowforge_princess_moira", 4],
      ["brd_shadowforge_emperor_dagran_thaurissan", 11],
    ]);
    const uniqueIds = new Set<string>();

    for (const [tableId, size] of expectedSizes) {
      const table = content.lootTableById.get(asBrandedId<"LootTableId">(tableId))!;
      expect(table.guaranteedEquipmentDrops).toBe(1);
      expect(table.items).toHaveLength(size);
      expect(table.items.reduce((sum, item) => sum + item.weight, 0)).toBeCloseTo(1, 12);
      table.items.forEach(({ itemId }) => uniqueIds.add(String(itemId)));
    }

    expect(uniqueIds.size).toBe(57);
    expect(content.lootTableById.has(asBrandedId("brd_shadowforge_ribbly_screwspigot"))).toBe(
      false,
    );
    for (const excludedId of ["2662", "2663", "12033"]) {
      expect(uniqueIds).not.toContain(excludedId);
    }
  });

  it("defines cross-wing equipment once while exposing both authentic sources", () => {
    const expectedSources = new Map([
      ["11841", ["brd_detention_fineous_darkvire", "brd_shadowforge_general_angerforge"]],
      ["11923", ["brd_detention_black_vault", "brd_shadowforge_seven"]],
    ]);

    for (const [itemId, sources] of expectedSources) {
      expect(content.items.filter((item) => item.id === itemId)).toHaveLength(1);
      const sourceTables = content.lootTables
        .filter((table) => table.items.some((entry) => entry.itemId === itemId))
        .map((table) => String(table.id));
      expect(sourceTables).toEqual(expect.arrayContaining(sources));
    }
  });

  it("preserves representative Classic stats, slots, relic handling, and final-boss gear", () => {
    expect(content.itemById.get(asBrandedId<"ItemDefinitionId">("11820"))).toMatchObject({
      requiredLevel: 53,
      slot: "chest",
      armorType: "mail",
      stats: { primary: { strengthPoints: 8, agilityPoints: 12, staminaPoints: 26 } },
    });
    expect(content.itemById.get(asBrandedId<"ItemDefinitionId">("11785"))).toMatchObject({
      slot: "offHand",
      stats: { defense: { armorPoints: 1994, blockValuePoints: 36 } },
    });
    expect(content.itemById.get(asBrandedId<"ItemDefinitionId">("22395"))).toMatchObject({
      slot: "ranged",
      restrictions: { allowedClassIds: ["shaman"] },
      stats: {},
    });
    expect(content.itemById.get(asBrandedId<"ItemDefinitionId">("11684"))).toMatchObject({
      quality: "epic",
      slot: "mainHand",
      stats: { weapon: { damage: { minimumPoints: 73, maximumPoints: 136 }, speedSeconds: 2.4 } },
    });
  });

  it("registers all sixteen quest rewards outside boss pools", () => {
    const bossIds = new Set(
      content.lootTables.flatMap((table) => table.items.map(({ itemId }) => String(itemId))),
    );
    const questIds = content.quests
      .filter((quest) => quest.dungeonId === "blackrock_depths_shadowforge_city")
      .flatMap((quest) => [...quest.rewards.fixedItemIds, ...quest.rewards.itemChoiceIds]);

    expect(new Set(questIds).size).toBe(16);
    for (const itemId of questIds) {
      expect(content.itemById.has(itemId)).toBe(true);
      expect(bossIds).not.toContain(String(itemId));
    }
  });
});
