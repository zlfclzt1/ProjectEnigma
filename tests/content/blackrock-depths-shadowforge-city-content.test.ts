import { describe, expect, it } from "vitest";
import { loadBrowserContentRegistry } from "../../src/content/manifest";
import { asBrandedId } from "../../src/domain/shared/ids";

const content = loadBrowserContentRegistry();

describe("Blackrock Depths Shadowforge City content", () => {
  it("unlocks after the Detention Block and opens the first level-60 branch at the Emperor", () => {
    const dungeon = content.dungeonById.get(
      asBrandedId<"DungeonId">("blackrock_depths_shadowforge_city"),
    )!;

    expect(dungeon).toMatchObject({
      minimumLevel: 52,
      recommendedLevel: 56,
      unlock: { requiredDungeonIds: ["blackrock_depths_detention_block"] },
      duration: { baseSeconds: 3300, minimumRatio: 0.48 },
    });
    expect(dungeon.route.filter((node) => node.type === "required")).toHaveLength(6);
    expect(dungeon.route.filter((node) => node.type === "optional")).toHaveLength(6);
    expect(dungeon.route.filter((node) => node.type === "rare")).toHaveLength(1);
    expect(dungeon.route.filter((node) => node.type === "required").at(-1)?.encounterId).toBe(
      "brd_shadowforge_emperor_dagran_thaurissan",
    );
    expect(
      dungeon.route.reduce(
        (seconds, node) => seconds + content.encounterById.get(node.encounterId)!.stageSeconds,
        0,
      ),
    ).toBe(3300);
    expect(
      content.dungeons
        .filter(
          (candidate) =>
            candidate.unlock?.requiredDungeonIds?.includes(dungeon.id) ||
            candidate.unlock?.requiredAnyDungeonIds?.includes(dungeon.id),
        )
        .map((candidate) => candidate.id),
    ).toEqual(["dire_maul_east", "lower_blackrock_spire", "scholomance"]);
  });

  it("keeps side bosses player-selected and Panzor seed-driven", () => {
    const dungeon = content.dungeonById.get(
      asBrandedId<"DungeonId">("blackrock_depths_shadowforge_city"),
    )!;

    expect(
      dungeon.route.filter((node) => node.type === "optional").map((node) => node.encounterId),
    ).toEqual([
      "brd_shadowforge_general_angerforge",
      "brd_shadowforge_golem_lord_argelmach",
      "brd_shadowforge_hurley_blackbreath",
      "brd_shadowforge_ribbly_screwspigot",
      "brd_shadowforge_plugger_spazzring",
      "brd_shadowforge_princess_moira",
    ]);
    expect(dungeon.route.find((node) => node.encounterId === "brd_shadowforge_panzor")).toEqual(
      expect.objectContaining({ type: "rare", spawnProbability: 0.32 }),
    );
  });

  it("connects every encounter to mechanics and logs without inventing container loot", () => {
    const dungeon = content.dungeonById.get(
      asBrandedId<"DungeonId">("blackrock_depths_shadowforge_city"),
    )!;

    for (const node of dungeon.route) {
      const encounter = content.encounterById.get(node.encounterId)!;
      expect(encounter.mechanicIds.length).toBeGreaterThan(0);
      expect(
        content.logTemplates.filter(
          (group) => group.scope.type === "encounter" && group.scope.encounterId === encounter.id,
        ),
      ).toHaveLength(1);
      if (["brd_shadowforge_ribbly_screwspigot", "brd_shadowforge_lyceum"].includes(encounter.id)) {
        expect(encounter.lootTableId).toBeUndefined();
      } else {
        expect(content.lootTableById.has(encounter.lootTableId!)).toBe(true);
      }
    }
  });

  it("defines the six active-route quests and their authentic equipment choices", () => {
    const quests = content.quests.filter(
      (quest) => quest.dungeonId === "blackrock_depths_shadowforge_city",
    );
    expect(quests).toHaveLength(6);
    expect(content.questById.get(asBrandedId<"QuestId">("brd_shadowforge_ribbly"))).toMatchObject({
      completion: {
        type: "encounter-victories",
        encounterIds: ["brd_shadowforge_ribbly_screwspigot"],
      },
      rewards: { itemChoiceIds: ["11865", "11963", "12049"] },
    });
    expect(
      content.questById.get(asBrandedId<"QuestId">("brd_shadowforge_rise_of_machines")),
    ).toMatchObject({ rewards: { itemChoiceIds: ["12109", "12110", "12108", "12111"] } });
    expect(
      content.questById.get(asBrandedId<"QuestId">("brd_shadowforge_royal_rescue")),
    ).toMatchObject({
      completion: {
        type: "encounter-victories",
        encounterIds: ["brd_shadowforge_emperor_dagran_thaurissan"],
        excludedEncounterIds: ["brd_shadowforge_princess_moira"],
      },
      rewards: { itemChoiceIds: ["12548", "12543", "12544", "12545"] },
    });
  });
});
