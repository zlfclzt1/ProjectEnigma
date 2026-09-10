import type { ContentRegistry } from "../../content/registry";
import type { ExpeditionActivity, ExpeditionEncounterPlan } from "../../domain/activity/activity";
import type { GameState } from "../../domain/game-state";
import type { ActivityId } from "../../domain/shared/ids";
import type { DungeonDefinition } from "../../content/schemas/dungeon";
import type { ExpeditionRunPlan } from "../../domain/activity/activity";

export interface ActivityRouteStageView {
  readonly id: string;
  readonly name: string;
  readonly routeNodeType: "required" | "optional" | "rare";
  readonly status: "pending" | "active" | "victory" | "defeat" | "absent";
  readonly probability: number;
  readonly durationSeconds: number;
}

export interface RareRouteEventView {
  readonly id: string;
  readonly runNumber: number;
  readonly encounterName: string;
  readonly outcome: "spawned" | "absent";
  readonly text: string;
}

export interface ExpeditionActivityView {
  readonly id: ActivityId;
  readonly dungeonName: string;
  readonly routeVariantName?: string;
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
  readonly rareEvents: readonly RareRouteEventView[];
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
  state: GameState,
  content: ContentRegistry,
  activity: ExpeditionActivity,
  now: number,
): ExpeditionActivityView {
  const dungeon = content.dungeonById.get(activity.dungeonId);
  const allVisibleStages = activity.runPlans.flatMap((run) => getVisibleStages(run));
  const visibleStages = allVisibleStages;
  const completedEncounterCount = visibleStages.filter(
    (stage) => stage.status !== "pending",
  ).length;
  const activeStage =
    activity.runPlans[activity.activeRunIndex]?.stages[activity.activeEncounterIndex];
  let partialProgress = 0;
  const activeRun = activity.runPlans[activity.activeRunIndex];
  if (
    activity.status === "active" &&
    activeStage &&
    activeRun &&
    getVisibleStages(activeRun).includes(activeStage)
  ) {
    const durationMilliseconds = activeStage.durationSeconds * 1_000;
    const stageStartedAt = activity.nextSettlementAt - durationMilliseconds;
    partialProgress = Math.min(1, Math.max(0, (now - stageStartedAt) / durationMilliseconds));
  }
  const currentRun = activity.runPlans[activity.activeRunIndex] ?? activity.runPlans.at(-1);
  return {
    id: activity.id,
    dungeonName: content.dungeonById.get(activity.dungeonId)?.name.zhCN ?? activity.dungeonId,
    ...(activity.routeVariantId
      ? {
          routeVariantName:
            dungeon?.routeVariants?.find((variant) => variant.id === activity.routeVariantId)?.name
              .zhCN ?? activity.routeVariantId,
        }
      : {}),
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
    totalEncounterCount: visibleStages.length,
    completedEncounterCount,
    progressPercent:
      visibleStages.length === 0
        ? 0
        : Math.min(100, ((completedEncounterCount + partialProgress) / visibleStages.length) * 100),
    ...(activity.status === "active" ? { nextSettlementAt: activity.nextSettlementAt } : {}),
    ...(activity.status === "active"
      ? { remainingMilliseconds: Math.max(0, activity.nextSettlementAt - now) }
      : {}),
    clearProbability: activity.partySnapshot.clearProbability,
    durationSeconds: activity.partySnapshot.durationSeconds,
    formulaVersion: activity.partySnapshot.formulaVersion,
    route: currentRun && dungeon ? projectRoute(activity, currentRun, dungeon, content) : [],
    rareEvents: dungeon
      ? activity.runPlans.flatMap((run) => projectRareEvents(run, dungeon, content))
      : [],
  };
}

function getVisibleStages(run: ExpeditionRunPlan): readonly ExpeditionEncounterPlan[] {
  return run.stages.filter(
    (stage) =>
      stage.routeNodeType !== "rare" ||
      (stage.routeNodeId && run.rareNodeReveals?.[stage.routeNodeId] === "spawned"),
  );
}

function projectRoute(
  activity: ExpeditionActivity,
  run: ExpeditionRunPlan,
  dungeon: DungeonDefinition,
  content: ContentRegistry,
): readonly ActivityRouteStageView[] {
  const usedStages = new Set<ExpeditionEncounterPlan>();
  const route = dungeon.route.flatMap((node): ActivityRouteStageView[] => {
    const stage = run.stages.find(
      (candidate) =>
        !usedStages.has(candidate) &&
        (candidate.routeNodeId === node.id ||
          (!candidate.routeNodeId && candidate.encounterId === node.encounterId)),
    );
    if (node.type === "rare") {
      const reveal = run.rareNodeReveals?.[node.id];
      if (!reveal) return [];
      if (reveal === "absent") {
        return [
          {
            id: node.id,
            name: content.encounterById.get(node.encounterId)?.name.zhCN ?? node.encounterId,
            routeNodeType: "rare",
            status: "absent",
            probability: 0,
            durationSeconds: 0,
          },
        ];
      }
    }
    if (!stage) return [];
    usedStages.add(stage);
    const index = run.stages.indexOf(stage);
    return [
      {
        id: node.id,
        name: content.encounterById.get(stage.encounterId)?.name.zhCN ?? stage.encounterId,
        routeNodeType: node.type,
        status: stageStatus(activity, stage, index),
        probability: stage.probability,
        durationSeconds: stage.durationSeconds,
      },
    ];
  });
  for (const stage of run.stages) {
    if (usedStages.has(stage) || stage.routeNodeType === "rare") continue;
    route.push({
      id: stage.routeNodeId ?? stage.encounterId,
      name: content.encounterById.get(stage.encounterId)?.name.zhCN ?? stage.encounterId,
      routeNodeType: stage.routeNodeType ?? "required",
      status: stageStatus(activity, stage, run.stages.indexOf(stage)),
      probability: stage.probability,
      durationSeconds: stage.durationSeconds,
    });
  }
  return route;
}

function projectRareEvents(
  run: ExpeditionRunPlan,
  dungeon: DungeonDefinition,
  content: ContentRegistry,
): readonly RareRouteEventView[] {
  return dungeon.route.flatMap((node): RareRouteEventView[] => {
    if (node.type !== "rare") return [];
    const outcome = run.rareNodeReveals?.[node.id];
    if (!outcome) return [];
    const encounterName =
      content.encounterById.get(node.encounterId)?.name.zhCN ?? node.encounterId;
    return [
      {
        id: `${run.runNumber}:${node.id}`,
        runNumber: run.runNumber,
        encounterName,
        outcome,
        text:
          outcome === "spawned"
            ? `探索途中发现了稀有首领“${encounterName}”。`
            : `队伍搜索了附近区域，没有发现“${encounterName}”的踪迹。`,
      },
    ];
  });
}

export function getActivitiesView(
  state: GameState,
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
