import type { ContentRegistry } from "../../content/registry";
import type { ItemDefinition } from "../../content/schemas/item";
import type { Member } from "../member/member";
import type { ItemInstanceId } from "../shared/ids";
import type { EquipmentSlot } from "./equipment-slot";
import {
  evaluateEquipEligibility,
  type EquipFailureCode,
  type EquipRuleContext,
} from "./equip-rules";
import type { ItemInstance } from "./item-instance";
import { resolveItemInstance } from "./resolve-item-instance";

const INTERCHANGEABLE_SLOTS: Partial<Record<EquipmentSlot, readonly EquipmentSlot[]>> = {
  ring1: ["ring1", "ring2"],
  ring2: ["ring1", "ring2"],
  trinket1: ["trinket1", "trinket2"],
  trinket2: ["trinket1", "trinket2"],
};

export class EquipmentRuleError extends Error {
  constructor(readonly failureCodes: readonly EquipmentOperationFailureCode[]) {
    super(`不能装备该物品：${failureCodes.join(", ")}`);
    this.name = "EquipmentRuleError";
  }
}

export type EquipmentOperationFailureCode =
  EquipFailureCode | "invalid-preferred-slot" | "missing-definition";

export interface EquipItemContext extends EquipRuleContext {
  readonly content: ContentRegistry;
}

export interface EquipItemResult {
  readonly member: Member;
  readonly equippedInstance: ItemInstance;
  readonly equippedSlot: EquipmentSlot;
  readonly displacedItemInstanceIds: readonly ItemInstanceId[];
}

export function candidateEquipmentSlots(definition: ItemDefinition): readonly EquipmentSlot[] {
  return INTERCHANGEABLE_SLOTS[definition.slot] ?? [definition.slot];
}

function equippedItemLevel(member: Member, slot: EquipmentSlot, context: EquipItemContext): number {
  const instanceId = member.equipment[slot];
  const instance = instanceId ? context.itemInstances[instanceId] : undefined;
  return instance ? resolveItemInstance(instance, context.content).definition.itemLevel : -1;
}

export function chooseEquipmentSlot(
  member: Member,
  definition: ItemDefinition,
  context: EquipItemContext,
  preferredSlot?: EquipmentSlot,
): EquipmentSlot {
  const candidates = candidateEquipmentSlots(definition);
  if (preferredSlot) {
    if (!candidates.includes(preferredSlot)) {
      throw new EquipmentRuleError(["invalid-preferred-slot"]);
    }
    return preferredSlot;
  }
  return [...candidates].sort(
    (left, right) =>
      equippedItemLevel(member, left, context) - equippedItemLevel(member, right, context) ||
      candidates.indexOf(left) - candidates.indexOf(right),
  )[0];
}

export function equipItem(
  member: Member,
  instance: ItemInstance,
  context: EquipItemContext,
  preferredSlot?: EquipmentSlot,
): EquipItemResult {
  let definition;
  try {
    definition = resolveItemInstance(instance, context.content).definition;
  } catch {
    throw new EquipmentRuleError(["missing-definition"]);
  }
  const eligibility = evaluateEquipEligibility(member, instance, definition, context);
  if (!eligibility.allowed) {
    throw new EquipmentRuleError(eligibility.failures.map((failure) => failure.code));
  }

  const equippedSlot = chooseEquipmentSlot(member, definition, context, preferredSlot);
  const equipment = { ...member.equipment };
  for (const [slot, equippedId] of Object.entries(equipment)) {
    if (equippedId === instance.id) delete equipment[slot as EquipmentSlot];
  }
  const displaced = new Set<ItemInstanceId>();
  const replaced = equipment[equippedSlot];
  if (replaced && replaced !== instance.id) displaced.add(replaced);
  equipment[equippedSlot] = instance.id;
  if (definition.twoHanded) {
    const offHand = equipment.offHand;
    if (offHand && offHand !== instance.id) displaced.add(offHand);
    delete equipment.offHand;
  }

  return {
    member: { ...member, equipment },
    equippedInstance: { ...instance, ownerMemberId: member.id, bound: true },
    equippedSlot,
    displacedItemInstanceIds: Object.freeze([...displaced]),
  };
}
