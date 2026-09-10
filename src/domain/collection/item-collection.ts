import type { ContentRegistry } from "../../content/registry";
import type { ItemInstance } from "../equipment/item-instance";
import type { CollectionRewardId, ItemDefinitionId, RandomSuffixId } from "../shared/ids";

export interface ItemCollectionRecord {
  acquisitionCount: number;
  seenRandomSuffixIds: RandomSuffixId[];
}

export interface CollectionState {
  items: Record<ItemDefinitionId, ItemCollectionRecord>;
  claimedRewardIds: CollectionRewardId[];
}

export function createEmptyCollectionState(): CollectionState {
  return {
    items: {},
    claimedRewardIds: [],
  };
}

export function recordAcquiredItem(
  collection: CollectionState,
  instance: ItemInstance,
  content: ContentRegistry,
): ItemCollectionRecord | undefined {
  const definition = content.itemById.get(instance.definitionId);
  if (!definition) throw new Error(`收藏记录引用了不存在的基础物品：${instance.definitionId}`);
  if (definition.isStarter) return undefined;

  const record = collection.items[instance.definitionId] ?? {
    acquisitionCount: 0,
    seenRandomSuffixIds: [],
  };
  record.acquisitionCount += 1;
  if (instance.randomSuffixId && !record.seenRandomSuffixIds.includes(instance.randomSuffixId)) {
    record.seenRandomSuffixIds.push(instance.randomSuffixId);
    record.seenRandomSuffixIds.sort();
  }
  collection.items[instance.definitionId] = record;
  return record;
}
