import type { IdGenerator } from "../../application/ports/id-generator";
import type { ContentRegistry } from "../../content/registry";
import type { LootTable } from "../../content/schemas/dungeon";
import type { ItemSuffixDefinition } from "../../content/schemas/item-suffix";
import type { ExpeditionActivity, ExpeditionEncounterPlan } from "../activity/activity";
import type { ItemInstance, PendingLoot } from "../equipment/item-instance";
import { asBrandedId, type ItemDefinitionId } from "../shared/ids";
import { SeededRandomSource } from "../../infrastructure/random/seeded-random-source";

export interface GeneratedLoot {
  readonly instance: ItemInstance;
  readonly pending: PendingLoot;
}

export function generateGuaranteedLoot(
  activity: ExpeditionActivity,
  stage: ExpeditionEncounterPlan,
  lootTable: LootTable,
  content: ContentRegistry,
  acquiredAt: number,
  ids: IdGenerator,
): GeneratedLoot[] {
  const random = new SeededRandomSource(stage.lootSeed);
  return Array.from({ length: lootTable.guaranteedEquipmentDrops }, (_, dropIndex) => {
    const definitionId = weightedItem(lootTable, random.next(`drop:${dropIndex}`));
    const randomSuffixId = rollRandomSuffix(content, definitionId, stage.lootSeed, dropIndex);
    const instance: ItemInstance = {
      id: asBrandedId<"ItemInstanceId">(ids.next("item")),
      definitionId,
      ...(randomSuffixId ? { randomSuffixId } : {}),
      bound: false,
      acquiredAt,
      source: {
        type: "encounter",
        activityId: activity.id,
        dungeonId: activity.dungeonId,
        encounterId: stage.encounterId,
      },
      enchantmentIds: [],
    };
    const pending: PendingLoot = {
      id: asBrandedId<"PendingLootId">(ids.next("pending-loot")),
      itemInstanceId: instance.id,
      sourceActivityId: activity.id,
      eligibleMemberIds: [...activity.participantIds],
      acquiredAt,
    };
    return { instance, pending };
  });
}

function rollRandomSuffix(
  content: ContentRegistry,
  definitionId: ItemDefinitionId,
  lootSeed: string,
  dropIndex: number,
): ItemSuffixDefinition["id"] | undefined {
  const suffixes = content.getRandomSuffixesForItem(definitionId);
  if (suffixes.length === 0) return undefined;
  const random = new SeededRandomSource(`${lootSeed}:suffix:${dropIndex}`);
  return weightedSuffix(suffixes, random.next("suffix")).id;
}

function weightedItem(lootTable: LootTable, roll: number): ItemDefinitionId {
  const total = lootTable.items.reduce((sum, entry) => sum + entry.weight, 0);
  let cursor = roll * total;
  for (const entry of lootTable.items) {
    cursor -= entry.weight;
    if (cursor <= 0) return entry.itemId;
  }
  return lootTable.items.at(-1)!.itemId;
}

function weightedSuffix(
  suffixes: readonly ItemSuffixDefinition[],
  roll: number,
): ItemSuffixDefinition {
  const total = suffixes.reduce((sum, suffix) => sum + suffix.relativeWeight, 0);
  let cursor = roll * total;
  for (const suffix of suffixes) {
    cursor -= suffix.relativeWeight;
    if (cursor <= 0) return suffix;
  }
  return suffixes.at(-1)!;
}
