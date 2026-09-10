import {
  GAME_STATE_SAVE_VERSION,
  type GameState,
  type LegacyGameStateV3,
} from "../../../domain/game-state";
import type { ItemInstance } from "../../../domain/equipment/item-instance";

export function migrateV3ToV4(legacy: LegacyGameStateV3): GameState {
  const itemInstances = Object.fromEntries(
    Object.entries(legacy.itemInstances).map(([id, legacyInstance]) => {
      const instance = structuredClone(legacyInstance) as ItemInstance;
      delete instance.randomSuffixId;
      return [id, instance];
    }),
  ) as GameState["itemInstances"];

  return {
    ...structuredClone(legacy),
    saveVersion: GAME_STATE_SAVE_VERSION,
    itemInstances,
  };
}
