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

function contentWithSecondSource(itemId: string): ContentRegistry {
  const modules = structuredClone(browserContentModules) as Record<string, unknown>;
  const key = Object.keys(modules).find((path) =>
    path.endsWith("/content/loot-tables/deadmines.json"),
  );
  if (!key) throw new Error("Expected Deadmines loot content");
  const file = modules[key] as {
    lootTables: Array<{ id: string; items: Array<{ itemId: string; weight: number }> }>;
  };
  const table = file.lootTables.find((entry) => entry.id === "dm_rhahkzor");
  if (!table) throw new Error("Expected Rhahk'Zor loot table");
  table.items.push({ itemId, weight: 100 });
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
      totalItemCount: 404,
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

  it("reveals both Library boss pools after the wing is unlocked", () => {
    const game = state();
    game.guild.unlockedDungeonIds.push(asBrandedId<"DungeonId">("scarlet_monastery_library"));

    const view = getItemCatalogView(game, content);
    const library = view.dungeons.find((dungeon) => dungeon.id === "scarlet_monastery_library")!;
    if (!library.unlocked) throw new Error("Expected unlocked Scarlet Monastery Library");

    expect(library.totalItemCount).toBe(6);
    expect(library.encounters).toEqual([
      expect.objectContaining({
        id: "scarlet_library_houndmaster_loksey",
        items: expect.arrayContaining([
          expect.objectContaining({ id: "7710" }),
          expect.objectContaining({ id: "7756" }),
        ]),
      }),
      expect.objectContaining({
        id: "scarlet_library_arcanist_doan",
        items: expect.arrayContaining([
          expect.objectContaining({ id: "7714" }),
          expect.objectContaining({ id: "7713" }),
          expect.objectContaining({ id: "7712" }),
          expect.objectContaining({ id: "7711" }),
        ]),
      }),
    ]);
  });

  it("lists every unlocked boss source while counting a base item only once", () => {
    const registry = contentWithSecondSource("14148");
    const game = state();
    game.guild.unlockedDungeonIds.push(asBrandedId<"DungeonId">("deadmines"));
    acquire(game, registry, "14148", 1);

    const view = getItemCatalogView(game, registry);
    const ragefire = view.dungeons.find((dungeon) => dungeon.id === "ragefire_chasm")!;
    if (!ragefire.unlocked) throw new Error("Expected unlocked Ragefire Chasm");
    const item = ragefire.encounters
      .flatMap((encounter) => encounter.items)
      .find((candidate) => candidate.id === "14148")!;

    expect(item.sources).toHaveLength(2);
    expect(item.sources).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          dungeonId: "ragefire_chasm",
          encounterId: "taragaman_the_hungerer",
        }),
        expect.objectContaining({ dungeonId: "deadmines", encounterId: "dm_rhahkzor" }),
      ]),
    );
    expect(item.acquisitionCount).toBe(1);
    expect(view.globalProgress).toMatchObject({ acquiredItemCount: 1, totalItemCount: 404 });
  });

  it("reveals all four Herod drops after Armory is unlocked", () => {
    const game = state();
    game.guild.unlockedDungeonIds.push(asBrandedId<"DungeonId">("scarlet_monastery_armory"));

    const view = getItemCatalogView(game, content);
    const armory = view.dungeons.find((dungeon) => dungeon.id === "scarlet_monastery_armory")!;
    if (!armory.unlocked) throw new Error("Expected unlocked Scarlet Monastery Armory");

    expect(armory.totalItemCount).toBe(4);
    expect(armory.encounters).toEqual([
      expect.objectContaining({
        id: "scarlet_armory_herod",
        items: expect.arrayContaining([
          expect.objectContaining({ id: "7719" }),
          expect.objectContaining({ id: "7718" }),
          expect.objectContaining({ id: "10330" }),
          expect.objectContaining({ id: "7717" }),
        ]),
      }),
    ]);
  });

  it("lists both grouped encounters for every shared Sunken Temple dragon item", () => {
    const game = state();
    game.guild.unlockedDungeonIds.push(asBrandedId<"DungeonId">("sunken_temple"));

    const view = getItemCatalogView(game, content);
    const temple = view.dungeons.find((dungeon) => dungeon.id === "sunken_temple")!;
    if (!temple.unlocked) throw new Error("Expected unlocked Sunken Temple");
    const nightfallDrape = temple.encounters
      .flatMap((encounter) => encounter.items)
      .find((item) => item.id === "12465")!;

    expect(nightfallDrape.sources).toEqual([
      expect.objectContaining({
        encounterId: "sunken_temple_dreamscythe_and_weaver",
        encounterName: "德姆塞卡尔与德拉维沃尔",
      }),
      expect.objectContaining({
        encounterId: "sunken_temple_morphaz_and_hazzas",
        encounterName: "摩弗拉斯与哈扎斯",
      }),
    ]);
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
      "7683",
      "7710",
      "19507",
      "10776",
      "10775",
      "9389",
      "9388",
      "9390",
      "9640",
      "17746",
      "17744",
      "17745",
      "17749",
      "17748",
      "17750",
      "17751",
      "17755",
      "22234",
      "11632",
      "11631",
      "22397",
      "11626",
      "11624",
      "11820",
      "11821",
      "11810",
      "11817",
      "11816",
      "11823",
    ].forEach((itemId, index) => acquire(game, content, itemId, index + 1));

    const view = getItemCatalogView(game, content);
    const wailing = view.dungeons.find((dungeon) => dungeon.id === "wailing_caverns")!;
    if (!wailing.unlocked) throw new Error("Expected unlocked Wailing Caverns");
    expect(wailing).toMatchObject({
      acquiredItemCount: 11,
      totalItemCount: 21,
      completionPercent: (11 / 21) * 100,
    });
    expect(view.itemSets).toEqual([]);
    expect(view.globalProgress).toMatchObject({ acquiredItemCount: 41, totalItemCount: 404 });
    expect(view.globalProgress.completionPercent).toBeCloseTo((41 / 404) * 100);
    expect(view.rewards).toHaveLength(2);
    expect(view.rewards.every((reward) => reward.claimable)).toBe(true);
    expect(view.rewards.every((reward) => !reward.claimed)).toBe(true);
  });
});
