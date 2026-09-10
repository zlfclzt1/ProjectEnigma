import {
  GAME_STATE_SAVE_VERSION,
  type GameState,
  type LegacyGameStateV10,
} from "../../../domain/game-state";

export function migrateV10ToV11(legacy: LegacyGameStateV10): GameState {
  const activities = Object.fromEntries(
    Object.entries(legacy.activities).map(([activityId, activity]) => [
      activityId,
      activity.type === "expedition"
        ? { ...structuredClone(activity), questSnapshots: [] }
        : structuredClone(activity),
    ]),
  ) as GameState["activities"];
  return {
    ...structuredClone(legacy),
    saveVersion: GAME_STATE_SAVE_VERSION,
    activities,
  };
}
