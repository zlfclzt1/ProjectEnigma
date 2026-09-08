import type { IdGenerator } from "../../application/ports/id-generator";
import type { LootTable } from "../../content/schemas/dungeon";
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
  acquiredAt: number,
  ids: IdGenerator,
): GeneratedLoot[] {
  const random = new SeededRandomSource(stage.lootSeed);
  return Array.from({ length: lootTable.guaranteedEquipmentDrops }, (_, dropIndex) => {
    const definitionId = weightedItem(lootTable, random.next(`drop:${dropIndex}`));
    const instance: ItemInstance = {
      id: asBrandedId<"ItemInstanceId">(ids.next("item")),
      definitionId,
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

function weightedItem(lootTable: LootTable, roll: number): ItemDefinitionId {
  const total = lootTable.items.reduce((sum, entry) => sum + entry.weight, 0);
  let cursor = roll * total;
  for (const entry of lootTable.items) {
    cursor -= entry.weight;
    if (cursor <= 0) return entry.itemId;
  }
  return lootTable.items.at(-1)!.itemId;
}
