import type { ContentRegistry } from "../../content/registry";
import type { GameStateV2 } from "../game-state";
import type { Member } from "../member/member";
import type { EquipmentSlot } from "./equipment-slot";
import { equipItem } from "./equipment";
import type { ItemInstance } from "./item-instance";

export const EQUIPMENT_SLOT_WEIGHTS: Readonly<Record<EquipmentSlot, number>> = {
  head: 1.2,
  neck: 0.7,
  shoulder: 1,
  back: 0.7,
  chest: 1.25,
  wrist: 0.75,
  hands: 0.9,
  waist: 0.85,
  legs: 1.2,
  feet: 0.9,
  ring1: 0.65,
  ring2: 0.65,
  trinket1: 0.8,
  trinket2: 0.8,
  mainHand: 1.45,
  offHand: 0.8,
  ranged: 0.65,
};

export function averageEquippedItemLevel(
  member: Member,
  itemInstances: GameStateV2["itemInstances"],
  content: ContentRegistry,
): number {
  let weightedLevels = 0;
  let totalWeight = 0;
  for (const [slot, weight] of Object.entries(EQUIPMENT_SLOT_WEIGHTS) as [
    EquipmentSlot,
    number,
  ][]) {
    totalWeight += weight;
    const instanceId = member.equipment[slot];
    const instance = instanceId ? itemInstances[instanceId] : undefined;
    const definition = instance ? content.itemById.get(instance.definitionId) : undefined;
    if (definition) weightedLevels += definition.itemLevel * weight;
  }
  return totalWeight > 0 ? weightedLevels / totalWeight : 0;
}

export interface ItemLevelUpgradeEvaluation {
  readonly gain: number;
  readonly currentItemLevel: number;
  readonly resultingItemLevel: number;
}

export function evaluateItemLevelUpgrade(
  member: Member,
  instance: ItemInstance,
  itemInstances: GameStateV2["itemInstances"],
  content: ContentRegistry,
): ItemLevelUpgradeEvaluation | null {
  try {
    const result = equipItem(member, instance, { content, itemInstances });
    const currentItemLevel = averageEquippedItemLevel(member, itemInstances, content);
    const resultingItemLevel = averageEquippedItemLevel(result.member, itemInstances, content);
    return {
      gain: resultingItemLevel - currentItemLevel,
      currentItemLevel,
      resultingItemLevel,
    };
  } catch {
    return null;
  }
}
