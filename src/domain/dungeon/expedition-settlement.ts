import type { IdGenerator } from "../../application/ports/id-generator";
import type { ContentRegistry } from "../../content/registry";
import type { DungeonDefinition } from "../../content/schemas/dungeon";
import type { ActivityScheduler } from "../activity/activity-scheduler";
import type { ExpeditionActivity, ExpeditionEncounterPlan } from "../activity/activity";
import { recordAcquiredItem } from "../collection/item-collection";
import {
  applyCollectionReward,
  evaluateCollectionReward,
} from "../collection/collection-reward-rules";
import type { ItemInstance } from "../equipment/item-instance";
import type { GameState } from "../game-state";
import type { CombatReportId, MemberId } from "../shared/ids";
import { generateCombatReport } from "../combat/report-generator";
import { DEFAULT_DUNGEON_EXPERIENCE_CONFIG, experienceFractions } from "./expedition-activity";
import { generateGuaranteedLoot } from "./loot-generation";
import { revealRareRouteNodes } from "./rare-route";
import {
  completeExpeditionDungeonClearQuests,
  progressExpeditionQuestsAfterEncounterVictory,
} from "./expedition-quest-progress";
import { applyMemberExperience, getMemberLevelCap } from "../member/member-level-cap";

export type ExpeditionSettlementResult =
  | {
      readonly status: "settled";
      readonly activityId: ExpeditionActivity["id"];
      readonly encounterId: ExpeditionEncounterPlan["encounterId"];
      readonly outcome: "victory" | "defeat";
      readonly settledAt: number;
      readonly itemInstanceIds: readonly ItemInstance["id"][];
      readonly reportId: CombatReportId;
    }
  | {
      readonly status: "not-due" | "not-active" | "invalid-stage";
      readonly activityId: ExpeditionActivity["id"];
    };

export function settleNextExpeditionStage(
  state: GameState,
  content: ContentRegistry,
  scheduler: ActivityScheduler,
  activity: ExpeditionActivity,
  now: number,
  ids: IdGenerator,
): ExpeditionSettlementResult {
  if (activity.status !== "active") return { status: "not-active", activityId: activity.id };
  if (activity.nextSettlementAt > now) return { status: "not-due", activityId: activity.id };
  const run = activity.runPlans[activity.activeRunIndex];
  const stage = run?.stages[activity.activeEncounterIndex];
  if (!run || !stage || stage.status !== "pending") {
    return { status: "invalid-stage", activityId: activity.id };
  }
  const encounter = content.encounterById.get(stage.encounterId);
  const dungeon = content.dungeonById.get(activity.dungeonId);
  if (!encounter || !dungeon || encounter.dungeonId !== activity.dungeonId) {
    throw new Error(`副本活动 ${activity.id} 引用了不存在或不匹配的内容。`);
  }

  const settledAt = activity.nextSettlementAt;
  if (stage.successRoll >= stage.probability) {
    stage.status = "defeat";
    stage.settledAt = settledAt;
    stage.report = generateCombatReport({
      activity,
      stage,
      encounter,
      runNumber: run.runNumber,
      outcome: "defeat",
      settledAt,
      rewards: {
        experienceFractionByMember: {},
        funds: 0,
        firstKillBonus: 0,
        itemInstanceIds: [],
      },
    });
    scheduler.finish(state, activity.id, "failed", settledAt);
    return {
      status: "settled",
      activityId: activity.id,
      encounterId: encounter.id,
      outcome: "defeat",
      settledAt,
      itemInstanceIds: [],
      reportId: stage.report.id,
    };
  }

  const lootTable = encounter.lootTableId
    ? content.lootTableById.get(encounter.lootTableId)
    : undefined;
  if (encounter.lootTableId && !lootTable) throw new Error(`首领 ${encounter.id} 缺少掉落表。`);
  const generatedLoot = lootTable
    ? generateGuaranteedLoot(activity, stage, lootTable, content, settledAt, ids)
    : [];

  stage.status = "victory";
  stage.settledAt = settledAt;
  const experienceFractionByMember = applyEncounterExperience(
    state,
    content,
    activity,
    encounter.experienceShare,
  );
  const firstKill = !state.guild.firstKillEncounterIds.includes(encounter.id);
  let firstKillBonus = firstKill ? encounter.firstKillBonus : 0;
  state.guild.funds += encounter.funds + firstKillBonus;
  if (firstKill) state.guild.firstKillEncounterIds.push(encounter.id);
  state.history.encounterVictoryCounts[encounter.id] =
    (state.history.encounterVictoryCounts[encounter.id] ?? 0) + 1;
  firstKillBonus += applyEncounterVictoryCollectionRewards(state, content, encounter.id);
  progressExpeditionQuestsAfterEncounterVictory(state, activity, encounter.id, settledAt);
  for (const { instance, pending } of generatedLoot) {
    state.itemInstances[instance.id] = instance;
    state.pendingLoot[pending.id] = pending;
    recordAcquiredItem(state.collection, instance, content);
  }
  stage.report = generateCombatReport({
    activity,
    stage,
    encounter,
    runNumber: run.runNumber,
    outcome: "victory",
    settledAt,
    rewards: {
      experienceFractionByMember,
      funds: encounter.funds,
      firstKillBonus,
      itemInstanceIds: generatedLoot.map(({ instance }) => instance.id),
    },
  });
  if (!run.mainRouteCompleted && requiredStagesCleared(run, dungeon)) {
    run.mainRouteCompleted = true;
    state.history.dungeonClearCounts[activity.dungeonId] =
      (state.history.dungeonClearCounts[activity.dungeonId] ?? 0) + 1;
    completeExpeditionDungeonClearQuests(state, activity, settledAt);
  }
  unlockEligibleDungeons(state, content);

  advanceAfterVictory(state, content, scheduler, activity, settledAt);
  return {
    status: "settled",
    activityId: activity.id,
    encounterId: encounter.id,
    outcome: "victory",
    settledAt,
    itemInstanceIds: generatedLoot.map(({ instance }) => instance.id),
    reportId: stage.report.id,
  };
}

function applyEncounterVictoryCollectionRewards(
  state: GameState,
  content: ContentRegistry,
  encounterId: ExpeditionEncounterPlan["encounterId"],
): number {
  let awardedFunds = 0;
  for (const reward of content.collectionRewards) {
    if (
      reward.condition.type !== "encounter-victory" ||
      reward.condition.encounterId !== encounterId
    ) {
      continue;
    }
    const eligibility = evaluateCollectionReward(state, content, reward.id);
    if (!eligibility.claimable) continue;
    awardedFunds += applyCollectionReward(state, content, reward.id).awardedFunds;
  }
  return awardedFunds;
}

function requiredStagesCleared(
  run: ExpeditionActivity["runPlans"][number],
  dungeon: DungeonDefinition,
): boolean {
  const requiredEncounterIds = new Set(
    dungeon.route.filter((node) => node.type === "required").map((node) => node.encounterId),
  );
  return run.stages
    .filter((stage) =>
      stage.routeNodeType
        ? stage.routeNodeType === "required"
        : requiredEncounterIds.has(stage.encounterId),
    )
    .every((stage) => stage.status === "victory");
}

function applyEncounterExperience(
  state: GameState,
  content: ContentRegistry,
  activity: ExpeditionActivity,
  experienceShare: number,
): Partial<Record<MemberId, number>> {
  const run = activity.runPlans[activity.activeRunIndex]!;
  const awarded: Partial<Record<MemberId, number>> = {};
  run.experienceAwardedByMember ??= {};
  for (const memberId of activity.participantIds) {
    const member = state.members[memberId];
    if (!member) continue;
    const maximumExperience =
      run.maximumExperiencePerMember ?? DEFAULT_DUNGEON_EXPERIENCE_CONFIG.maximumFractionPerRun;
    const remainingExperience = Math.max(
      0,
      maximumExperience - (run.experienceAwardedByMember[memberId] ?? 0),
    );
    const gained = applyMemberExperience(
      member,
      Math.min(
        remainingExperience,
        (run.experienceFractionByMember[memberId] ?? 0) * experienceShare,
      ),
      getMemberLevelCap(state, content),
    );
    if (gained > 0) {
      awarded[memberId] = gained;
      run.experienceAwardedByMember[memberId] =
        (run.experienceAwardedByMember[memberId] ?? 0) + gained;
    }
  }
  return awarded;
}

function advanceAfterVictory(
  state: GameState,
  content: ContentRegistry,
  scheduler: ActivityScheduler,
  activity: ExpeditionActivity,
  settledAt: number,
): void {
  const run = activity.runPlans[activity.activeRunIndex]!;
  const nextStage = run.stages[activity.activeEncounterIndex + 1];
  if (nextStage) {
    const dungeon = content.dungeonById.get(activity.dungeonId);
    if (dungeon) revealRareRouteNodes(run, dungeon.route, nextStage.routeNodeId);
    activity.activeEncounterIndex += 1;
    activity.nextSettlementAt = settledAt + nextStage.durationSeconds * 1_000;
    return;
  }

  const dungeon = content.dungeonById.get(activity.dungeonId);
  if (dungeon) revealRareRouteNodes(run, dungeon.route);

  activity.completedRuns += 1;
  const nextRun = activity.runPlans[activity.activeRunIndex + 1];
  if (!nextRun) {
    scheduler.finish(state, activity.id, "completed", settledAt);
    return;
  }

  activity.activeRunIndex += 1;
  activity.activeEncounterIndex = 0;
  const nextDungeon = content.dungeonById.get(activity.dungeonId);
  if (nextDungeon) {
    revealRareRouteNodes(nextRun, nextDungeon.route, nextRun.stages[0]?.routeNodeId);
  }
  nextRun.experienceFractionByMember = experienceFractions(
    state,
    content,
    activity.dungeonId,
    activity.participantIds,
  );
  nextRun.maximumExperiencePerMember = DEFAULT_DUNGEON_EXPERIENCE_CONFIG.maximumFractionPerRun;
  nextRun.experienceAwardedByMember = {};
  activity.nextSettlementAt = settledAt + nextRun.stages[0]!.durationSeconds * 1_000;
}

function unlockEligibleDungeons(state: GameState, content: ContentRegistry): void {
  const unlocked = new Set(state.guild.unlockedDungeonIds);
  let changed = true;
  while (changed) {
    changed = false;
    for (const dungeon of content.dungeons) {
      if (unlocked.has(dungeon.id)) continue;
      const levelReady = Object.values(state.members).some(
        (member) => member.progression.level >= dungeon.minimumLevel,
      );
      const required = dungeon.unlock?.requiredDungeonIds ?? [];
      const requiredAny = dungeon.unlock?.requiredAnyDungeonIds ?? [];
      const requiredReady = required.every((id) => dungeonCleared(state, id));
      const requiredAnyReady =
        requiredAny.length === 0 || requiredAny.some((id) => dungeonCleared(state, id));
      if (dungeon.defaultUnlocked || (levelReady && requiredReady && requiredAnyReady)) {
        unlocked.add(dungeon.id);
        changed = true;
      }
    }
  }
  state.guild.unlockedDungeonIds = [...unlocked];
}

function dungeonCleared(state: GameState, dungeonId: ExpeditionActivity["dungeonId"]): boolean {
  return (state.history.dungeonClearCounts[dungeonId] ?? 0) > 0;
}
