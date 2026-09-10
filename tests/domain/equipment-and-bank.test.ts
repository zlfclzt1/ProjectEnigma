import { describe, expect, it } from "vitest";
import { loadBrowserContentRegistry } from "../../src/content/manifest";
import type { ItemDefinition } from "../../src/content/schemas/item";
import {
  candidateEquipmentSlots,
  chooseEquipmentSlot,
  equipItem,
  EquipmentRuleError,
} from "../../src/domain/equipment/equipment";
import { evaluateEquipEligibility } from "../../src/domain/equipment/equip-rules";
import type { ItemInstance } from "../../src/domain/equipment/item-instance";
import {
  addStackToGuildBank,
  depositEquipmentInGuildBank,
  removeStackFromGuildBank,
  withdrawEquipmentFromGuildBank,
  type GuildBankCapacityPolicy,
} from "../../src/domain/inventory/guild-bank-rules";
import { asBrandedId } from "../../src/domain/shared/ids";
import { createItemInstanceFixture, createMemberFixture } from "../helpers/game-state-v2-factory";

const content = loadBrowserContentRegistry();

function definition(id: string): ItemDefinition {
  const item = content.itemById.get(asBrandedId<"ItemDefinitionId">(id));
  if (!item) throw new Error(`Missing item definition ${id}`);
  return item;
}

function instance(id: string, definitionId: string): ItemInstance {
  return createItemInstanceFixture({
    id: asBrandedId<"ItemInstanceId">(id),
    definitionId: asBrandedId<"ItemDefinitionId">(definitionId),
    ownerMemberId: undefined,
    bound: false,
  });
}

describe("V2 equipment rules", () => {
  it("checks class, role, armor, ownership and active-activity restrictions", () => {
    const member = createMemberFixture({
      activeActivityId: asBrandedId<"ActivityId">("activity_1"),
    });
    const item = instance("item_candidate", "14148");
    const displayLevelCloth = { ...definition("14148"), requiredLevel: 20 };
    const result = evaluateEquipEligibility(member, item, displayLevelCloth, {
      content,
      itemInstances: {},
    });

    expect(result.allowed).toBe(false);
    expect(result.failures.map((failure) => failure.code)).toEqual([
      "member-busy",
      "class-restricted",
      "role-restricted",
    ]);
    expect(result.failures.map((failure) => failure.code)).not.toContain("level-too-low");

    const owned = { ...item, ownerMemberId: asBrandedId<"MemberId">("member_2"), bound: true };
    expect(
      evaluateEquipEligibility(createMemberFixture(), owned, definition("14148"), {
        content,
        itemInstances: {},
      }).failures.map((failure) => failure.code),
    ).toContain("owned-by-another-member");
  });

  it("allows lighter armor and unlocks the Classic level-40 armor promotions", () => {
    const warrior = createMemberFixture({
      progression: {
        level: 40,
        experience: 0,
        specId: asBrandedId<"SpecId">("warrior_protection"),
      },
    });
    const plate = {
      ...definition("10775"),
      restrictions: { allowedClassIds: [], allowedRoles: [] },
    };
    const plateInstance = instance("plate", "10775");

    expect(
      evaluateEquipEligibility(warrior, plateInstance, plate, { content, itemInstances: {} })
        .allowed,
    ).toBe(true);
    expect(
      evaluateEquipEligibility(
        { ...warrior, progression: { ...warrior.progression, level: 39 } },
        plateInstance,
        plate,
        { content, itemInstances: {} },
      ).failures.map((failure) => failure.code),
    ).toContain("armor-type-mismatch");

    const cloth = {
      ...definition("14148"),
      restrictions: { allowedClassIds: [], allowedRoles: [] },
    };
    expect(
      evaluateEquipEligibility(warrior, instance("cloth", "14148"), cloth, {
        content,
        itemInstances: {},
      }).allowed,
    ).toBe(true);
  });

  it("treats both ring and trinket slots as interchangeable and replaces the weaker slot", () => {
    const member = createMemberFixture({
      equipment: {
        ring1: asBrandedId<"ItemInstanceId">("strong_ring"),
        ring2: asBrandedId<"ItemInstanceId">("starter_ring"),
      },
    });
    const itemInstances = {
      strong_ring: instance("strong_ring", "6321"),
      starter_ring: instance("starter_ring", "starter_ring2"),
    };
    const context = { content, itemInstances };

    expect(candidateEquipmentSlots(definition("6321"))).toEqual(["ring1", "ring2"]);
    expect(chooseEquipmentSlot(member, definition("6321"), context)).toBe("ring2");
    expect(candidateEquipmentSlots(definition("starter_trinket2"))).toEqual([
      "trinket1",
      "trinket2",
    ]);
  });

  it("binds equipped items, records ownership and clears the off hand for two-handed weapons", () => {
    const member = createMemberFixture({
      progression: {
        level: 20,
        experience: 0,
        specId: asBrandedId<"SpecId">("warrior_arms"),
      },
      equipment: {
        mainHand: asBrandedId<"ItemInstanceId">("old_main"),
        offHand: asBrandedId<"ItemInstanceId">("old_offhand"),
      },
    });
    const newWeapon = instance("new_weapon", "5187");
    const itemInstances = {
      old_main: instance("old_main", "starter_main_hand"),
      old_offhand: instance("old_offhand", "starter_off_hand"),
      new_weapon: newWeapon,
    };
    const result = equipItem(member, newWeapon, { content, itemInstances });

    expect(result.equippedSlot).toBe("mainHand");
    expect(result.member.equipment.mainHand).toBe(newWeapon.id);
    expect(result.member.equipment.offHand).toBeUndefined();
    expect(result.displacedItemInstanceIds).toEqual([
      asBrandedId<"ItemInstanceId">("old_main"),
      asBrandedId<"ItemInstanceId">("old_offhand"),
    ]);
    expect(result.equippedInstance.ownerMemberId).toBe(member.id);
    expect(result.equippedInstance.bound).toBe(true);
  });

  it("rejects an off-hand item while a two-handed main hand is equipped", () => {
    const member = createMemberFixture({
      progression: {
        level: 20,
        experience: 0,
        specId: asBrandedId<"SpecId">("warrior_arms"),
      },
      equipment: { mainHand: asBrandedId<"ItemInstanceId">("two_hander") },
    });
    const offHand = instance("offhand", "starter_off_hand");
    const itemInstances = { two_hander: instance("two_hander", "5187") };

    expect(() => equipItem(member, offHand, { content, itemInstances })).toThrowError(
      EquipmentRuleError,
    );
    expect(
      evaluateEquipEligibility(member, offHand, definition("starter_off_hand"), {
        content,
        itemInstances,
      }).failures.map((failure) => failure.code),
    ).toContain("two-handed-main-hand");
  });
});

describe("V2 guild bank rules", () => {
  it("adds and removes stackable materials without mutating the input bank", () => {
    const materialId = asBrandedId<"ItemDefinitionId">("copper_ore");
    const empty = { stackCounts: {}, equipmentInstanceIds: [] };
    const added = addStackToGuildBank(empty, materialId, 5);
    const removed = removeStackFromGuildBank(added, materialId, 2);

    expect(empty.stackCounts).toEqual({});
    expect(added.stackCounts[materialId]).toBe(5);
    expect(removed.stackCounts[materialId]).toBe(3);
    expect(() => removeStackFromGuildBank(removed, materialId, 4)).toThrow(/材料不足/);
  });

  it("stores independent unbound equipment instances and supports future capacity policies", () => {
    const empty = { stackCounts: {}, equipmentInstanceIds: [] };
    const equipment = instance("bank_item", "14148");
    const deposited = depositEquipmentInGuildBank(empty, equipment);
    const withdrawn = withdrawEquipmentFromGuildBank(deposited, equipment.id);
    const fullCapacity: GuildBankCapacityPolicy = {
      canAddStack: () => false,
      canAddEquipment: () => false,
    };

    expect(deposited.equipmentInstanceIds).toEqual([equipment.id]);
    expect(withdrawn.equipmentInstanceIds).toEqual([]);
    expect(() => depositEquipmentInGuildBank(empty, equipment, fullCapacity)).toThrow(/容量不足/);
    expect(() => depositEquipmentInGuildBank(empty, { ...equipment, bound: true })).toThrow(
      /已绑定/,
    );
  });
});
