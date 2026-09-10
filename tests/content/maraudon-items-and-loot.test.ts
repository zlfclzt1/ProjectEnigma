import { describe, expect, it } from "vitest";
import { loadBrowserContentRegistry } from "../../src/content/manifest";
import { asBrandedId } from "../../src/domain/shared/ids";

const content = loadBrowserContentRegistry();

describe("Maraudon items and loot", () => {
  it("defines all nine authentic equipment pools and one guaranteed drop per boss", () => {
    const expectedSizes = new Map([
      ["maraudon_noxxion", 3],
      ["maraudon_razorlash", 4],
      ["maraudon_lord_vyletongue", 3],
      ["maraudon_meshlok_the_harvester", 3],
      ["maraudon_celebras_the_cursed", 3],
      ["maraudon_landslide", 4],
      ["maraudon_tinkerer_gizlock", 3],
      ["maraudon_rotgrip", 3],
      ["maraudon_princess_theradras", 8],
    ]);
    const itemIds = new Set<string>();

    for (const [lootTableId, size] of expectedSizes) {
      const table = content.lootTableById.get(asBrandedId<"LootTableId">(lootTableId))!;
      expect(table.guaranteedEquipmentDrops).toBe(1);
      expect(table.items).toHaveLength(size);
      expect(table.items.reduce((sum, item) => sum + item.weight, 0)).toBeCloseTo(1, 9);
      table.items.forEach(({ itemId }) => itemIds.add(String(itemId)));
    }

    expect(itemIds.size).toBe(34);
    for (const taskOrUtilityId of ["17757", "17761", "17762", "17763", "17764", "17765", "17191"]) {
      expect(itemIds).not.toContain(taskOrUtilityId);
    }
  });

  it("preserves representative Classic stats, slots, rarity, and the epic low weight", () => {
    expect(content.itemById.get(asBrandedId<"ItemDefinitionId">("17744"))).toMatchObject({
      requiredLevel: 46,
      slot: "trinket1",
      stats: { resistances: { naturePoints: 10 } },
    });
    expect(content.itemById.get(asBrandedId<"ItemDefinitionId">("17719"))).toMatchObject({
      stats: {
        spell: { criticalStrikePercent: 1 },
        weapon: { damage: { minimumPoints: 54, maximumPoints: 101 } },
      },
    });
    expect(content.itemById.get(asBrandedId<"ItemDefinitionId">("17718"))).toMatchObject({
      slot: "offHand",
      stats: { defense: { armorPoints: 1835, blockValuePoints: 32 } },
    });
    expect(content.itemById.get(asBrandedId<"ItemDefinitionId">("17780"))).toMatchObject({
      quality: "epic",
      stats: { weapon: { damage: { minimumPoints: 34, maximumPoints: 70 } } },
    });
    expect(
      content.lootTableById
        .get(asBrandedId<"LootTableId">("maraudon_princess_theradras"))
        ?.items.find(({ itemId }) => itemId === "17780")?.weight,
    ).toBeLessThan(0.01);
  });

  it("registers eleven quest rewards outside every boss pool", () => {
    const bossItemIds = new Set(
      content.lootTables.flatMap((table) => table.items.map(({ itemId }) => String(itemId))),
    );
    const questRewardIds = [
      "17768",
      "17778",
      "17770",
      "17774",
      "17775",
      "17776",
      "17777",
      "17779",
      "17705",
      "17753",
      "17743",
    ];

    for (const itemId of questRewardIds) {
      expect(content.itemById.has(asBrandedId<"ItemDefinitionId">(itemId))).toBe(true);
      expect(bossItemIds).not.toContain(itemId);
    }
  });
});
