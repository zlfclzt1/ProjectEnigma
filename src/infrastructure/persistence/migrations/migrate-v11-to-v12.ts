import type { LegacyGameStateV12, LegacyGameStateV11 } from "../../../domain/game-state";
import { createEmptyRosterPresetState } from "../../../domain/guild/roster-preset";

export function migrateV11ToV12(legacy: LegacyGameStateV11): LegacyGameStateV12 {
  return {
    ...structuredClone(legacy),
    saveVersion: 12,
    rosterPresets: createEmptyRosterPresetState(),
  };
}
