import type { IdGenerator } from "../../application/ports/id-generator";
import type { ContentRegistry } from "../../content/registry";
import type { LootTable } from "../../content/schemas/dungeon";
import type { ItemSuffixDefinition } from "../../content/schemas/item-suffix";
import type {
  ExpeditionActivity,
  ExpeditionEncounterPlan,
  ExpeditionRouteCompletionRewardSnapshot,
} from "../activity/activity";
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
  return generateEncounterLoot(activity, stage, lootTable, content, acquiredAt, ids, [], 0);
}

export function generateEncounterLoot(
  activity: ExpeditionActivity,
  stage: ExpeditionEncounterPlan,
  lootTable: LootTable | undefined,
  content: ContentRegistry,
  acquiredAt: number,
  ids: IdGenerator,
  unlockedItemIds: readonly ItemDefinitionId[],
  extraLootChance: number,
): GeneratedLoot[] {
  const random = new SeededRandomSource(stage.lootSeed);
  const baseItems = lootTable?.items ?? [];
  const unlockedWeight =
    baseItems.length > 0
      ? baseItems.reduce((sum, entry) => sum + entry.weight, 0) / baseItems.length
      : 1;
  const unlocked = unlockedItemIds
    .filter((itemId) => !baseItems.some((entry) => entry.itemId === itemId))
    .map((itemId) => ({ itemId, weight: unlockedWeight }));
  const items = [...baseItems, ...unlocked];
  if (items.length === 0) return [];
  const guaranteedDrops = lootTable?.guaranteedEquipmentDrops ?? 1;
  const extraDrops =
    extraLootChance > 0 && random.next("development-extra-drop") < extraLootChance ? 1 : 0;
  return Array.from({ length: guaranteedDrops + extraDrops }, (_, dropIndex) => {
    const definitionId = weightedItem(items, random.next(`drop:${dropIndex}`));
    const randomSuffixId = rollRandomSuffix(content, definitionId, stage.lootSeed, dropIndex);
    return createEncounterLoot(activity, stage, definitionId, randomSuffixId, acquiredAt, ids);
  });
}

export function generateSpecificEncounterLoot(
  activity: ExpeditionActivity,
  stage: ExpeditionEncounterPlan,
  content: ContentRegistry,
  acquiredAt: number,
  ids: IdGenerator,
  itemIds: readonly ItemDefinitionId[],
): GeneratedLoot[] {
  return itemIds.map((definitionId, index) =>
    createEncounterLoot(
      activity,
      stage,
      definitionId,
      rollRandomSuffix(content, definitionId, `${stage.lootSeed}:development-cache`, index),
      acquiredAt,
      ids,
    ),
  );
}

export function generateRouteCompletionLoot(
  activity: ExpeditionActivity,
  reward: ExpeditionRouteCompletionRewardSnapshot,
  content: ContentRegistry,
  acquiredAt: number,
  ids: IdGenerator,
): GeneratedLoot[] {
  const random = new SeededRandomSource(reward.lootSeed);
  return Array.from({ length: reward.guaranteedEquipmentDrops }, (_, dropIndex) => {
    const definitionId = weightedItem(reward.items, random.next(`drop:${dropIndex}`));
    const randomSuffixId = rollRandomSuffix(content, definitionId, reward.lootSeed, dropIndex);
    const instance: ItemInstance = {
      id: asBrandedId<"ItemInstanceId">(ids.next("item")),
      definitionId,
      ...(randomSuffixId ? { randomSuffixId } : {}),
      bound: false,
      acquiredAt,
      source: {
        type: "route-completion",
        activityId: activity.id,
        dungeonId: activity.dungeonId,
        routeVariantId: reward.routeVariantId,
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

function createEncounterLoot(
  activity: ExpeditionActivity,
  stage: ExpeditionEncounterPlan,
  definitionId: ItemDefinitionId,
  randomSuffixId: ItemSuffixDefinition["id"] | undefined,
  acquiredAt: number,
  ids: IdGenerator,
): GeneratedLoot {
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

function weightedItem(
  items: readonly { readonly itemId: ItemDefinitionId; readonly weight: number }[],
  roll: number,
): ItemDefinitionId {
  const total = items.reduce((sum, entry) => sum + entry.weight, 0);
  let cursor = roll * total;
  for (const entry of items) {
    cursor -= entry.weight;
    if (cursor <= 0) return entry.itemId;
  }
  return items.at(-1)!.itemId;
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
