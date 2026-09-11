import { describe, expect, it } from "vitest";
import { loadBrowserContentRegistry } from "../../src/content/manifest";
import { asBrandedId } from "../../src/domain/shared/ids";

const content = loadBrowserContentRegistry();

describe("Dire Maul East items and loot", () => {
  it("defines all four authentic equipment pools", () => {
    const expectedSizes = new Map([
      ["dire_maul_east_zevrim_thornhoof", 5],
      ["dire_maul_east_hydro", 5],
      ["dire_maul_east_lethtendris", 4],
      ["dire_maul_east_alzzin", 10],
    ]);
    const uniqueIds = new Set<string>();

    for (const [tableId, size] of expectedSizes) {
      const table = content.lootTableById.get(asBrandedId<"LootTableId">(tableId))!;
      expect(table.sourceType).toBe("boss_drop");
      expect(table.guaranteedEquipmentDrops).toBe(1);
      expect(table.items).toHaveLength(size);
      expect(table.items.reduce((sum, item) => sum + item.weight, 0)).toBeCloseTo(1, 12);
      table.items.forEach(({ itemId }) => uniqueIds.add(String(itemId)));
    }

    expect(uniqueIds.size).toBe(24);
    expect(uniqueIds).not.toContain("19268");
  });

  it("preserves representative armor, weapon, spell, and final-boss stats", () => {
    expect(content.itemById.get(asBrandedId<"ItemDefinitionId">("18319"))).toMatchObject({
      requiredLevel: 53,
      slot: "head",
      armorType: "mail",
      stats: {
        primary: { staminaPoints: 14 },
        defense: { armorPoints: 279 },
        spell: { healthRegenPer5Seconds: 7 },
      },
    });
    expect(content.itemById.get(asBrandedId<"ItemDefinitionId">("18324"))).toMatchObject({
      slot: "mainHand",
      twoHanded: true,
      stats: {
        primary: { strengthPoints: 26 },
        physical: { criticalStrikePercent: 1 },
        weapon: { damage: { minimumPoints: 123, maximumPoints: 185 }, speedSeconds: 3.1 },
      },
    });
    expect(content.itemById.get(asBrandedId<"ItemDefinitionId">("18321"))).toMatchObject({
      slot: "mainHand",
      stats: { spell: { spellPowerPoints: 14, healingPowerPoints: 14 } },
    });
  });

  it("keeps all five quest rewards out of boss pools", () => {
    const bossIds = new Set(
      content.lootTables
        .filter((table) => String(table.id).startsWith("dire_maul_east_"))
        .flatMap((table) => table.items.map(({ itemId }) => String(itemId))),
    );
    const questIds = content.quests
      .filter((quest) => quest.dungeonId === "dire_maul_east")
      .flatMap((quest) => [...quest.rewards.fixedItemIds, ...quest.rewards.itemChoiceIds]);

    expect(new Set(questIds).size).toBe(5);
    for (const itemId of questIds) {
      expect(content.itemById.has(itemId)).toBe(true);
      expect(bossIds).not.toContain(String(itemId));
    }
  });
});
