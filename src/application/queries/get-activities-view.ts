import type { ContentRegistry } from "../../content/registry";
import type { ExpeditionActivity, ExpeditionEncounterPlan } from "../../domain/activity/activity";
import type { GameStateV2 } from "../../domain/game-state";
import type { ActivityId } from "../../domain/shared/ids";

export interface ActivityRouteStageView {
  readonly id: string;
  readonly name: string;
  readonly status: "pending" | "active" | "victory" | "defeat";
  readonly probability: number;
  readonly durationSeconds: number;
}

export interface ExpeditionActivityView {
  readonly id: ActivityId;
  readonly dungeonName: string;
  readonly status: ExpeditionActivity["status"];
  readonly statusLabel: string;
  readonly memberNames: readonly string[];
  readonly participantCount: number;
  readonly requestedRuns: number;
  readonly completedRuns: number;
  readonly currentRunNumber: number;
  readonly totalEncounterCount: number;
  readonly completedEncounterCount: number;
  readonly progressPercent: number;
  readonly nextSettlementAt?: number;
  readonly remainingMilliseconds?: number;
  readonly clearProbability: number;
  readonly durationSeconds: number;
  readonly formulaVersion: string;
  readonly route: readonly ActivityRouteStageView[];
}

export interface ActivitiesView {
  readonly active: readonly ExpeditionActivityView[];
  readonly history: readonly ExpeditionActivityView[];
}

function stageStatus(
  activity: ExpeditionActivity,
  stage: ExpeditionEncounterPlan,
  index: number,
): ActivityRouteStageView["status"] {
  if (stage.status !== "pending") return stage.status;
  if (
    activity.status === "active" &&
    index === activity.activeEncounterIndex &&
    activity.runPlans[activity.activeRunIndex]?.stages[index] === stage
  ) {
    return "active";
  }
  return "pending";
}

function statusLabel(status: ExpeditionActivity["status"]): string {
  return {
    scheduled: "等待出发",
    active: "进行中",
    completed: "已完成",
    failed: "灭团",
    cancelled: "已取消",
  }[status];
}

function projectActivity(
  state: GameStateV2,
  content: ContentRegistry,
  activity: ExpeditionActivity,
  now: number,
): ExpeditionActivityView {
  const allStages = activity.runPlans.flatMap((run) => run.stages);
  const completedEncounterCount = allStages.filter((stage) => stage.status !== "pending").length;
  const activeStage =
    activity.runPlans[activity.activeRunIndex]?.stages[activity.activeEncounterIndex];
  let partialProgress = 0;
  if (activity.status === "active" && activeStage) {
    const durationMilliseconds = activeStage.durationSeconds * 1_000;
    const stageStartedAt = activity.nextSettlementAt - durationMilliseconds;
    partialProgress = Math.min(1, Math.max(0, (now - stageStartedAt) / durationMilliseconds));
  }
  const currentRun = activity.runPlans[activity.activeRunIndex] ?? activity.runPlans.at(-1);
  return {
    id: activity.id,
    dungeonName: content.dungeonById.get(activity.dungeonId)?.name.zhCN ?? activity.dungeonId,
    status: activity.status,
    statusLabel: statusLabel(activity.status),
    memberNames: activity.participantIds.map(
      (memberId) =>
        state.members[memberId]?.identity.name ??
        activity.partySnapshot.members.find((member) => member.memberId === memberId)?.memberId ??
        memberId,
    ),
    participantCount: activity.participantIds.length,
    requestedRuns: activity.requestedRuns,
    completedRuns: activity.completedRuns,
    currentRunNumber: Math.min(activity.requestedRuns, activity.activeRunIndex + 1),
    totalEncounterCount: allStages.length,
    completedEncounterCount,
    progressPercent:
      allStages.length === 0
        ? 0
        : Math.min(100, ((completedEncounterCount + partialProgress) / allStages.length) * 100),
    ...(activity.status === "active" ? { nextSettlementAt: activity.nextSettlementAt } : {}),
    ...(activity.status === "active"
      ? { remainingMilliseconds: Math.max(0, activity.nextSettlementAt - now) }
      : {}),
    clearProbability: activity.partySnapshot.clearProbability,
    durationSeconds: activity.partySnapshot.durationSeconds,
    formulaVersion: activity.partySnapshot.formulaVersion,
    route: (currentRun?.stages ?? []).map((stage, index) => ({
      id: stage.encounterId,
      name: content.encounterById.get(stage.encounterId)?.name.zhCN ?? stage.encounterId,
      status: stageStatus(activity, stage, index),
      probability: stage.probability,
      durationSeconds: stage.durationSeconds,
    })),
  };
}

export function getActivitiesView(
  state: GameStateV2,
  content: ContentRegistry,
  now: number,
): ActivitiesView {
  const expeditions = Object.values(state.activities)
    .filter((activity): activity is ExpeditionActivity => activity.type === "expedition")
    .map((activity) => projectActivity(state, content, activity, now));
  return {
    active: expeditions
      .filter((activity) => activity.status === "active" || activity.status === "scheduled")
      .sort((left, right) => (left.nextSettlementAt ?? 0) - (right.nextSettlementAt ?? 0)),
    history: expeditions
      .filter((activity) => !["active", "scheduled"].includes(activity.status))
      .reverse(),
  };
}
