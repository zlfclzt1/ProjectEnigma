import { describe, expect, it } from "vitest";
import { loadBrowserContentRegistry } from "../../src/content/manifest";
import { asBrandedId } from "../../src/domain/shared/ids";

const content = loadBrowserContentRegistry();

describe("Scarlet Monastery Cathedral content", () => {
  it("unlocks after Armory and keeps Fairbanks optional before the two-stage finale", () => {
    const dungeon = content.dungeonById.get(
      asBrandedId<"DungeonId">("scarlet_monastery_cathedral"),
    )!;

    expect(dungeon).toMatchObject({
      minimumLevel: 35,
      recommendedLevel: 44,
      unlock: { requiredDungeonIds: ["scarlet_monastery_armory"] },
      duration: { baseSeconds: 1080, minimumRatio: 0.5 },
    });
    expect(dungeon.route).toEqual([
      expect.objectContaining({
        id: "scarlet_cathedral_high_inquisitor_fairbanks",
        type: "optional",
      }),
      expect.objectContaining({ id: "scarlet_cathedral_commander_mograine", type: "required" }),
      expect.objectContaining({
        id: "scarlet_cathedral_high_inquisitor_whitemane",
        type: "required",
      }),
    ]);
  });

  it("connects all three bosses to complete loot pools, mechanics, and victory logs", () => {
    const expected = [
      ["scarlet_cathedral_high_inquisitor_fairbanks", 3],
      ["scarlet_cathedral_commander_mograine", 4],
      ["scarlet_cathedral_high_inquisitor_whitemane", 3],
    ] as const;

    for (const [encounterId, itemCount] of expected) {
      const encounter = content.encounterById.get(asBrandedId<"EncounterId">(encounterId))!;
      expect(encounter.mechanicIds).toHaveLength(1);
      expect(content.lootTableById.get(encounter.lootTableId!)?.items).toHaveLength(itemCount);
      expect(
        content.logTemplates.filter(
          (group) => group.scope.type === "encounter" && group.scope.encounterId === encounter.id,
        ),
      ).toHaveLength(1);
    }
    expect(
      content.lootTableById
        .get(asBrandedId<"LootTableId">("scarlet_cathedral_commander_mograine"))
        ?.items.map(({ itemId }) => String(itemId)),
    ).toContain("10330");
  });

  it("defines both cross-wing quests with authentic four-boss objectives and rewards", () => {
    const light = content.questById.get(
      asBrandedId<"QuestId">("scarlet_crosswing_in_the_name_of_the_light"),
    )!;
    const into = content.questById.get(
      asBrandedId<"QuestId">("scarlet_crosswing_into_the_scarlet_monastery"),
    )!;
    const encounterIds = [
      "scarlet_library_houndmaster_loksey",
      "scarlet_armory_herod",
      "scarlet_cathedral_commander_mograine",
      "scarlet_cathedral_high_inquisitor_whitemane",
    ];

    expect(light).toMatchObject({
      dungeonId: "scarlet_monastery_library",
      completion: { type: "encounter-victories", encounterIds },
      rewards: { itemChoiceIds: ["6829", "6830", "6831", "11262"] },
    });
    expect(into).toMatchObject({
      dungeonId: "scarlet_monastery_library",
      completion: { type: "encounter-victories", encounterIds },
      rewards: { itemChoiceIds: ["6802", "6803", "10711"] },
    });
  });

  it("adds the third roster expansion behind the Cathedral clear", () => {
    expect(
      content.guildUpgradeById.get(asBrandedId<"GuildUpgradeId">("guild_roster_25")),
    ).toMatchObject({
      cost: 4000,
      requirements: [
        { type: "dungeon-clear-count", dungeonId: "scarlet_monastery_cathedral", count: 1 },
      ],
      effects: [{ type: "member-capacity", value: 25 }],
    });
  });
});
