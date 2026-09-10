import type { ContentRegistry } from "../../../content/registry";
import {
  createEmptyCollectionState,
  recordAcquiredItem,
  type CollectionState,
} from "../../../domain/collection/item-collection";
import { type LegacyGameStateV4, type LegacyGameStateV5 } from "../../../domain/game-state";

export function migrateV4ToV5(
  legacy: LegacyGameStateV4,
  content: ContentRegistry,
): LegacyGameStateV5 {
  const collection = collectionFromExistingItems(legacy, content);
  return {
    ...structuredClone(legacy),
    saveVersion: 5,
    collection,
  };
}

function collectionFromExistingItems(
  legacy: LegacyGameStateV4,
  content: ContentRegistry,
): CollectionState {
  const collection = createEmptyCollectionState();
  for (const instance of Object.values(legacy.itemInstances)) {
    if (!content.itemById.has(instance.definitionId)) continue;
    recordAcquiredItem(collection, instance, content);
  }
  return collection;
}
