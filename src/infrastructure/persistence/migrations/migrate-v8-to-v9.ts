import {
  GAME_STATE_SAVE_VERSION,
  type GameState,
  type LegacyGameStateV8,
} from "../../../domain/game-state";

export function migrateV8ToV9(legacy: LegacyGameStateV8): GameState {
  const activities = Object.fromEntries(
    Object.entries(legacy.activities).map(([activityId, activity]) => [
      activityId,
      activity.type === "expedition"
        ? {
            ...structuredClone(activity),
            runPlans: activity.runPlans.map((run) => ({
              ...structuredClone(run),
              rareNodeReveals: {},
            })),
          }
        : structuredClone(activity),
    ]),
  ) as GameState["activities"];
  return {
    ...structuredClone(legacy),
    saveVersion: GAME_STATE_SAVE_VERSION,
    activities,
  };
}
