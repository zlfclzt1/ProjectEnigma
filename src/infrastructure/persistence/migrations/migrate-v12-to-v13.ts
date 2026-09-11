import type { ContentRegistry } from "../../../content/registry";
import { type LegacyGameStateV13, type LegacyGameStateV12 } from "../../../domain/game-state";
import {
  buildExpeditionDevelopmentSnapshot,
  createEmptyDungeonDevelopmentState,
  type DungeonCommissionProgress,
} from "../../../domain/dungeon/dungeon-development";
import type { EncounterId } from "../../../domain/shared/ids";

export function migrateV12ToV13(
  legacy: LegacyGameStateV12,
  content: ContentRegistry,
): LegacyGameStateV13 {
  const cloned = structuredClone(legacy);
  const dungeonDevelopment = createEmptyDungeonDevelopmentState();

  for (const quest of content.quests) {
    const legacyProgress = Object.values(cloned.members).flatMap((member) => {
      const progress = member.quests.entries[quest.id];
      return progress ? [progress] : [];
    });
    const claimed = legacyProgress.filter((progress) => progress.status === "claimed");
    if (claimed.length > 0) {
      const completedAt = Math.min(
        ...claimed.map(
          (progress) => progress.claimedAt ?? progress.completedAt ?? progress.acceptedAt,
        ),
      );
      dungeonDevelopment.entries[quest.id] = {
        questId: quest.id,
        status: "completed",
        discoveredAt: Math.min(...claimed.map((progress) => progress.acceptedAt)),
        encounterVictoryIds: mergedVictories(legacyProgress),
        completedAt,
        completionEncounterId:
          quest.completion.type === "encounter-victories"
            ? quest.completion.encounterIds.at(-1)
            : finalRequiredEncounterId(content, quest.dungeonId),
      };
      continue;
    }
    if (legacyProgress.length === 0) continue;
    const progress: DungeonCommissionProgress = {
      questId: quest.id,
      status: "investigating",
      discoveredAt: Math.min(...legacyProgress.map((entry) => entry.acceptedAt)),
      encounterVictoryIds: mergedVictories(legacyProgress),
    };
    dungeonDevelopment.entries[quest.id] = progress;
  }
  for (const member of Object.values(cloned.members)) member.quests.entries = {};

  const stateBase = {
    ...cloned,
    saveVersion: 13,
    dungeonDevelopment,
  } as LegacyGameStateV13;
  const activities = Object.fromEntries(
    Object.entries(cloned.activities).map(([activityId, activity]) => {
      if (activity.type !== "expedition") return [activityId, activity];
      const includedEncounterIds = [
        ...new Set(
          activity.runPlans.flatMap((run) => run.stages.map((stage) => stage.encounterId)),
        ),
      ];
      return [
        activityId,
        {
          ...activity,
          questSnapshots: [],
          developmentSnapshot: buildExpeditionDevelopmentSnapshot(
            stateBase,
            content,
            activity.dungeonId,
            activity.participantIds,
            includedEncounterIds,
            activity.selectedOptionalNodeIds,
          ),
          developmentEvents: [],
        },
      ];
    }),
  ) as LegacyGameStateV13["activities"];
  return { ...stateBase, activities };
}

function mergedVictories(
  progress: readonly { readonly encounterVictoryIds: readonly EncounterId[] }[],
): EncounterId[] {
  return [...new Set(progress.flatMap((entry) => entry.encounterVictoryIds))];
}

function finalRequiredEncounterId(
  content: ContentRegistry,
  dungeonId: LegacyGameStateV12["guild"]["unlockedDungeonIds"][number],
): EncounterId | undefined {
  return content.dungeonById
    .get(dungeonId)
    ?.route.filter((node) => node.type === "required")
    .at(-1)?.encounterId;
}
