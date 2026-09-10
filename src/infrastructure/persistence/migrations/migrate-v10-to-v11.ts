import { type LegacyGameStateV11, type LegacyGameStateV10 } from "../../../domain/game-state";

export function migrateV10ToV11(legacy: LegacyGameStateV10): LegacyGameStateV11 {
  const activities = Object.fromEntries(
    Object.entries(legacy.activities).map(([activityId, activity]) => [
      activityId,
      activity.type === "expedition"
        ? { ...structuredClone(activity), questSnapshots: [] }
        : structuredClone(activity),
    ]),
  ) as LegacyGameStateV11["activities"];
  return {
    ...structuredClone(legacy),
    saveVersion: 11,
    activities,
  };
}
