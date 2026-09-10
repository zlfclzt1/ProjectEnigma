import { describe, expect, it } from "vitest";
import { getItemCatalogView } from "../../src/application/queries/get-item-catalog-view";
import { browserContentModules } from "../../src/content/manifest";
import { loadContentRegistry, type ContentRegistry } from "../../src/content/registry";
import { recordAcquiredItem } from "../../src/domain/collection/item-collection";
import type { GameState } from "../../src/domain/game-state";
import { asBrandedId } from "../../src/domain/shared/ids";
import {
  createGameStateFixture,
  createItemInstanceFixture,
} from "../helpers/game-state-v2-factory";

const content = loadContentRegistry(browserContentModules);

function state(): GameState {
  return createGameStateFixture({ activities: {} });
}

function contentWithPrototypeSuffix(itemId: string): ContentRegistry {
  const modules = structuredClone(browserContentModules) as Record<string, unknown>;
  const key = Object.keys(modules).find((path) =>
    path.endsWith("/content/items/ragefire-chasm.json"),
  );
  if (!key) throw new Error("Expected ragefire item content");
  const file = modules[key] as {
    items: Array<{ id: string; randomSuffixIds?: string[] }>;
  };
  const item = file.items.find((candidate) => candidate.id === itemId);
  if (!item) throw new Error(`Expected item ${itemId}`);
  item.randomSuffixIds = ["prototype_of_readiness"];
  return loadContentRegistry(modules);
}

function acquire(
  game: GameState,
  registry: ContentRegistry,
  definitionId: string,
  sequence: number,
  randomSuffixId?: string,
): void {
  const instance = createItemInstanceFixture({
    id: asBrandedId<"ItemInstanceId">(`catalog_item_${sequence}`),
    definitionId: asBrandedId<"ItemDefinitionId">(definitionId),
    ...(randomSuffixId ? { randomSuffixId: asBrandedId<"RandomSuffixId">(randomSuffixId) } : {}),
    ownerMemberId: undefined,
    bound: false,
  });
  game.itemInstances[instance.id] = instance;
  recordAcquiredItem(game.collection, instance, registry);
}

describe("item collection catalog query", () => {
  it("reveals complete encounter loot only for unlocked dungeons", () => {
    const view = getItemCatalogView(state(), content);
    const ragefire = view.dungeons.find((dungeon) => dungeon.id === "ragefire_chasm")!;
    const wailing = view.dungeons.find((dungeon) => dungeon.id === "wailing_caverns")!;

    expect(ragefire.unlocked).toBe(true);
    if (!ragefire.unlocked) throw new Error("Expected unlocked Ragefire Chasm");
    expect(ragefire.encounters).toHaveLength(4);
    expect(ragefire.totalItemCount).toBe(6);
    expect(ragefire.acquiredItemCount).toBe(0);
    const oggleflint = ragefire.encounters.find((encounter) => encounter.id === "oggleflint")!;
    expect(oggleflint.items).toEqual([]);
    const taragaman = ragefire.encounters.find(
      (encounter) => encounter.id === "taragaman_the_hungerer",
    )!;
    expect(taragaman.items).toHaveLength(3);
    expect(taragaman.items.reduce((sum, item) => sum + item.source.perDropChance, 0)).toBeCloseTo(
      1,
    );
    expect(taragaman.items.every((item) => item.acquisitionCount === 0)).toBe(true);

    expect(wailing).toEqual({
      id: "wailing_caverns",
      name: "哀嚎洞穴",
      unlocked: false,
    });
    expect(view.itemSets).toEqual([]);
    expect(view.rewards.map((reward) => reward.id)).toEqual([
      "prototype_global_catalog_ten_percent",
    ]);
    expect(view.globalProgress).toEqual({
      acquiredItemCount: 0,
      totalItemCount: 114,
      completionPercent: 0,
    });
    expect(JSON.stringify(view)).not.toContain("尖牙腰带");
    expect(JSON.stringify(view)).not.toContain("prototype_wailing_caverns_collection");
  });

  it("projects base-item discovery counts and possible and seen suffixes consistently", () => {
    const suffixContent = contentWithPrototypeSuffix("14148");
    const game = state();
    acquire(game, suffixContent, "14148", 1);
    acquire(game, suffixContent, "14148", 2, "prototype_of_readiness");

    const view = getItemCatalogView(game, suffixContent);
    const ragefire = view.dungeons.find((dungeon) => dungeon.id === "ragefire_chasm")!;
    if (!ragefire.unlocked) throw new Error("Expected unlocked Ragefire Chasm");
    const item = ragefire.encounters
      .flatMap((encounter) => encounter.items)
      .find((candidate) => candidate.id === "14148")!;

    expect(item.name).toBe("水晶腕轮");
    expect(item.acquired).toBe(true);
    expect(item.acquisitionCount).toBe(2);
    expect(item.possibleRandomSuffixes).toEqual([{ id: "prototype_of_readiness", name: "整备之" }]);
    expect(item.seenRandomSuffixes).toEqual([{ id: "prototype_of_readiness", name: "整备之" }]);
    expect(ragefire.acquiredItemCount).toBe(1);
    expect(ragefire.completionPercent).toBeCloseTo(100 / 6);
  });

  it("computes dungeon, set, global, claimable, and claimed progress without Vue", () => {
    const game = state();
    game.guild.unlockedDungeonIds.push(asBrandedId<"DungeonId">("wailing_caverns"));
    [
      "10412",
      "6460",
      "13245",
      "6472",
      "6449",
      "6469",
      "6631",
      "6627",
      "5404",
      "10410",
      "6465",
      "6681",
    ].forEach((itemId, index) => acquire(game, content, itemId, index + 1));

    const view = getItemCatalogView(game, content);
    const wailing = view.dungeons.find((dungeon) => dungeon.id === "wailing_caverns")!;
    if (!wailing.unlocked) throw new Error("Expected unlocked Wailing Caverns");
    expect(wailing).toMatchObject({
      acquiredItemCount: 11,
      totalItemCount: 21,
      completionPercent: (11 / 21) * 100,
    });
    expect(view.itemSets).toEqual([
      expect.objectContaining({
        id: "prototype_wailing_caverns_collection",
        acquiredItemCount: 2,
        totalItemCount: 2,
        completionPercent: 100,
      }),
    ]);
    expect(view.globalProgress).toMatchObject({ acquiredItemCount: 12, totalItemCount: 114 });
    expect(view.globalProgress.completionPercent).toBeCloseTo((12 / 114) * 100);
    expect(view.rewards).toHaveLength(3);
    expect(view.rewards.every((reward) => reward.claimable)).toBe(true);
    expect(view.rewards.every((reward) => !reward.claimed)).toBe(true);

    game.collection.claimedRewardIds.push(
      asBrandedId<"CollectionRewardId">("prototype_wailing_collection_set"),
    );
    const claimed = getItemCatalogView(game, content).rewards.find(
      (reward) => reward.id === "prototype_wailing_collection_set",
    )!;
    expect(claimed.claimed).toBe(true);
    expect(claimed.claimable).toBe(false);
    expect(claimed.condition).toMatchObject({
      type: "item-set-completion",
      scopeName: "哀嚎洞穴收藏原型",
      minimumPercent: 100,
      completionPercent: 100,
    });
  });
});
