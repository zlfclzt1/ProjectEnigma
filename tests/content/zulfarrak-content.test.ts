import { describe, expect, it } from "vitest";
import { loadBrowserContentRegistry } from "../../src/content/manifest";
import { asBrandedId } from "../../src/domain/shared/ids";

const content = loadBrowserContentRegistry();

describe("Zul'Farrak content", () => {
  it("unlocks after Uldaman with a complete required route, two options, and three rares", () => {
    const dungeon = content.dungeonById.get(asBrandedId<"DungeonId">("zulfarrak"))!;

    expect(dungeon).toMatchObject({
      minimumLevel: 40,
      recommendedLevel: 45,
      unlock: { requiredDungeonIds: ["uldaman"] },
      duration: { baseSeconds: 2820, minimumRatio: 0.5 },
    });
    expect(dungeon.route.filter((node) => node.type === "required")).toHaveLength(7);
    expect(dungeon.route.filter((node) => node.type === "optional")).toEqual([
      expect.objectContaining({ id: "zulfarrak_sergeant_bly" }),
      expect.objectContaining({ id: "zulfarrak_gahzrilla" }),
    ]);
    expect(dungeon.route.filter((node) => node.type === "rare")).toEqual([
      expect.objectContaining({ id: "zulfarrak_zerillis", spawnProbability: 0.14 }),
      expect.objectContaining({ id: "zulfarrak_sandarr_dunereaver", spawnProbability: 0.12 }),
      expect.objectContaining({ id: "zulfarrak_dustwraith", spawnProbability: 0.12 }),
    ]);
    expect(dungeon.route.at(-1)?.encounterId).toBe("zulfarrak_chief_ukorz");
    expect(
      dungeon.route.reduce(
        (seconds, node) => seconds + content.encounterById.get(node.encounterId)!.stageSeconds,
        0,
      ),
    ).toBe(2820);
  });

  it("connects every encounter to mechanics and preserves five authentic lootless nodes", () => {
    const dungeon = content.dungeonById.get(asBrandedId<"DungeonId">("zulfarrak"))!;
    const lootless = new Set([
      "zulfarrak_sandarr_dunereaver",
      "zulfarrak_theka_the_martyr",
      "zulfarrak_sandfury_executioner",
      "zulfarrak_sergeant_bly",
      "zulfarrak_hydromancer_velratha",
    ]);

    for (const node of dungeon.route) {
      const encounter = content.encounterById.get(node.encounterId)!;
      expect(encounter.mechanicIds.length).toBeGreaterThan(0);
      expect(
        content.logTemplates.filter(
          (group) => group.scope.type === "encounter" && group.scope.encounterId === encounter.id,
        ),
      ).toHaveLength(1);
      if (lootless.has(encounter.id)) {
        expect(encounter.lootTableId).toBeUndefined();
      } else {
        expect(content.lootTableById.has(encounter.lootTableId!)).toBe(true);
      }
    }
  });

  it("defines both instance-completable equipment quests without granting the mount reward", () => {
    expect(
      content.questById.get(asBrandedId<"QuestId">("zulfarrak_tiara_of_the_deep")),
    ).toMatchObject({
      completion: {
        type: "encounter-victories",
        encounterIds: ["zulfarrak_hydromancer_velratha"],
      },
      rewards: { fixedItemIds: [], itemChoiceIds: ["9527", "9531"] },
    });
    expect(
      content.questById.get(asBrandedId<"QuestId">("zulfarrak_divino_matic_rod")),
    ).toMatchObject({
      completion: {
        type: "encounter-victories",
        encounterIds: [
          "zulfarrak_sandfury_executioner",
          "zulfarrak_nekrum_and_sezzziz",
          "zulfarrak_sergeant_bly",
        ],
      },
      rewards: { fixedItemIds: [], itemChoiceIds: ["9533", "9534"] },
    });
    expect(content.itemById.has(asBrandedId<"ItemDefinitionId">("11122"))).toBe(false);
  });
});
