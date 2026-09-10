import { describe, expect, it } from "vitest";
import { loadBrowserContentRegistry } from "../../src/content/manifest";
import { asBrandedId } from "../../src/domain/shared/ids";

const content = loadBrowserContentRegistry();

describe("Sunken Temple items and loot", () => {
  it("defines every authentic pool and preserves grouped boss drop counts", () => {
    const expected = new Map([
      ["sunken_temple_atalalarion", { size: 3, drops: 1 }],
      ["sunken_temple_balcony_minibosses", { size: 6, drops: 6 }],
      ["sunken_temple_spawn_of_hakkar", { size: 2, drops: 1 }],
      ["sunken_temple_avatar_of_hakkar", { size: 7, drops: 1 }],
      ["sunken_temple_jammalan_the_prophet", { size: 3, drops: 1 }],
      ["sunken_temple_ogom_the_wretched", { size: 3, drops: 1 }],
      ["sunken_temple_dreamscythe_and_weaver", { size: 8, drops: 2 }],
      ["sunken_temple_morphaz_and_hazzas", { size: 8, drops: 2 }],
      ["sunken_temple_shade_of_eranikus", { size: 7, drops: 1 }],
    ]);
    const uniqueIds = new Set<string>();

    for (const [lootTableId, expectation] of expected) {
      const table = content.lootTableById.get(asBrandedId<"LootTableId">(lootTableId))!;
      expect(table.guaranteedEquipmentDrops).toBe(expectation.drops);
      expect(table.items).toHaveLength(expectation.size);
      expect(table.items.reduce((sum, item) => sum + item.weight, 0)).toBeCloseTo(1, 9);
      table.items.forEach(({ itemId }) => uniqueIds.add(String(itemId)));
    }

    expect(uniqueIds.size).toBe(39);
    expect(uniqueIds).not.toContain("10454");
    for (const excludedId of ["10773", "10780", "10781", "10782"]) {
      expect(uniqueIds).not.toContain(excludedId);
    }
  });

  it("defines the four-dragon pool once and exposes it through both pair encounters", () => {
    const expectedIds = ["12465", "12466", "12464", "10797", "12463", "12243", "10795", "10796"];
    for (const tableId of [
      "sunken_temple_dreamscythe_and_weaver",
      "sunken_temple_morphaz_and_hazzas",
    ]) {
      expect(
        content.lootTableById
          .get(asBrandedId<"LootTableId">(tableId))!
          .items.map(({ itemId }) => String(itemId)),
      ).toEqual(expectedIds);
    }
    for (const itemId of expectedIds) {
      expect(content.items.filter((item) => item.id === itemId)).toHaveLength(1);
    }
  });

  it("preserves representative Classic stats, slots, and epic rarity", () => {
    expect(content.itemById.get(asBrandedId<"ItemDefinitionId">("10783"))).toMatchObject({
      requiredLevel: 47,
      slot: "shoulder",
      armorType: "leather",
      stats: { defense: { armorPoints: 273 } },
    });
    expect(content.itemById.get(asBrandedId<"ItemDefinitionId">("10835"))).toMatchObject({
      slot: "offHand",
      stats: { defense: { armorPoints: 1930, blockValuePoints: 35 } },
    });
    expect(content.itemById.get(asBrandedId<"ItemDefinitionId">("10836"))).toMatchObject({
      slot: "ranged",
      stats: {
        weapon: { damage: { minimumPoints: 50, maximumPoints: 93 }, speedSeconds: 1.3 },
        resistances: { naturePoints: 10 },
      },
    });
    expect(content.itemById.get(asBrandedId<"ItemDefinitionId">("10847"))).toMatchObject({
      quality: "epic",
      slot: "mainHand",
      stats: { weapon: { damage: { minimumPoints: 72, maximumPoints: 135 } } },
    });
  });

  it("registers all 34 quest rewards outside boss pools", () => {
    const bossItemIds = new Set(
      content.lootTables.flatMap((table) => table.items.map(({ itemId }) => String(itemId))),
    );
    const questIds = content.quests
      .filter((quest) => quest.dungeonId === "sunken_temple")
      .flatMap((quest) => [...quest.rewards.fixedItemIds, ...quest.rewards.itemChoiceIds]);

    expect(new Set(questIds).size).toBe(34);
    for (const itemId of questIds) {
      expect(content.itemById.has(itemId)).toBe(true);
      expect(bossItemIds).not.toContain(String(itemId));
    }
    expect(content.itemById.get(asBrandedId<"ItemDefinitionId">("20130"))).toMatchObject({
      requiredLevel: 50,
      stats: {},
      statsSource: { notes: expect.stringContaining("暂不进入常驻属性模型") },
    });
  });
});
