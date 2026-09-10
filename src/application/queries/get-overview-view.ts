import type { GameState } from "../../domain/game-state";
import type { ActivityId } from "../../domain/shared/ids";
import type { ContentRegistry } from "../../content/registry";
import { getMemberCapacity } from "../../domain/guild/guild-upgrade-rules";

export interface ActivitySummaryView {
  readonly id: ActivityId;
  readonly type: string;
  readonly status: "active" | "completed" | "failed" | "cancelled";
  readonly participantCount: number;
  readonly nextSettlementAt?: number;
  readonly progressLabel: string;
}

export interface OverviewView {
  readonly guildName: string;
  readonly funds: number;
  readonly memberCount: number;
  readonly memberCapacity: number;
  readonly idleMemberCount: number;
  readonly activeMemberCount: number;
  readonly candidateCount: number;
  readonly candidateCapacity: number;
  readonly pendingLootCount: number;
  readonly completedExpeditionCount: number;
  readonly activities: readonly ActivitySummaryView[];
}

export function getOverviewView(state: GameState, content: ContentRegistry): OverviewView {
  const members = Object.values(state.members);
  const activities = Object.values(state.activities)
    .filter((activity) => activity.status === "active")
    .map((activity): ActivitySummaryView => {
      if (activity.type === "expedition") {
        const run = activity.runPlans[activity.activeRunIndex];
        const visibleStages =
          run?.stages.filter(
            (stage) =>
              stage.routeNodeType !== "rare" ||
              (stage.routeNodeId && run.rareNodeReveals?.[stage.routeNodeId] === "spawned"),
          ) ?? [];
        const currentStage = run?.stages[activity.activeEncounterIndex];
        const currentVisibleIndex = visibleStages.findIndex((stage) => stage === currentStage);
        const visibleIndex =
          currentVisibleIndex >= 0 ? currentVisibleIndex : Math.max(0, visibleStages.length - 1);
        return {
          id: activity.id,
          type: activity.type,
          status: "active",
          participantCount: activity.participantIds.length,
          nextSettlementAt: activity.nextSettlementAt,
          progressLabel: `第 ${activity.activeRunIndex + 1}/${activity.requestedRuns} 次 · Boss ${visibleIndex + 1}/${visibleStages.length}`,
        };
      }
      return {
        id: activity.id,
        type: activity.type,
        status: "active",
        participantCount: activity.participantIds.length,
        nextSettlementAt: activity.nextSettlementAt,
        progressLabel: "进行中",
      };
    });
  return {
    guildName: state.guild.name,
    funds: state.guild.funds,
    memberCount: members.length,
    memberCapacity: getMemberCapacity(state, content),
    idleMemberCount: members.filter((member) => !member.activeActivityId).length,
    activeMemberCount: members.filter((member) => member.activeActivityId).length,
    candidateCount: Object.keys(state.candidates).length,
    candidateCapacity: state.guild.candidateCapacity,
    pendingLootCount: Object.keys(state.pendingLoot).length,
    completedExpeditionCount: state.history.completedExpeditionCount,
    activities,
  };
}
