import { describe, expect, it } from "vitest";
import { loadBrowserContentRegistry } from "../../src/content/manifest";
import { asBrandedId } from "../../src/domain/shared/ids";

const content = loadBrowserContentRegistry();

describe("Maraudon content", () => {
  it("unlocks after Zul'Farrak with five required bosses, four options, and one rare", () => {
    const dungeon = content.dungeonById.get(asBrandedId<"DungeonId">("maraudon"))!;

    expect(dungeon).toMatchObject({
      minimumLevel: 45,
      recommendedLevel: 49,
      unlock: { requiredDungeonIds: ["zulfarrak"] },
      duration: { baseSeconds: 2940, minimumRatio: 0.48 },
    });
    expect(dungeon.route.filter((node) => node.type === "required")).toHaveLength(5);
    expect(dungeon.route.filter((node) => node.type === "optional")).toEqual([
      expect.objectContaining({ id: "maraudon_pariahs_instructions" }),
      expect.objectContaining({ id: "maraudon_razorlash" }),
      expect.objectContaining({ id: "maraudon_tinkerer_gizlock" }),
      expect.objectContaining({ id: "maraudon_rotgrip" }),
    ]);
    expect(dungeon.route.filter((node) => node.type === "rare")).toEqual([
      expect.objectContaining({
        id: "maraudon_meshlok_the_harvester",
        spawnProbability: 0.12,
      }),
    ]);
    expect(dungeon.route.at(-1)?.encounterId).toBe("maraudon_princess_theradras");
    expect(
      dungeon.route.reduce(
        (seconds, node) => seconds + content.encounterById.get(node.encounterId)!.stageSeconds,
        0,
      ),
    ).toBe(2940);
  });

  it("connects every route node to mechanics, logs, and the authentic loot boundary", () => {
    const dungeon = content.dungeonById.get(asBrandedId<"DungeonId">("maraudon"))!;

    for (const node of dungeon.route) {
      const encounter = content.encounterById.get(node.encounterId)!;
      expect(encounter.mechanicIds.length).toBeGreaterThan(0);
      expect(
        content.logTemplates.filter(
          (group) => group.scope.type === "encounter" && group.scope.encounterId === encounter.id,
        ),
      ).toHaveLength(1);
      if (encounter.id === "maraudon_pariahs_instructions") {
        expect(encounter.lootTableId).toBeUndefined();
      } else {
        expect(content.lootTableById.has(encounter.lootTableId!)).toBe(true);
      }
    }
  });

  it("defines four actively completable member equipment quests", () => {
    expect(
      content.questById.get(asBrandedId<"QuestId">("maraudon_vyletongue_corruption")),
    ).toMatchObject({
      completion: {
        type: "encounter-victories",
        encounterIds: ["maraudon_noxxion", "maraudon_razorlash"],
      },
      rewards: { fixedItemIds: [], itemChoiceIds: ["17768", "17778", "17770"] },
    });
    expect(
      content.questById.get(asBrandedId<"QuestId">("maraudon_pariahs_instructions")),
    ).toMatchObject({
      completion: {
        type: "encounter-victories",
        encounterIds: ["maraudon_pariahs_instructions"],
      },
      rewards: { fixedItemIds: ["17774"], itemChoiceIds: [] },
    });
    expect(content.questById.get(asBrandedId<"QuestId">("maraudon_twisted_evils"))).toMatchObject({
      completion: {
        type: "encounter-victories",
        encounterIds: ["maraudon_lord_vyletongue", "maraudon_celebras_the_cursed"],
      },
      rewards: { fixedItemIds: [], itemChoiceIds: ["17775", "17776", "17777", "17779"] },
    });
    expect(
      content.questById.get(asBrandedId<"QuestId">("maraudon_corruption_of_earth_and_seed")),
    ).toMatchObject({
      completion: {
        type: "encounter-victories",
        encounterIds: ["maraudon_princess_theradras"],
      },
      rewards: { fixedItemIds: [], itemChoiceIds: ["17705", "17753", "17743"] },
    });
    expect(content.itemById.has(asBrandedId<"ItemDefinitionId">("17191"))).toBe(false);
  });
});
