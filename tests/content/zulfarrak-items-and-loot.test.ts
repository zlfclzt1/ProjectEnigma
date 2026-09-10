import { describe, expect, it } from "vitest";
import { loadBrowserContentRegistry } from "../../src/content/manifest";
import { asBrandedId } from "../../src/domain/shared/ids";

const content = loadBrowserContentRegistry();

describe("Zul'Farrak items and loot", () => {
  it("defines all seven authentic equipment pools without turning quest objects into gear", () => {
    const expectedSizes = new Map([
      ["zulfarrak_antusul", 4],
      ["zulfarrak_witch_doctor_zumrah", 2],
      ["zulfarrak_nekrum_and_sezzziz", 4],
      ["zulfarrak_dustwraith", 1],
      ["zulfarrak_gahzrilla", 2],
      ["zulfarrak_chief_ukorz", 5],
      ["zulfarrak_zerillis", 1],
    ]);
    const itemIds = new Set<string>();

    for (const [lootTableId, size] of expectedSizes) {
      const table = content.lootTableById.get(asBrandedId<"LootTableId">(lootTableId))!;
      expect(table.guaranteedEquipmentDrops).toBe(1);
      expect(table.items).toHaveLength(size);
      expect(table.items.reduce((sum, item) => sum + item.weight, 0)).toBeCloseTo(1, 9);
      table.items.forEach(({ itemId }) => itemIds.add(String(itemId)));
    }

    expect(itemIds.size).toBe(19);
    for (const nonEquipmentId of [
      "1520",
      "9523",
      "9471",
      "8444",
      "8548",
      "9234",
      "10660",
      "10661",
      "11122",
    ]) {
      expect(itemIds).not.toContain(nonEquipmentId);
    }
  });

  it("preserves representative Classic stats, slots, rarity, and rare-drop weights", () => {
    expect(content.itemById.get(asBrandedId<"ItemDefinitionId">("9379"))).toMatchObject({
      requiredLevel: 44,
      stats: { defense: { parryPercent: 1 } },
    });
    expect(content.itemById.get(asBrandedId<"ItemDefinitionId">("18082"))).toMatchObject({
      twoHanded: true,
      stats: { spell: { spellPowerPoints: 21, healingPowerPoints: 21 } },
    });
    expect(content.itemById.get(asBrandedId<"ItemDefinitionId">("9467"))).toMatchObject({
      quality: "uncommon",
      stats: { weapon: { damage: { minimumPoints: 35, maximumPoints: 66 } } },
    });
    expect(content.itemById.get(asBrandedId<"ItemDefinitionId">("12471"))?.slot).toBe("offHand");
    expect(
      content.lootTableById
        .get(asBrandedId<"LootTableId">("zulfarrak_antusul"))
        ?.items.find(({ itemId }) => itemId === "9379")?.weight,
    ).toBeLessThan(0.03);
    expect(
      content.lootTableById
        .get(asBrandedId<"LootTableId">("zulfarrak_chief_ukorz"))
        ?.items.find(({ itemId }) => itemId === "11086")?.weight,
    ).toBeLessThan(0.02);
  });

  it("registers four task rewards separately and excludes the unsupported mount reward", () => {
    const bossItemIds = new Set(
      content.lootTables.flatMap((table) => table.items.map(({ itemId }) => String(itemId))),
    );

    for (const itemId of ["9527", "9531", "9533", "9534"]) {
      expect(content.itemById.has(asBrandedId<"ItemDefinitionId">(itemId))).toBe(true);
      expect(bossItemIds).not.toContain(itemId);
    }
    expect(content.itemById.has(asBrandedId<"ItemDefinitionId">("11122"))).toBe(false);
  });
});
