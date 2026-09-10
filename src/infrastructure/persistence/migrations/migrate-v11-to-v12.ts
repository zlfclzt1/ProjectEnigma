import {
  GAME_STATE_SAVE_VERSION,
  type GameState,
  type LegacyGameStateV11,
} from "../../../domain/game-state";
import { createEmptyRosterPresetState } from "../../../domain/guild/roster-preset";

export function migrateV11ToV12(legacy: LegacyGameStateV11): GameState {
  return {
    ...structuredClone(legacy),
    saveVersion: GAME_STATE_SAVE_VERSION,
    rosterPresets: createEmptyRosterPresetState(),
  };
}
