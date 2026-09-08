import type { GameStateV2 } from "../../domain/game-state";
import type { ActivityId } from "../../domain/shared/ids";

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

export function getOverviewView(state: GameStateV2): OverviewView {
  const members = Object.values(state.members);
  const activities = Object.values(state.activities)
    .filter((activity) => activity.status === "active")
    .map((activity): ActivitySummaryView => {
      if (activity.type === "expedition") {
        const run = activity.runPlans[activity.activeRunIndex];
        return {
          id: activity.id,
          type: activity.type,
          status: "active",
          participantCount: activity.participantIds.length,
          nextSettlementAt: activity.nextSettlementAt,
          progressLabel: `第 ${activity.activeRunIndex + 1}/${activity.requestedRuns} 次 · Boss ${activity.activeEncounterIndex + 1}/${run?.stages.length ?? 0}`,
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
    memberCapacity: state.guild.memberCapacity,
    idleMemberCount: members.filter((member) => !member.activeActivityId).length,
    activeMemberCount: members.filter((member) => member.activeActivityId).length,
    candidateCount: Object.keys(state.candidates).length,
    candidateCapacity: state.guild.candidateCapacity,
    pendingLootCount: Object.keys(state.pendingLoot).length,
    completedExpeditionCount: state.history.completedExpeditionCount,
    activities,
  };
}
