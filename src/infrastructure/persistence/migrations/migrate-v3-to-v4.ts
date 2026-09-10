import { type LegacyGameStateV4, type LegacyGameStateV3 } from "../../../domain/game-state";
import type { ItemInstance } from "../../../domain/equipment/item-instance";

export function migrateV3ToV4(legacy: LegacyGameStateV3): LegacyGameStateV4 {
  const itemInstances = Object.fromEntries(
    Object.entries(legacy.itemInstances).map(([id, legacyInstance]) => {
      const instance = structuredClone(legacyInstance) as ItemInstance;
      delete instance.randomSuffixId;
      return [id, instance];
    }),
  ) as LegacyGameStateV4["itemInstances"];

  return {
    ...structuredClone(legacy),
    saveVersion: 4,
    itemInstances,
  };
}
