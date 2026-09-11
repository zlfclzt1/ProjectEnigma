import { describe, expect, it } from "vitest";
import { loadBrowserContentRegistry } from "../../src/content/manifest";
import { asBrandedId } from "../../src/domain/shared/ids";

const content = loadBrowserContentRegistry();

describe("Blackrock Depths Detention Block content", () => {
  it("unlocks after Sunken Temple and separates the key route from active side paths", () => {
    const dungeon = content.dungeonById.get(
      asBrandedId<"DungeonId">("blackrock_depths_detention_block"),
    )!;

    expect(dungeon).toMatchObject({
      minimumLevel: 50,
      recommendedLevel: 54,
      unlock: { requiredDungeonIds: ["sunken_temple"] },
      duration: { baseSeconds: 3180, minimumRatio: 0.48 },
    });
    expect(dungeon.route.filter((node) => node.type === "required")).toHaveLength(3);
    expect(dungeon.route.filter((node) => node.type === "optional")).toHaveLength(7);
    expect(dungeon.route.filter((node) => node.type === "rare")).toHaveLength(8);
    expect(dungeon.route.filter((node) => node.type === "required").at(-1)?.encounterId).toBe(
      "brd_detention_fineous_darkvire",
    );
    expect(
      dungeon.route.reduce(
        (seconds, node) => seconds + content.encounterById.get(node.encounterId)!.stageSeconds,
        0,
      ),
    ).toBe(3180);
  });

  it("models the Ring of Law as one guaranteed random opponent", () => {
    const dungeon = content.dungeonById.get(
      asBrandedId<"DungeonId">("blackrock_depths_detention_block"),
    )!;
    const arena = dungeon.route.flatMap((node) =>
      node.type === "rare" && node.spawnGroup === "brd_detention_ring_of_law_opponent"
        ? [node]
        : [],
    );

    expect(arena).toHaveLength(6);
    expect(arena.reduce((sum, node) => sum + node.spawnProbability, 0)).toBeCloseTo(1, 12);
    expect(new Set(arena.map((node) => node.encounterId))).toEqual(
      new Set([
        "brd_detention_arena_gorosh",
        "brd_detention_arena_grizzle",
        "brd_detention_arena_eviscerator",
        "brd_detention_arena_okthor",
        "brd_detention_arena_anubshiah",
        "brd_detention_arena_hedrum",
      ]),
    );
  });

  it("connects every encounter to mechanics and logs without inventing arena-event loot", () => {
    const dungeon = content.dungeonById.get(
      asBrandedId<"DungeonId">("blackrock_depths_detention_block"),
    )!;

    for (const node of dungeon.route) {
      const encounter = content.encounterById.get(node.encounterId)!;
      expect(encounter.mechanicIds.length).toBeGreaterThan(0);
      expect(
        content.logTemplates.filter(
          (group) => group.scope.type === "encounter" && group.scope.encounterId === encounter.id,
        ),
      ).toHaveLength(1);
      if (encounter.id === "brd_detention_ring_of_law") {
        expect(encounter.lootTableId).toBeUndefined();
      } else {
        expect(content.lootTableById.has(encounter.lootTableId!)).toBe(true);
      }
    }
  });

  it("defines only the three active-route quests with equipment rewards", () => {
    const quests = content.quests.filter(
      (quest) => quest.dungeonId === "blackrock_depths_detention_block",
    );
    expect(quests).toHaveLength(3);
    expect(
      content.questById.get(asBrandedId<"QuestId">("brd_detention_taste_of_flame")),
    ).toMatchObject({
      completion: { type: "encounter-victories", encounterIds: ["brd_detention_baelgar"] },
      rewards: { itemChoiceIds: ["12066", "12082", "12083"] },
    });
    expect(content.questById.get(asBrandedId<"QuestId">("brd_detention_incendius"))).toMatchObject({
      completion: {
        type: "encounter-victories",
        encounterIds: ["brd_detention_lord_incendius"],
      },
      rewards: { itemChoiceIds: ["12113", "12114", "12112", "12115"] },
    });
    expect(
      content.questById.get(asBrandedId<"QuestId">("brd_detention_last_element")),
    ).toMatchObject({
      rewards: { fixedItemIds: ["12038"] },
    });
  });
});
