import { describe, expect, it } from "vitest";
import { loadBrowserContentRegistry } from "../../src/content/manifest";
import { asBrandedId } from "../../src/domain/shared/ids";

const content = loadBrowserContentRegistry();

describe("Dire Maul East content", () => {
  it("unlocks from Shadowforge City and opens the Dire Maul branch", () => {
    const dungeon = content.dungeonById.get(asBrandedId<"DungeonId">("dire_maul_east"))!;

    expect(dungeon).toMatchObject({
      minimumLevel: 54,
      recommendedLevel: 56,
      unlock: { requiredDungeonIds: ["blackrock_depths_shadowforge_city"] },
      members: {
        minimum: 1,
        maximum: 5,
        recommended: 5,
        recommendedRoles: { tank: 1, healer: 1, dps: 3 },
      },
      duration: { baseSeconds: 2400, minimumRatio: 0.5 },
    });
    expect(dungeon.route.filter((node) => node.type === "required")).toHaveLength(3);
    expect(dungeon.route.filter((node) => node.type === "optional")).toHaveLength(2);
    expect(dungeon.route.filter((node) => node.type === "rare")).toHaveLength(0);
    expect(dungeon.route.filter((node) => node.type === "required").at(-1)?.encounterId).toBe(
      "dire_maul_east_alzzin",
    );
    expect(
      dungeon.route.reduce(
        (seconds, node) => seconds + content.encounterById.get(node.encounterId)!.stageSeconds,
        0,
      ),
    ).toBe(2400);
  });

  it("keeps Pusillin and Lethtendris player-selected", () => {
    const dungeon = content.dungeonById.get(asBrandedId<"DungeonId">("dire_maul_east"))!;

    expect(
      dungeon.route.filter((node) => node.type === "optional").map((node) => node.encounterId),
    ).toEqual(["dire_maul_east_pusillin", "dire_maul_east_lethtendris"]);
  });

  it("connects every encounter to a mechanic and a localized victory log", () => {
    const dungeon = content.dungeonById.get(asBrandedId<"DungeonId">("dire_maul_east"))!;

    for (const node of dungeon.route) {
      const encounter = content.encounterById.get(node.encounterId)!;
      expect(encounter.mechanicIds).toHaveLength(1);
      expect(content.mechanicById.has(encounter.mechanicIds[0]!)).toBe(true);
      expect(
        content.logTemplates.filter(
          (group) => group.scope.type === "encounter" && group.scope.encounterId === encounter.id,
        ),
      ).toHaveLength(1);
    }
    expect(content.encounterById.get(asBrandedId("dire_maul_east_pusillin"))?.lootTableId).toBe(
      undefined,
    );
  });

  it("defines three deterministic equipment quests", () => {
    const quests = content.quests.filter((quest) => quest.dungeonId === "dire_maul_east");

    expect(quests).toHaveLength(3);
    expect(
      content.questById.get(asBrandedId("dire_maul_east_pusillin_and_the_elder")),
    ).toMatchObject({
      completion: { encounterIds: ["dire_maul_east_pusillin"] },
      rewards: { itemChoiceIds: ["18410", "18411"] },
    });
    expect(content.questById.get(asBrandedId("dire_maul_east_lethtendris_web"))).toMatchObject({
      completion: { encounterIds: ["dire_maul_east_lethtendris"] },
      rewards: { fixedItemIds: ["18491"] },
    });
    expect(content.questById.get(asBrandedId("dire_maul_east_shard_of_the_felvine"))).toMatchObject(
      {
        completion: { encounterIds: ["dire_maul_east_alzzin"] },
        rewards: { itemChoiceIds: ["18535", "18536"] },
      },
    );
  });
});
