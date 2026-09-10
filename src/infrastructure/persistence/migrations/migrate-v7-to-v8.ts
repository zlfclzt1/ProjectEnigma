import { type LegacyGameStateV8, type LegacyGameStateV7 } from "../../../domain/game-state";

export function migrateV7ToV8(legacy: LegacyGameStateV7): LegacyGameStateV8 {
  const activities = Object.fromEntries(
    Object.entries(legacy.activities).map(([activityId, activity]) => [
      activityId,
      activity.type === "expedition"
        ? { ...structuredClone(activity), selectedOptionalNodeIds: [] }
        : structuredClone(activity),
    ]),
  ) as LegacyGameStateV8["activities"];
  return {
    ...structuredClone(legacy),
    saveVersion: 8,
    activities,
  };
}
