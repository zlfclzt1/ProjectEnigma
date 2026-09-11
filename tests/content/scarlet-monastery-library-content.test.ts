import { describe, expect, it } from "vitest";
import { loadBrowserContentRegistry } from "../../src/content/manifest";
import { asBrandedId } from "../../src/domain/shared/ids";

const content = loadBrowserContentRegistry();

describe("Scarlet Monastery Library content", () => {
  it("unlocks after Graveyard and keeps Loksey as an explicit optional route", () => {
    const dungeon = content.dungeonById.get(asBrandedId<"DungeonId">("scarlet_monastery_library"))!;

    expect(dungeon).toMatchObject({
      minimumLevel: 31,
      recommendedLevel: 40,
      unlock: { requiredDungeonIds: ["scarlet_monastery_graveyard"] },
      duration: { baseSeconds: 2280, minimumRatio: 0.5 },
    });
    expect(dungeon.route).toEqual([
      expect.objectContaining({
        id: "scarlet_library_houndmaster_loksey",
        type: "optional",
      }),
      expect.objectContaining({ id: "scarlet_library_arcanist_doan", type: "required" }),
    ]);
  });

  it("connects both bosses to their loot, mechanics, and victory logs", () => {
    const loksey = content.encounterById.get(
      asBrandedId<"EncounterId">("scarlet_library_houndmaster_loksey"),
    )!;
    const doan = content.encounterById.get(
      asBrandedId<"EncounterId">("scarlet_library_arcanist_doan"),
    )!;

    expect(loksey).toMatchObject({
      lootTableId: "scarlet_library_houndmaster_loksey",
      mechanicIds: ["scarlet_library_hound_pack"],
    });
    expect(doan).toMatchObject({
      lootTableId: "scarlet_library_arcanist_doan",
      mechanicIds: ["scarlet_library_arcane_detonation"],
    });
    expect(content.lootTableById.get(loksey.lootTableId!)?.items).toHaveLength(2);
    expect(content.lootTableById.get(doan.lootTableId!)?.items).toHaveLength(4);
    expect(
      content.logTemplates.filter(
        (group) =>
          group.scope.type === "encounter" &&
          [loksey.id, doan.id].includes(group.scope.encounterId),
      ),
    ).toHaveLength(2);
  });

  it("keeps the two book quests separate from boss drops while exposing cross-wing quests", () => {
    const compendium = content.questById.get(
      asBrandedId<"QuestId">("scarlet_library_compendium_of_the_fallen"),
    )!;
    const mythology = content.questById.get(
      asBrandedId<"QuestId">("scarlet_library_mythology_of_the_titans"),
    )!;

    expect(compendium).toMatchObject({
      dungeonId: "scarlet_monastery_library",
      completion: { type: "dungeon-clear" },
      rewards: { itemChoiceIds: ["7747", "17508", "7749"] },
    });
    expect(mythology).toMatchObject({
      completion: { type: "dungeon-clear" },
      rewards: { itemChoiceIds: ["7746"] },
    });
    expect(content.quests.some((quest) => quest.id.includes("in_the_name_of_the_light"))).toBe(
      true,
    );
  });
});
