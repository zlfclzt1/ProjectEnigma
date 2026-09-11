import { describe, expect, it } from "vitest";
import { loadBrowserContentRegistry } from "../../src/content/manifest";
import { asBrandedId } from "../../src/domain/shared/ids";

const content = loadBrowserContentRegistry();

describe("Scarlet Monastery Armory content", () => {
  it("unlocks after Library and keeps Herod as the only required route", () => {
    const dungeon = content.dungeonById.get(asBrandedId<"DungeonId">("scarlet_monastery_armory"))!;

    expect(dungeon).toMatchObject({
      minimumLevel: 32,
      recommendedLevel: 42,
      unlock: { requiredDungeonIds: ["scarlet_monastery_library"] },
      duration: { baseSeconds: 2340, minimumRatio: 0.5 },
    });
    expect(dungeon.route).toEqual([
      expect.objectContaining({ id: "scarlet_armory_herod", type: "required" }),
    ]);
  });

  it("connects Herod to four equipment drops, both mechanics, and a victory log", () => {
    const herod = content.encounterById.get(asBrandedId<"EncounterId">("scarlet_armory_herod"))!;
    const loot = content.lootTableById.get(herod.lootTableId!)!;

    expect(herod).toMatchObject({
      dungeonId: "scarlet_monastery_armory",
      lootTableId: "scarlet_armory_herod",
      mechanicIds: ["scarlet_armory_whirlwind", "scarlet_armory_trainee_wave"],
    });
    expect(loot.guaranteedEquipmentDrops).toBe(1);
    expect(loot.items.map(({ itemId }) => String(itemId))).toEqual([
      "7719",
      "7718",
      "10330",
      "7717",
    ]);
    expect(
      content.logTemplates.filter(
        (group) => group.scope.type === "encounter" && group.scope.encounterId === herod.id,
      ),
    ).toHaveLength(1);
  });

  it("keeps the trainee tabard and Armory-only quests out while retaining cross-wing quests", () => {
    expect(content.itemById.has(asBrandedId<"ItemDefinitionId">("23192"))).toBe(false);
    expect(content.quests.some((quest) => quest.dungeonId === "scarlet_monastery_armory")).toBe(
      false,
    );
    expect(content.quests.some((quest) => quest.id.includes("in_the_name_of_the_light"))).toBe(
      true,
    );
  });
});
