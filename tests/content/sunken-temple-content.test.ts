import { describe, expect, it } from "vitest";
import { loadBrowserContentRegistry } from "../../src/content/manifest";
import { asBrandedId } from "../../src/domain/shared/ids";

const content = loadBrowserContentRegistry();

describe("Sunken Temple content", () => {
  it("unlocks after Maraudon with six required events and three active options", () => {
    const dungeon = content.dungeonById.get(asBrandedId<"DungeonId">("sunken_temple"))!;

    expect(dungeon).toMatchObject({
      minimumLevel: 48,
      recommendedLevel: 52,
      unlock: { requiredDungeonIds: ["maraudon"] },
      duration: { baseSeconds: 3060, minimumRatio: 0.48 },
    });
    expect(dungeon.route.filter((node) => node.type === "required")).toHaveLength(6);
    expect(dungeon.route.filter((node) => node.type === "optional")).toEqual([
      expect.objectContaining({ id: "sunken_temple_atalalarion" }),
      expect.objectContaining({ id: "sunken_temple_spawn_of_hakkar" }),
      expect.objectContaining({ id: "sunken_temple_avatar_of_hakkar" }),
    ]);
    expect(dungeon.route.filter((node) => node.type === "rare")).toEqual([]);
    expect(dungeon.route.at(-1)?.encounterId).toBe("sunken_temple_shade_of_eranikus");
    expect(
      dungeon.route.reduce(
        (seconds, node) => seconds + content.encounterById.get(node.encounterId)!.stageSeconds,
        0,
      ),
    ).toBe(3060);
  });

  it("connects every route node to mechanics, logs, and authentic equipment", () => {
    const dungeon = content.dungeonById.get(asBrandedId<"DungeonId">("sunken_temple"))!;

    for (const node of dungeon.route) {
      const encounter = content.encounterById.get(node.encounterId)!;
      expect(encounter.mechanicIds.length).toBeGreaterThan(0);
      expect(
        content.logTemplates.filter(
          (group) => group.scope.type === "encounter" && group.scope.encounterId === encounter.id,
        ),
      ).toHaveLength(1);
      expect(content.lootTableById.has(encounter.lootTableId!)).toBe(true);
    }
  });

  it("defines four normal quests and all nine level-50 class quests", () => {
    const quests = content.quests.filter((quest) => quest.dungeonId === "sunken_temple");
    expect(quests).toHaveLength(13);

    expect(
      content.questById.get(asBrandedId<"QuestId">("sunken_temple_the_god_hakkar")),
    ).toMatchObject({
      completion: {
        type: "encounter-victories",
        encounterIds: ["sunken_temple_avatar_of_hakkar"],
      },
      rewards: { itemChoiceIds: ["10749", "10750", "10751"] },
    });
    expect(
      content.questById.get(asBrandedId<"QuestId">("sunken_temple_druid_better_ingredient")),
    ).toMatchObject({
      eligibility: { minimumLevel: 50, allowedClassIds: ["druid"] },
      completion: {
        type: "encounter-victories",
        encounterIds: ["sunken_temple_atalalarion"],
      },
      rewards: { itemChoiceIds: ["22272", "22274", "22458"] },
    });

    const morphazClasses = ["hunter", "mage", "priest", "rogue"];
    const balconyClasses = ["paladin", "shaman", "warlock", "warrior"];
    for (const classId of morphazClasses) {
      const quest = quests.find(
        (candidate) => candidate.eligibility.allowedClassIds[0] === classId,
      )!;
      expect(quest.completion).toEqual({
        type: "encounter-victories",
        encounterIds: ["sunken_temple_morphaz_and_hazzas"],
      });
    }
    for (const classId of balconyClasses) {
      const quest = quests.find(
        (candidate) => candidate.eligibility.allowedClassIds[0] === classId,
      )!;
      expect(quest.completion).toEqual({
        type: "encounter-victories",
        encounterIds: ["sunken_temple_balcony_minibosses"],
      });
    }
  });
});
