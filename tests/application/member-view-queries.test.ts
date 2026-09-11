import { describe, expect, it } from "vitest";
import {
  getItemStatLines,
  getMemberDetailView,
  getMemberDirectoryView,
} from "../../src/application/queries/get-members-view";
import { browserContentModules, loadBrowserContentRegistry } from "../../src/content/manifest";
import { loadContentRegistry, type ContentRegistry } from "../../src/content/registry";
import { evaluateEquipEligibility } from "../../src/domain/equipment/equip-rules";
import { equipItem } from "../../src/domain/equipment/equipment";
import type { ItemInstance } from "../../src/domain/equipment/item-instance";
import { createNewGame } from "../../src/domain/guild/new-game";
import { asBrandedId } from "../../src/domain/shared/ids";
import { LocalIdGenerator } from "../../src/infrastructure/ids/local-id-generator";
import { SeededRandomSource } from "../../src/infrastructure/random/seeded-random-source";
import { FakeClock } from "../helpers/runtime-fakes";

const content = loadBrowserContentRegistry();

function state(registry: ContentRegistry = content) {
  return createNewGame({
    slotId: asBrandedId<"SaveSlotId">("member-view"),
    content: registry,
    contentVersion: asBrandedId<"ContentVersion">("classic-v1"),
    clock: new FakeClock(1_000),
    ids: new LocalIdGenerator(),
    random: new SeededRandomSource("member-view"),
  });
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
  const item = file.items.find((entry) => entry.id === itemId);
  if (!item) throw new Error(`Expected item ${itemId}`);
  item.randomSuffixIds = ["prototype_of_readiness"];
  return loadContentRegistry(modules);
}

describe("member view queries", () => {
  it("renders stat penalties and regeneration with authentic signs and units", () => {
    expect(
      getItemStatLines({
        primary: { spiritPoints: -3 },
        spell: { healthRegenPer5Seconds: 3, manaRegenPer5Seconds: 3 },
      }),
    ).toEqual([
      { id: "spiritPoints", label: "精神", value: "-3", numericValue: -3 },
      {
        id: "healthRegenPer5Seconds",
        label: "每 5 秒生命回复",
        value: "+3",
        numericValue: 3,
      },
      {
        id: "manaRegenPer5Seconds",
        label: "每 5 秒法力回复",
        value: "+3",
        numericValue: 3,
      },
    ]);
  });

  it("projects the directory and a complete explainable character sheet", () => {
    const game = state();
    const directory = getMemberDirectoryView(game, content);
    const member = directory.members[0]!;
    const detail = getMemberDetailView(game, content, member.id)!;

    expect(directory.members).toHaveLength(5);
    expect(directory.classOptions).toHaveLength(9);
    expect(directory.roleOptions.map((role) => role.id)).toEqual(["tank", "healer", "dps"]);
    expect(detail.equipment).toHaveLength(17);
    expect(detail.equipment.every((slot) => slot.item)).toBe(true);
    expect(detail.aggregateStats.length).toBeGreaterThan(0);
    expect(detail.capabilities.damage).toBeGreaterThan(0);
    expect(detail.formulaVersion).toBe("classic-light-v1");
    expect(detail.contributions.length).toBeGreaterThan(0);
    expect(detail.availableSpecs.every((spec) => spec.id.startsWith(member.classId))).toBe(true);
    expect(detail.equipment[0]!.item).toMatchObject({
      acquisitionSource: "加入公会时携带",
      statsSource: "游戏设计数据 · 2026-09-08",
    });
  });

  it("resolves database icons, real attributes, restrictions, and encounter sources", () => {
    const game = state();
    const member = Object.values(game.members)[0]!;
    member.progression.level = 45;
    const definition = content.items.find((candidate) => {
      if (candidate.isStarter || candidate.icon.kind !== "database") return false;
      const instance: ItemInstance = {
        id: asBrandedId<"ItemInstanceId">("candidate-real-item"),
        definitionId: candidate.id,
        bound: false,
        acquiredAt: 2_000,
        source: {
          type: "encounter",
          activityId: asBrandedId<"ActivityId">("activity-real-item"),
          dungeonId: asBrandedId<"DungeonId">("ragefire_chasm"),
          encounterId: asBrandedId<"EncounterId">("oggleflint"),
        },
        enchantmentIds: [],
      };
      return evaluateEquipEligibility(member, instance, candidate, {
        content,
        itemInstances: game.itemInstances,
      }).allowed;
    })!;
    const instance: ItemInstance = {
      id: asBrandedId<"ItemInstanceId">("real-item"),
      definitionId: definition.id,
      bound: false,
      acquiredAt: 2_000,
      source: {
        type: "encounter",
        activityId: asBrandedId<"ActivityId">("activity-real-item"),
        dungeonId: asBrandedId<"DungeonId">("ragefire_chasm"),
        encounterId: asBrandedId<"EncounterId">("oggleflint"),
      },
      enchantmentIds: [],
    };
    game.itemInstances[instance.id] = instance;
    const equipped = equipItem(member, instance, {
      content,
      itemInstances: game.itemInstances,
    });
    game.members[member.id] = equipped.member;
    game.itemInstances[instance.id] = equipped.equippedInstance;

    const detail = getMemberDetailView(game, content, member.id)!;
    const item = detail.equipment.find((slot) => slot.item?.instanceId === instance.id)!.item!;
    expect(item.iconUrl).toMatch(/^\/assets\/item-icons\/[a-z0-9_]+\.jpg$/);
    expect(item.stats.length).toBeGreaterThan(0);
    expect(item.statsSource).toMatch(/^Wowhead Classic · 2026-09-0[89]$/);
    expect(item.acquisitionSource).toContain("怒焰裂谷");
    expect(item.acquisitionSource).toContain("奥格弗林特");
    expect(item.requirements[0]).toMatch(/^需要等级 /);
  });

  it("projects the resolved suffix name, total stats, and explicit suffix bonus", () => {
    const suffixContent = contentWithPrototypeSuffix("14148");
    const game = state(suffixContent);
    const member = Object.values(game.members)[0]!;
    member.identity.classId = asBrandedId<"ClassId">("mage");
    member.progression.specId = asBrandedId<"SpecId">("mage_arcane");
    const replacedId = member.equipment.wrist!;
    delete game.itemInstances[replacedId];
    const instance: ItemInstance = {
      id: asBrandedId<"ItemInstanceId">("suffix-item"),
      definitionId: asBrandedId<"ItemDefinitionId">("14148"),
      randomSuffixId: asBrandedId<"RandomSuffixId">("prototype_of_readiness"),
      ownerMemberId: member.id,
      bound: true,
      acquiredAt: 2_000,
      source: { type: "grant", reasonId: "suffix-view-test" },
      enchantmentIds: [],
    };
    member.equipment.wrist = instance.id;
    game.itemInstances[instance.id] = instance;

    const detail = getMemberDetailView(game, suffixContent, member.id)!;
    const item = detail.equipment.find((slot) => slot.id === "wrist")!.item!;

    expect(item.name).toBe("整备之水晶腕轮");
    expect(item.stats).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ id: "staminaPoints", value: "+1" }),
        expect.objectContaining({ id: "intellectPoints", value: "+1" }),
      ]),
    );
    expect(item.randomSuffix).toEqual({
      name: "整备之",
      stats: [expect.objectContaining({ id: "staminaPoints", value: "+1" })],
    });
    expect(detail.aggregateStats).toEqual(
      expect.arrayContaining([expect.objectContaining({ id: "staminaPoints" })]),
    );
  });
});
