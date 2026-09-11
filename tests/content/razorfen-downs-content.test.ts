import { describe, expect, it } from "vitest";
import { loadBrowserContentRegistry } from "../../src/content/manifest";
import { asBrandedId } from "../../src/domain/shared/ids";

const content = loadBrowserContentRegistry();

describe("Razorfen Downs content", () => {
  it("unlocks after Cathedral with one optional escort and two random rare bosses", () => {
    const dungeon = content.dungeonById.get(asBrandedId<"DungeonId">("razorfen_downs"))!;

    expect(dungeon).toMatchObject({
      minimumLevel: 37,
      recommendedLevel: 45,
      unlock: { requiredDungeonIds: ["scarlet_monastery_cathedral"] },
      duration: { baseSeconds: 2580, minimumRatio: 0.5 },
    });
    expect(dungeon.route.filter((node) => node.type === "required")).toHaveLength(4);
    expect(dungeon.route.filter((node) => node.type === "optional")).toEqual([
      expect.objectContaining({ id: "razorfen_downs_plaguemaw_the_rotting" }),
    ]);
    expect(dungeon.route.filter((node) => node.type === "rare")).toEqual([
      expect.objectContaining({ id: "razorfen_downs_lady_faltheress", spawnProbability: 0.08 }),
      expect.objectContaining({ id: "razorfen_downs_ragglesnout", spawnProbability: 0.16 }),
    ]);
    expect(
      dungeon.route.reduce(
        (seconds, node) => seconds + content.encounterById.get(node.encounterId)!.stageSeconds,
        0,
      ),
    ).toBe(2580);
  });

  it("connects every route encounter to the researched loot pool, mechanics, and logs", () => {
    const expectedLootSizes = new Map([
      ["razorfen_downs_tutenkash", 3],
      ["razorfen_downs_lady_faltheress", 2],
      ["razorfen_downs_mordresh_fire_eye", 3],
      ["razorfen_downs_plaguemaw_the_rotting", 2],
      ["razorfen_downs_glutton", 2],
      ["razorfen_downs_ragglesnout", 3],
      ["razorfen_downs_amnennar_the_coldbringer", 5],
    ]);

    for (const [encounterId, itemCount] of expectedLootSizes) {
      const encounter = content.encounterById.get(asBrandedId<"EncounterId">(encounterId))!;
      expect(encounter.mechanicIds.length).toBeGreaterThan(0);
      expect(content.lootTableById.get(encounter.lootTableId!)?.items).toHaveLength(itemCount);
      expect(
        content.logTemplates.filter(
          (group) => group.scope.type === "encounter" && group.scope.encounterId === encounter.id,
        ),
      ).toHaveLength(1);
    }
  });

  it("keeps the escort reward fixed and grants both final-boss quest items", () => {
    expect(
      content.questById.get(asBrandedId<"QuestId">("razorfen_downs_extinguishing_the_idol")),
    ).toMatchObject({
      completion: {
        type: "encounter-victories",
        encounterIds: ["razorfen_downs_plaguemaw_the_rotting"],
      },
      rewards: { fixedItemIds: ["10710"], itemChoiceIds: [] },
    });
    expect(
      content.questById.get(asBrandedId<"QuestId">("razorfen_downs_bring_the_light_or_end")),
    ).toMatchObject({
      completion: {
        type: "encounter-victories",
        encounterIds: ["razorfen_downs_amnennar_the_coldbringer"],
      },
      rewards: { fixedItemIds: ["10823", "10824"], itemChoiceIds: [] },
    });
  });
});
