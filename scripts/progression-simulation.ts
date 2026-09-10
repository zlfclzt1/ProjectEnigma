import { autoAssignLoot } from "../src/application/commands/auto-assign-loot";
import { assignLoot } from "../src/application/commands/assign-loot";
import { purchaseGuildUpgradeCommand } from "../src/application/commands/purchase-guild-upgrade";
import { recruitMemberCommand } from "../src/application/commands/recruit-member";
import { sellLoot } from "../src/application/commands/sell-loot";
import type { ContentRegistry } from "../src/content/registry";
import { ActivityRegistry } from "../src/domain/activity/activity-registry";
import { ActivityScheduler } from "../src/domain/activity/activity-scheduler";
import type { ExpeditionActivity } from "../src/domain/activity/activity";
import { averageEquippedItemLevel } from "../src/domain/equipment/item-level";
import { rankLootAssignment } from "../src/domain/equipment/loot-assignment-ranking";
import type { GameState } from "../src/domain/game-state";
import { createNewGame } from "../src/domain/guild/new-game";
import {
  createExpeditionActivityHandler,
  experienceFractions,
  type StartExpeditionRequest,
} from "../src/domain/dungeon/expedition-activity";
import { evaluateExpeditionParty } from "../src/domain/dungeon/party-evaluation";
import type { DungeonDefinition } from "../src/content/schemas/dungeon";
import type { DungeonId, MemberId } from "../src/domain/shared/ids";
import { asBrandedId } from "../src/domain/shared/ids";
import { SettlementService } from "../src/application/services/settlement-service";
import { LocalIdGenerator } from "../src/infrastructure/ids/local-id-generator";
import { SeededRandomSource } from "../src/infrastructure/random/seeded-random-source";
import {
  EXPEDITION_RUN_CAPACITY_TRACK_ID,
  evaluateGuildUpgrade,
  getExpeditionRunCapacity,
  getNextGuildUpgrade,
} from "../src/domain/guild/guild-upgrade-rules";
import {
  partyCanInvestigateQuest,
  requiredOptionalNodeIdsForQuest,
} from "../src/domain/dungeon/dungeon-development";

const DAY_MS = 24 * 60 * 60 * 1_000;
const REASONABLE_CLEAR_PROBABILITY = 0.55;
const BOOST_CLEAR_PROBABILITY = 0.8;
const TARGET_DUNGEON_ID = asBrandedId<"DungeonId">("zulfarrak");

export interface ProgressionSimulationConfig {
  readonly seed: string;
  readonly managementActionsPerDay: number;
  readonly requestedRuns?: number;
  readonly maxDays?: number;
  readonly enableQueueUpgrade?: boolean;
  readonly enableRecruitmentAndBoost?: boolean;
  readonly enableQuests?: boolean;
  readonly lootHandling?: "auto" | "manual" | "alternating";
}

export interface ProgressionSimulationResult {
  readonly seed: string;
  readonly status: "target-reached" | "content-cap" | "day-limit";
  readonly managementActionsPerDay: number;
  readonly requestedRuns: number;
  readonly maximumRunsUsed: number;
  readonly targetDungeonId: DungeonId;
  readonly daysElapsed: number;
  readonly daysToTarget: number | null;
  readonly activitiesStarted: number;
  readonly attemptedDungeonRuns: number;
  readonly completedDungeonRuns: number;
  readonly failedDungeonRuns: number;
  readonly queueUpgradePurchased: boolean;
  readonly recruitedMemberCount: number;
  readonly boostedRunCount: number;
  readonly questClaims: number;
  readonly optionalRouteActivities: number;
  readonly rareEncounterRuns: number;
  readonly autoLootActions: number;
  readonly manualLootActions: number;
  readonly funds: number;
  readonly averageItemLevel: number;
  readonly minimumCoreLevel: number;
  readonly averageCoreLevel: number;
  readonly maximumCoreLevel: number;
  readonly minimumRosterLevel: number;
  readonly dungeonAttempts: Readonly<Record<string, number>>;
}

interface DungeonCandidate {
  readonly dungeon: DungeonDefinition;
  readonly clearProbability: number;
}

export function simulateProgression(
  content: ContentRegistry,
  config: ProgressionSimulationConfig,
): ProgressionSimulationResult {
  const requestedRuns = config.requestedRuns ?? 3;
  const maxDays = config.maxDays ?? 30;
  const enableQueueUpgrade = config.enableQueueUpgrade ?? true;
  const enableRecruitmentAndBoost = config.enableRecruitmentAndBoost ?? true;
  const enableQuests = config.enableQuests ?? true;
  const lootHandling = config.lootHandling ?? "alternating";
  validateConfig(config, requestedRuns, maxDays);

  const ids = new LocalIdGenerator();
  const random = new SeededRandomSource(config.seed);
  const state = createNewGame({
    slotId: asBrandedId<"SaveSlotId">(`progression_${config.seed}`),
    content,
    contentVersion: asBrandedId<"ContentVersion">("classic-2019-phase-6"),
    clock: { now: () => 0 },
    ids,
    random,
  });
  const coreMemberIds = Object.values(state.members).map((member) => member.id);
  const scheduler = createScheduler(content);
  const settlement = new SettlementService(content);
  const dungeonAttempts: Record<string, number> = {};
  let currentTime = 0;
  let daysElapsed = 0;
  let activitiesStarted = 0;
  let attemptedDungeonRuns = 0;
  let completedDungeonRuns = 0;
  let failedDungeonRuns = 0;
  let maximumRunsUsed = requestedRuns;
  let recruitedMemberId: MemberId | undefined;
  let boostedRunCount = 0;
  let questClaims = 0;
  let optionalRouteActivities = 0;
  let rareEncounterRuns = 0;
  let autoLootActions = 0;
  let manualLootActions = 0;
  let status: ProgressionSimulationResult["status"] = "day-limit";

  outer: for (let day = 1; day <= maxDays; day += 1) {
    if (targetCleared(state)) {
      status = "target-reached";
      break;
    }
    currentTime = Math.max(currentTime, (day - 1) * DAY_MS);
    daysElapsed = day;

    for (let action = 0; action < config.managementActionsPerDay; action += 1) {
      if (enableQueueUpgrade) purchaseQueueUpgradeIfEligible(state, content);
      if (
        enableRecruitmentAndBoost &&
        !recruitedMemberId &&
        minimumLevel(state, coreMemberIds) >= 30
      ) {
        recruitedMemberId = recruitNewcomer(state, content, currentTime);
      }

      let participantIds = coreMemberIds;
      let dungeon: DungeonDefinition | null = null;
      if (recruitedMemberId && boostedRunCount === 0) {
        participantIds = boostParty(state, content, coreMemberIds, recruitedMemberId);
        dungeon = chooseBoostDungeon(state, content, participantIds, recruitedMemberId);
        if (dungeon) boostedRunCount += 1;
        else participantIds = coreMemberIds;
      }
      dungeon ??= chooseDungeon(state, content, coreMemberIds);
      if (!dungeon) {
        status = "content-cap";
        break outer;
      }

      const selectedOptionalNodeIds = enableQuests
        ? questOptionalNodeIds(state, content, participantIds, dungeon)
        : [];
      const runCount = enableQueueUpgrade
        ? getExpeditionRunCapacity(state, content)
        : requestedRuns;
      maximumRunsUsed = Math.max(maximumRunsUsed, runCount);

      const activity = startExpedition(
        state,
        content,
        scheduler,
        dungeon.id,
        participantIds,
        runCount,
        currentTime,
        selectedOptionalNodeIds,
      );
      activitiesStarted += 1;
      if (selectedOptionalNodeIds.length > 0) optionalRouteActivities += 1;
      const summary = settlement.settleDueActivities(state, Number.MAX_SAFE_INTEGER);
      if (summary.settled.length === 0 || !activity.completedAt) {
        throw new Error(`进度模拟中的副本活动 ${activity.id} 未完成结算。`);
      }
      currentTime = activity.completedAt + 1;

      const attemptedRuns = activity.runPlans.filter((run) =>
        run.stages.some((stage) => stage.status !== "pending"),
      ).length;
      attemptedDungeonRuns += attemptedRuns;
      rareEncounterRuns += activity.runPlans.filter((run) =>
        run.stages.some((stage) => stage.routeNodeType === "rare"),
      ).length;
      completedDungeonRuns += activity.completedRuns;
      if (activity.status === "failed") failedDungeonRuns += 1;
      dungeonAttempts[dungeon.id] = (dungeonAttempts[dungeon.id] ?? 0) + attemptedRuns;
      if (enableQuests) {
        questClaims += activity.developmentEvents.filter(
          (event) => event.type === "completed",
        ).length;
      }
      const useManualLoot =
        lootHandling === "manual" ||
        (lootHandling === "alternating" && (activitiesStarted + day) % 2 === 0);
      if (useManualLoot) {
        manuallyAssignLoot(state, content);
        manualLootActions += 1;
      } else {
        autoAssignLoot(state, content);
        autoLootActions += 1;
      }

      if (targetCleared(state)) {
        status = "target-reached";
        break outer;
      }
    }
  }

  const levels = coreMemberIds.map((memberId) => state.members[memberId]!.progression.level);
  return {
    seed: config.seed,
    status,
    managementActionsPerDay: config.managementActionsPerDay,
    requestedRuns,
    maximumRunsUsed,
    targetDungeonId: TARGET_DUNGEON_ID,
    daysElapsed,
    daysToTarget: status === "target-reached" ? daysElapsed : null,
    activitiesStarted,
    attemptedDungeonRuns,
    completedDungeonRuns,
    failedDungeonRuns,
    queueUpgradePurchased: getExpeditionRunCapacity(state, content) > requestedRuns,
    recruitedMemberCount: recruitedMemberId ? 1 : 0,
    boostedRunCount,
    questClaims,
    optionalRouteActivities,
    rareEncounterRuns,
    autoLootActions,
    manualLootActions,
    funds: state.guild.funds,
    averageItemLevel: round(
      mean(
        coreMemberIds.map((memberId) =>
          averageEquippedItemLevel(state.members[memberId]!, state.itemInstances, content),
        ),
      ),
    ),
    minimumCoreLevel: Math.min(...levels),
    averageCoreLevel: round(mean(levels)),
    maximumCoreLevel: Math.max(...levels),
    minimumRosterLevel: Math.min(
      ...Object.values(state.members).map((member) => member.progression.level),
    ),
    dungeonAttempts: Object.fromEntries(
      Object.entries(dungeonAttempts).sort(([left], [right]) => left.localeCompare(right)),
    ),
  };
}

function validateConfig(
  config: ProgressionSimulationConfig,
  requestedRuns: number,
  maxDays: number,
): void {
  if (!config.seed) throw new Error("进度模拟种子不能为空。");
  for (const [label, value] of [
    ["每日管理次数", config.managementActionsPerDay],
    ["连续挑战次数", requestedRuns],
    ["最大天数", maxDays],
  ] as const) {
    if (!Number.isInteger(value) || value <= 0) throw new Error(`${label}必须是正整数。`);
  }
  if (requestedRuns > 3) throw new Error("当前进度基线只能使用 1–3 次连续挑战。");
}

function createScheduler(content: ContentRegistry): ActivityScheduler {
  const registry = new ActivityRegistry();
  registry.register(createExpeditionActivityHandler(content));
  return new ActivityScheduler(registry);
}

function startExpedition(
  state: GameState,
  content: ContentRegistry,
  scheduler: ActivityScheduler,
  dungeonId: DungeonId,
  participantIds: readonly MemberId[],
  requestedRuns: number,
  now: number,
  selectedOptionalNodeIds: readonly import("../src/domain/shared/ids").DungeonRouteNodeId[] = [],
): ExpeditionActivity {
  const ids = new LocalIdGenerator(state.ids);
  const random = new SeededRandomSource(state.random);
  const result = scheduler.start<StartExpeditionRequest, ExpeditionActivity>(
    state,
    {
      type: "expedition",
      dungeonId,
      participantIds,
      requestedRuns,
      selectedOptionalNodeIds,
    },
    now,
    { ids, random },
  );
  if (result.status === "rejected") {
    throw new Error(result.issues.map((issue) => issue.message).join(" "));
  }
  state.ids = ids.snapshot();
  state.random = random.snapshot();
  return state.activities[result.activity.id] as ExpeditionActivity;
}

function chooseDungeon(
  state: GameState,
  content: ContentRegistry,
  coreMemberIds: readonly MemberId[],
): DungeonDefinition | null {
  const lowestLevel = minimumLevel(state, coreMemberIds);
  const candidates: DungeonCandidate[] = [];
  for (const dungeonId of state.guild.unlockedDungeonIds) {
    const dungeon = content.dungeonById.get(dungeonId);
    if (!dungeon || dungeon.minimumLevel > lowestLevel) continue;
    let totalExperience = 0;
    for (const fraction of Object.values(
      experienceFractions(state, content, dungeon.id, coreMemberIds),
    )) {
      totalExperience += fraction ?? 0;
    }
    if (totalExperience <= 0 && (state.history.dungeonClearCounts[dungeon.id] ?? 0) > 0) continue;
    const preview = evaluateExpeditionParty(state, content, dungeon.id, coreMemberIds);
    if (!preview.ok) continue;
    candidates.push({ dungeon, clearProbability: preview.preview.clearProbability });
  }
  if (candidates.length === 0) return null;

  const reasonable = candidates.filter(
    (candidate) => candidate.clearProbability >= REASONABLE_CLEAR_PROBABILITY,
  );
  const pool = reasonable.length > 0 ? reasonable : candidates;
  return [...pool].sort(
    (left, right) =>
      (reasonable.length > 0
        ? right.dungeon.recommendedLevel - left.dungeon.recommendedLevel
        : right.clearProbability - left.clearProbability) ||
      right.clearProbability - left.clearProbability ||
      left.dungeon.id.localeCompare(right.dungeon.id),
  )[0]!.dungeon;
}

function targetCleared(state: GameState): boolean {
  return (state.history.dungeonClearCounts[TARGET_DUNGEON_ID] ?? 0) > 0;
}

function purchaseQueueUpgradeIfEligible(state: GameState, content: ContentRegistry): void {
  const upgrade = getNextGuildUpgrade(state, content, EXPEDITION_RUN_CAPACITY_TRACK_ID);
  if (!upgrade || !evaluateGuildUpgrade(state, upgrade).canPurchase) return;
  purchaseGuildUpgradeCommand(content, upgrade.id).execute(state);
}

function recruitNewcomer(
  state: GameState,
  content: ContentRegistry,
  now: number,
): MemberId | undefined {
  const candidate = Object.values(state.candidates)
    .map((entry) => ({ entry, role: content.specById.get(entry.progression.specId)?.role }))
    .sort(
      (left, right) =>
        Number(left.role !== "dps") - Number(right.role !== "dps") ||
        left.entry.id.localeCompare(right.entry.id),
    )[0]?.entry;
  if (!candidate) return undefined;
  const generated = recruitMemberCommand(
    { content, clock: { now: () => now } },
    candidate.id,
  ).execute(state);
  if (generated instanceof Promise) throw new Error("进度模拟不支持异步招募命令。");
  return generated.member.id;
}

function boostParty(
  state: GameState,
  content: ContentRegistry,
  coreMemberIds: readonly MemberId[],
  newcomerId: MemberId,
): MemberId[] {
  const byRole = (role: "tank" | "healer" | "dps") =>
    coreMemberIds.filter(
      (memberId) =>
        content.specById.get(state.members[memberId]!.progression.specId)?.role === role,
    );
  return [
    newcomerId,
    ...byRole("tank").slice(0, 1),
    ...byRole("healer").slice(0, 1),
    ...byRole("dps").slice(0, 2),
  ];
}

function chooseBoostDungeon(
  state: GameState,
  content: ContentRegistry,
  participantIds: readonly MemberId[],
  newcomerId: MemberId,
): DungeonDefinition | null {
  const candidates = state.guild.unlockedDungeonIds.flatMap((dungeonId) => {
    const dungeon = content.dungeonById.get(dungeonId);
    if (!dungeon) return [];
    const newcomerExperience =
      experienceFractions(state, content, dungeon.id, participantIds)[newcomerId] ?? 0;
    if (newcomerExperience <= 0) return [];
    const preview = evaluateExpeditionParty(state, content, dungeon.id, participantIds);
    if (!preview.ok || preview.preview.clearProbability < BOOST_CLEAR_PROBABILITY) return [];
    return [{ dungeon, clearProbability: preview.preview.clearProbability }];
  });
  return (
    candidates.sort(
      (left, right) =>
        right.dungeon.recommendedLevel - left.dungeon.recommendedLevel ||
        right.clearProbability - left.clearProbability ||
        left.dungeon.id.localeCompare(right.dungeon.id),
    )[0]?.dungeon ?? null
  );
}

function questOptionalNodeIds(
  state: GameState,
  content: ContentRegistry,
  participantIds: readonly MemberId[],
  dungeon: DungeonDefinition,
): import("../src/domain/shared/ids").DungeonRouteNodeId[] {
  return [
    ...new Set(
      content.quests.flatMap((quest) => {
        if (state.dungeonDevelopment.entries[quest.id]?.status === "completed") return [];
        if (!partyCanInvestigateQuest(state, quest, participantIds)) return [];
        return requiredOptionalNodeIdsForQuest(quest, dungeon.id, content);
      }),
    ),
  ];
}

function manuallyAssignLoot(state: GameState, content: ContentRegistry): void {
  for (const pending of Object.values(state.pendingLoot).sort(
    (left, right) => left.acquiredAt - right.acquiredAt || left.id.localeCompare(right.id),
  )) {
    const decision = rankLootAssignment(state, content, pending);
    if (decision.type === "assign") {
      assignLoot(
        state,
        content,
        pending.id,
        decision.candidate.memberId,
        decision.candidate.replacementSlot,
      );
    } else sellLoot(state, content, pending.id);
  }
}

function minimumLevel(state: GameState, memberIds: readonly MemberId[]): number {
  return Math.min(...memberIds.map((memberId) => state.members[memberId]!.progression.level));
}

function mean(values: readonly number[]): number {
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function round(value: number): number {
  return Math.round(value * 1_000) / 1_000;
}

export interface NumericSummary {
  readonly mean: number;
  readonly p10: number;
  readonly p50: number;
  readonly p90: number;
}

export interface ProgressionScenarioSummary {
  readonly managementActionsPerDay: number;
  readonly outcomes: Readonly<Record<ProgressionSimulationResult["status"], number>>;
  readonly daysToTarget: NumericSummary | null;
  readonly daysElapsed: NumericSummary;
  readonly attemptedDungeonRuns: NumericSummary;
  readonly completedDungeonRuns: NumericSummary;
  readonly failedDungeonRuns: NumericSummary;
  readonly funds: NumericSummary;
  readonly averageItemLevel: NumericSummary;
  readonly minimumCoreLevel: NumericSummary;
  readonly minimumRosterLevel: NumericSummary;
  readonly maximumRunsUsed: NumericSummary;
  readonly recruitedMemberCount: NumericSummary;
  readonly boostedRunCount: NumericSummary;
  readonly questClaims: NumericSummary;
  readonly optionalRouteActivities: NumericSummary;
  readonly rareEncounterRuns: NumericSummary;
  readonly autoLootActions: NumericSummary;
  readonly manualLootActions: NumericSummary;
}

export interface ProgressionBaseline {
  readonly schemaVersion: 2;
  readonly contentScope: "classic-2019-phase-6";
  readonly target: { readonly type: "dungeon-first-clear"; readonly dungeonId: "zulfarrak" };
  readonly maxDays: number;
  readonly requestedRuns: "3-to-5";
  readonly sampleCount: number;
  readonly seedPrefix: string;
  readonly policy: {
    readonly startingCoreMembers: 5;
    readonly normalRecruitment: "one-random-newcomer-boosted-once";
    readonly dungeonSelection: "highest-recommended-at-55-percent-clear-otherwise-safest";
    readonly routeSelection: "accepted-quest-options-plus-seeded-rares";
    readonly lootHandling: "alternating-manual-ranked-and-auto-assign";
    readonly queueUpgrade: "purchase-five-run-capacity-after-shadowfang";
    readonly offlineIncome: "none-outside-player-scheduled-activities";
  };
  readonly scenarios: readonly ProgressionScenarioSummary[];
}

export function buildProgressionBaseline(
  content: ContentRegistry,
  options: {
    readonly sampleCount?: number;
    readonly maxDays?: number;
    readonly seedPrefix?: string;
    readonly managementActionsPerDay?: readonly number[];
  } = {},
): ProgressionBaseline {
  const sampleCount = options.sampleCount ?? 32;
  const maxDays = options.maxDays ?? 30;
  const seedPrefix = options.seedPrefix ?? "zulfarrak-stage-baseline-v2";
  const schedules = options.managementActionsPerDay ?? [3, 4, 5, 6];
  if (!Number.isInteger(sampleCount) || sampleCount <= 0) {
    throw new Error("进度基线样本数必须是正整数。");
  }

  return {
    schemaVersion: 2,
    contentScope: "classic-2019-phase-6",
    target: { type: "dungeon-first-clear", dungeonId: "zulfarrak" },
    maxDays,
    requestedRuns: "3-to-5",
    sampleCount,
    seedPrefix,
    policy: {
      startingCoreMembers: 5,
      normalRecruitment: "one-random-newcomer-boosted-once",
      dungeonSelection: "highest-recommended-at-55-percent-clear-otherwise-safest",
      routeSelection: "accepted-quest-options-plus-seeded-rares",
      lootHandling: "alternating-manual-ranked-and-auto-assign",
      queueUpgrade: "purchase-five-run-capacity-after-shadowfang",
      offlineIncome: "none-outside-player-scheduled-activities",
    },
    scenarios: schedules.map((managementActionsPerDay) => {
      const samples = Array.from({ length: sampleCount }, (_, index) =>
        simulateProgression(content, {
          seed: `${seedPrefix}:${managementActionsPerDay}:${index}`,
          managementActionsPerDay,
          requestedRuns: 3,
          maxDays,
        }),
      );
      const reached = samples
        .map((sample) => sample.daysToTarget)
        .filter((days): days is number => days !== null);
      return {
        managementActionsPerDay,
        outcomes: {
          "target-reached": samples.filter((sample) => sample.status === "target-reached").length,
          "content-cap": samples.filter((sample) => sample.status === "content-cap").length,
          "day-limit": samples.filter((sample) => sample.status === "day-limit").length,
        },
        daysToTarget: reached.length > 0 ? summarize(reached) : null,
        daysElapsed: summarize(samples.map((sample) => sample.daysElapsed)),
        attemptedDungeonRuns: summarize(samples.map((sample) => sample.attemptedDungeonRuns)),
        completedDungeonRuns: summarize(samples.map((sample) => sample.completedDungeonRuns)),
        failedDungeonRuns: summarize(samples.map((sample) => sample.failedDungeonRuns)),
        funds: summarize(samples.map((sample) => sample.funds)),
        averageItemLevel: summarize(samples.map((sample) => sample.averageItemLevel)),
        minimumCoreLevel: summarize(samples.map((sample) => sample.minimumCoreLevel)),
        minimumRosterLevel: summarize(samples.map((sample) => sample.minimumRosterLevel)),
        maximumRunsUsed: summarize(samples.map((sample) => sample.maximumRunsUsed)),
        recruitedMemberCount: summarize(samples.map((sample) => sample.recruitedMemberCount)),
        boostedRunCount: summarize(samples.map((sample) => sample.boostedRunCount)),
        questClaims: summarize(samples.map((sample) => sample.questClaims)),
        optionalRouteActivities: summarize(samples.map((sample) => sample.optionalRouteActivities)),
        rareEncounterRuns: summarize(samples.map((sample) => sample.rareEncounterRuns)),
        autoLootActions: summarize(samples.map((sample) => sample.autoLootActions)),
        manualLootActions: summarize(samples.map((sample) => sample.manualLootActions)),
      };
    }),
  };
}

function summarize(values: readonly number[]): NumericSummary {
  const sorted = [...values].sort((left, right) => left - right);
  const percentile = (ratio: number): number =>
    sorted[Math.min(sorted.length - 1, Math.floor((sorted.length - 1) * ratio))]!;
  return {
    mean: round(mean(sorted)),
    p10: round(percentile(0.1)),
    p50: round(percentile(0.5)),
    p90: round(percentile(0.9)),
  };
}
