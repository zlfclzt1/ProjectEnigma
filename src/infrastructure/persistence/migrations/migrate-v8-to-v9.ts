import type { LegacyGameStateV8, LegacyGameStateV9 } from "../../../domain/game-state";

export function migrateV8ToV9(legacy: LegacyGameStateV8): LegacyGameStateV9 {
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
  ) as LegacyGameStateV9["activities"];
  return {
    ...structuredClone(legacy),
    saveVersion: 9,
    activities,
  };
}
