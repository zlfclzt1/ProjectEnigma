import { describe, expect, it } from "vitest";
import { browserContentModules, loadBrowserContentRegistry } from "../../src/content/manifest";
import { loadContentRegistry } from "../../src/content/registry";
import { asBrandedId } from "../../src/domain/shared/ids";

function clonedModules(): Record<string, unknown> {
  return structuredClone(browserContentModules) as Record<string, unknown>;
}

function questFile(modules: Record<string, unknown>) {
  const key = Object.keys(modules).find((path) =>
    path.endsWith("/content/quests/ragefire-chasm.json"),
  );
  if (!key) throw new Error("Missing quest content fixture");
  return modules[key] as {
    quests: Array<{
      dungeonId: string;
      eligibility: { allowedClassIds: string[] };
      completion: { type: string; encounterIds?: string[] };
      rewards: { fixedItemIds?: string[]; itemChoiceIds: string[] };
    }>;
  };
}

describe("member dungeon quest content", () => {
  it("loads member conditions, supported objectives, and real reward choices", () => {
    const content = loadBrowserContentRegistry();

    expect(content.quests).toHaveLength(52);
    expect(
      content.questById.get(asBrandedId<"QuestId">("rfc_returning_lost_satchel")),
    ).toMatchObject({
      dungeonId: "ragefire_chasm",
      eligibility: { minimumLevel: 9, allowedClassIds: [] },
      completion: { type: "encounter-victories", encounterIds: ["oggleflint"] },
      rewards: { itemChoiceIds: ["15452", "15453"] },
    });
    expect(content.questById.get(asBrandedId<"QuestId">("rfc_power_to_destroy"))).toMatchObject({
      completion: { type: "dungeon-clear" },
      rewards: { itemChoiceIds: ["15449", "15450", "15451"] },
    });
  });

  it("rejects missing dungeon, class, encounter, and reward references", () => {
    const modules = clonedModules();
    const quest = questFile(modules).quests[0]!;
    quest.dungeonId = "missing_dungeon";
    quest.eligibility.allowedClassIds = ["missing_class"];
    quest.completion.encounterIds = ["missing_encounter"];
    quest.rewards.itemChoiceIds = ["missing_item"];

    expect(() => loadContentRegistry(modules)).toThrowError(/不存在的副本/);
    expect(() => loadContentRegistry(modules)).toThrowError(/不存在的职业/);
    expect(() => loadContentRegistry(modules)).toThrowError(/不存在的首领战/);
    expect(() => loadContentRegistry(modules)).toThrowError(/不存在的装备/);
  });

  it("supports fixed equipment rewards alongside an optional reward choice", () => {
    const modules = clonedModules();
    const rewards = questFile(modules).quests[0]!.rewards;
    rewards.fixedItemIds = ["15453"];
    rewards.itemChoiceIds = ["15452"];

    const content = loadContentRegistry(modules);
    expect(
      content.questById.get(asBrandedId<"QuestId">("rfc_returning_lost_satchel"))!.rewards,
    ).toMatchObject({
      fixedItemIds: ["15453"],
      itemChoiceIds: ["15452"],
    });
  });

  it("allows required and optional Boss goals but rejects a random rare Boss requirement", () => {
    const modules = clonedModules();
    const dungeonKey = Object.keys(modules).find((path) =>
      path.endsWith("/content/dungeons/ragefire-chasm.json"),
    )!;
    const route = (
      modules[dungeonKey] as {
        dungeons: Array<{
          route: Array<{
            encounterId: string;
            type: string;
            description?: { zhCN: string };
            spawnProbability?: number;
          }>;
        }>;
      }
    ).dungeons[0]!.route;
    const oggleflint = route.find((node) => node.encounterId === "oggleflint")!;
    oggleflint.type = "optional";
    oggleflint.description = { zhCN: "搜索侧路。" };
    expect(() => loadContentRegistry(modules)).not.toThrow();

    delete oggleflint.description;
    oggleflint.type = "rare";
    oggleflint.spawnProbability = 0.25;
    expect(() => loadContentRegistry(modules)).toThrowError(/不能要求随机稀有首领/);
  });
});
