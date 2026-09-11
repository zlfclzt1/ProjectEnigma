import type { IdGenerator } from "../../application/ports/id-generator";
import type { ContentRegistry } from "../../content/registry";
import type { DungeonDefinition } from "../../content/schemas/dungeon";
import type { ActivityScheduler } from "../activity/activity-scheduler";
import type { ExpeditionActivity, ExpeditionEncounterPlan } from "../activity/activity";
import { recordAcquiredItem } from "../collection/item-collection";
import { applyEligibleAutomaticCollectionRewards } from "../collection/collection-reward-rules";
import type { ItemInstance } from "../equipment/item-instance";
import type { GameState } from "../game-state";
import type { CombatReportId, MemberId } from "../shared/ids";
import { generateCombatReport } from "../combat/report-generator";
import { DEFAULT_DUNGEON_EXPERIENCE_CONFIG, experienceFractions } from "./expedition-activity";
import {
  generateEncounterLoot,
  generateRouteCompletionLoot,
  generateSpecificEncounterLoot,
} from "./loot-generation";
import { revealRareRouteNodes } from "./rare-route";
import { applyMemberExperience, getMemberLevelCap } from "../member/member-level-cap";
import {
  completeDevelopmentAfterDungeonClear,
  progressDevelopmentAfterEncounter,
} from "./dungeon-development";
import type { ItemDefinitionId, QuestId } from "../shared/ids";
import { evaluateUpgrade } from "../equipment/upgrade-evaluation";
import { equipmentSellValue } from "../equipment/item-value";
import { asBrandedId } from "../shared/ids";

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
  const developmentProgress = [
    ...progressDevelopmentAfterEncounter(state, activity, encounter.id, settledAt),
  ];
  if (!run.mainRouteCompleted && requiredStagesCleared(run, dungeon)) {
    run.mainRouteCompleted = true;
    state.history.dungeonClearCounts[activity.dungeonId] =
      (state.history.dungeonClearCounts[activity.dungeonId] ?? 0) + 1;
    developmentProgress.push(
      ...completeDevelopmentAfterDungeonClear(state, activity, encounter.id, settledAt),
    );
  }
  const completedQuestIds = developmentProgress
    .filter((event) => event.completed)
    .map((event) => event.questId);
  const generatedLoot = generateEncounterLoot(
    activity,
    stage,
    lootTable,
    content,
    settledAt,
    ids,
    activity.developmentSnapshot.unlockedItemIdsByEncounter[encounter.id] ?? [],
    activity.developmentSnapshot.extraLootChance,
  );
  const developmentCache = generateSpecificEncounterLoot(
    activity,
    stage,
    content,
    settledAt,
    ids,
    selectDevelopmentCacheItems(state, content, activity, stage, completedQuestIds),
  );
  generatedLoot.push(...developmentCache);
  if (run.mainRouteCompleted && run.routeCompletionReward?.status === "pending") {
    const routeRewardLoot = generateRouteCompletionLoot(
      activity,
      run.routeCompletionReward,
      content,
      settledAt,
      ids,
    );
    run.routeCompletionReward.status = "granted";
    run.routeCompletionReward.itemInstanceIds = routeRewardLoot.map(({ instance }) => instance.id);
    generatedLoot.push(...routeRewardLoot);
  }
  recordDevelopmentEvents(
    activity,
    content,
    encounter.id,
    settledAt,
    run.runNumber,
    developmentProgress,
    developmentCache.map((entry) => entry.instance.id),
  );
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

function selectDevelopmentCacheItems(
  state: GameState,
  content: ContentRegistry,
  activity: ExpeditionActivity,
  stage: ExpeditionEncounterPlan,
  completedQuestIds: readonly QuestId[],
): readonly ItemDefinitionId[] {
  if (completedQuestIds.length === 0) return [];
  const candidates = [
    ...new Set(
      completedQuestIds.flatMap((questId) => {
        const quest = content.questById.get(questId);
        return quest ? [...quest.rewards.fixedItemIds, ...quest.rewards.itemChoiceIds] : [];
      }),
    ),
  ];
  const optionalCompletions = completedQuestIds.filter((questId) => {
    const snapshot = activity.developmentSnapshot.commissions.find(
      (commission) => commission.questId === questId,
    );
    return Boolean(
      stage.routeNodeId && snapshot?.requiredOptionalNodeIds.includes(stage.routeNodeId),
    );
  }).length;
  const count = Math.min(candidates.length, 1 + optionalCompletions);
  return candidates
    .map((itemId) => ({ itemId, score: developmentRewardScore(state, content, activity, itemId) }))
    .sort((left, right) => right.score - left.score || left.itemId.localeCompare(right.itemId))
    .slice(0, count)
    .map((entry) => entry.itemId);
}

function developmentRewardScore(
  state: GameState,
  content: ContentRegistry,
  activity: ExpeditionActivity,
  itemId: ItemDefinitionId,
): number {
  const definition = content.itemById.get(itemId);
  if (!definition) return Number.NEGATIVE_INFINITY;
  const synthetic: ItemInstance = {
    id: asBrandedId<"ItemInstanceId">(`development-preview:${itemId}`),
    definitionId: itemId,
    bound: false,
    acquiredAt: activity.createdAt,
    source: { type: "grant", reasonId: "development-preview" },
    enchantmentIds: [],
  };
  let equippable = 0;
  let bestUpgrade = 0;
  for (const memberId of activity.participantIds) {
    const member = state.members[memberId];
    if (!member) continue;
    let evaluation;
    try {
      evaluation = evaluateUpgrade(member, synthetic, state, content);
    } catch {
      continue;
    }
    if (!evaluation.equippable) continue;
    equippable = 1;
    bestUpgrade = Math.max(bestUpgrade, evaluation.recommendationScore);
  }
  const uncollected = state.collection.items[itemId] ? 0 : 1;
  return (
    equippable * 1_000_000 +
    Math.max(0, bestUpgrade) * 1_000 +
    uncollected * 100 +
    equipmentSellValue(definition)
  );
}

function recordDevelopmentEvents(
  activity: ExpeditionActivity,
  content: ContentRegistry,
  encounterId: ExpeditionEncounterPlan["encounterId"],
  occurredAt: number,
  runNumber: number,
  events: readonly import("./dungeon-development").CommissionProgressEvent[],
  cacheItemInstanceIds: readonly ItemInstance["id"][],
): void {
  let cacheRecorded = false;
  for (const event of events) {
    const quest = content.questById.get(event.questId);
    if (!quest) continue;
    if (event.discovered && !event.completed) {
      activity.developmentEvents.push({
        id: `${activity.id}:${occurredAt}:${event.questId}:clue`,
        type: "clue",
        questId: event.questId,
        occurredAt,
        runNumber,
        encounterId,
        text: `队伍发现了“${quest.name.zhCN}”的调查线索。`,
        itemInstanceIds: [],
      });
    }
    activity.developmentEvents.push({
      id: `${activity.id}:${occurredAt}:${event.questId}:${event.completed ? "completed" : "progress"}`,
      type: event.completed ? "completed" : "progress",
      questId: event.questId,
      occurredAt,
      runNumber,
      encounterId,
      text: event.completed
        ? `远征委托“${quest.name.zhCN}”开发完成，相关装备已纳入副本掉落。`
        : `远征委托“${quest.name.zhCN}”取得进展（${event.progress}/${event.required}）。`,
      itemInstanceIds: event.completed && !cacheRecorded ? [...cacheItemInstanceIds] : [],
    });
    if (event.completed) cacheRecorded = true;
  }
}

function applyEncounterVictoryCollectionRewards(
  state: GameState,
  content: ContentRegistry,
  encounterId: ExpeditionEncounterPlan["encounterId"],
): number {
  void encounterId;
  return applyEligibleAutomaticCollectionRewards(state, content).reduce(
    (sum, reward) => sum + reward.awardedFunds,
    0,
  );
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
    DEFAULT_DUNGEON_EXPERIENCE_CONFIG,
    activity.developmentSnapshot.experienceMultiplier,
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
