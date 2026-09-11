import { describe, expect, it } from "vitest";
import { loadBrowserContentRegistry } from "../../src/content/manifest";
import { asBrandedId } from "../../src/domain/shared/ids";

const content = loadBrowserContentRegistry();

describe("Uldaman content", () => {
  it("unlocks after Razorfen Downs with two explicit optional branches and no rare boss", () => {
    const dungeon = content.dungeonById.get(asBrandedId<"DungeonId">("uldaman"))!;

    expect(dungeon).toMatchObject({
      minimumLevel: 40,
      recommendedLevel: 45,
      unlock: { requiredDungeonIds: ["razorfen_downs"] },
      duration: { baseSeconds: 2700, minimumRatio: 0.5 },
    });
    expect(dungeon.route.filter((node) => node.type === "required")).toHaveLength(6);
    expect(dungeon.route.filter((node) => node.type === "optional")).toEqual([
      expect.objectContaining({ id: "uldaman_ironaya" }),
      expect.objectContaining({ id: "uldaman_obsidian_sentinel" }),
    ]);
    expect(dungeon.route.filter((node) => node.type === "rare")).toEqual([]);
    expect(
      dungeon.route.reduce(
        (seconds, node) => seconds + content.encounterById.get(node.encounterId)!.stageSeconds,
        0,
      ),
    ).toBe(2700);
  });

  it("connects all encounters to mechanics and keeps the quest-only sentinel lootless", () => {
    const dungeon = content.dungeonById.get(asBrandedId<"DungeonId">("uldaman"))!;

    for (const node of dungeon.route) {
      const encounter = content.encounterById.get(node.encounterId)!;
      expect(encounter.mechanicIds.length).toBeGreaterThan(0);
      expect(
        content.logTemplates.filter(
          (group) => group.scope.type === "encounter" && group.scope.encounterId === encounter.id,
        ),
      ).toHaveLength(1);
      if (encounter.id === "uldaman_obsidian_sentinel") {
        expect(encounter.lootTableId).toBeUndefined();
      } else {
        expect(content.lootTableById.has(encounter.lootTableId!)).toBe(true);
      }
    }
  });

  it("defines all three instance-completable equipment quests", () => {
    expect(
      content.questById.get(asBrandedId<"QuestId">("uldaman_the_hidden_chamber")),
    ).toMatchObject({
      completion: {
        type: "encounter-victories",
        encounterIds: ["uldaman_lost_dwarves", "uldaman_revelosh", "uldaman_ironaya"],
      },
      rewards: { fixedItemIds: [], itemChoiceIds: ["9626", "9627"] },
    });
    expect(
      content.questById.get(asBrandedId<"QuestId">("uldaman_lost_tablets_of_will")),
    ).toMatchObject({ rewards: { fixedItemIds: ["6723"], itemChoiceIds: [] } });
    expect(
      content.questById.get(asBrandedId<"QuestId">("uldaman_restoring_the_necklace")),
    ).toMatchObject({ rewards: { itemChoiceIds: ["7673", "7888"] } });
  });

  it("adds the final roster expansion behind the Uldaman clear", () => {
    expect(
      content.guildUpgradeById.get(asBrandedId<"GuildUpgradeId">("guild_roster_30")),
    ).toMatchObject({
      order: 40,
      cost: 10000,
      requirements: [{ type: "dungeon-clear-count", dungeonId: "uldaman", count: 1 }],
      effects: [{ type: "member-capacity", value: 30 }],
    });
  });
});
