import type { ContentRegistry } from "../../../content/registry";
import {
  createEmptyCollectionState,
  recordAcquiredItem,
  type CollectionState,
} from "../../../domain/collection/item-collection";
import {
  GAME_STATE_SAVE_VERSION,
  type GameState,
  type LegacyGameStateV4,
} from "../../../domain/game-state";

export function migrateV4ToV5(legacy: LegacyGameStateV4, content: ContentRegistry): GameState {
  const collection = collectionFromExistingItems(legacy, content);
  return {
    ...structuredClone(legacy),
    saveVersion: GAME_STATE_SAVE_VERSION,
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
