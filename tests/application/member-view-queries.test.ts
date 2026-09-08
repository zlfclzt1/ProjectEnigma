import { describe, expect, it } from "vitest";
import {
  getMemberDetailView,
  getMemberDirectoryView,
} from "../../src/application/queries/get-members-view";
import { loadBrowserContentRegistry } from "../../src/content/manifest";
import { evaluateEquipEligibility } from "../../src/domain/equipment/equip-rules";
import { equipItem } from "../../src/domain/equipment/equipment";
import type { ItemInstance } from "../../src/domain/equipment/item-instance";
import { createNewGame } from "../../src/domain/guild/new-game";
import { asBrandedId } from "../../src/domain/shared/ids";
import { LocalIdGenerator } from "../../src/infrastructure/ids/local-id-generator";
import { SeededRandomSource } from "../../src/infrastructure/random/seeded-random-source";
import { FakeClock } from "../helpers/runtime-fakes";

const content = loadBrowserContentRegistry();

function state() {
  return createNewGame({
    slotId: asBrandedId<"SaveSlotId">("member-view"),
    content,
    contentVersion: asBrandedId<"ContentVersion">("classic-v1"),
    clock: new FakeClock(1_000),
    ids: new LocalIdGenerator(),
    random: new SeededRandomSource("member-view"),
  });
}

describe("member view queries", () => {
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
    expect(item.iconUrl).toMatch(/^https:\/\/wow\.zamimg\.com\/images\/wow\/icons\/large\//);
    expect(item.stats.length).toBeGreaterThan(0);
    expect(item.statsSource).toBe("Wowhead Classic · 2026-09-08");
    expect(item.acquisitionSource).toContain("怒焰裂谷");
    expect(item.acquisitionSource).toContain("奥格弗林特");
    expect(item.requirements[0]).toMatch(/^需要等级 /);
  });
});
