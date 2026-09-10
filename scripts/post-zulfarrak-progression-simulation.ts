import { autoAssignLoot } from "../src/application/commands/auto-assign-loot";
import { recruitMemberCommand } from "../src/application/commands/recruit-member";
import { SettlementService } from "../src/application/services/settlement-service";
import type { ContentRegistry } from "../src/content/registry";
import type { DungeonDefinition } from "../src/content/schemas/dungeon";
import type { ExpeditionActivity } from "../src/domain/activity/activity";
import { ActivityRegistry } from "../src/domain/activity/activity-registry";
import { ActivityScheduler } from "../src/domain/activity/activity-scheduler";
import {
  createExpeditionActivityHandler,
  experienceFractions,
  type StartExpeditionRequest,
} from "../src/domain/dungeon/expedition-activity";
import { evaluateExpeditionParty } from "../src/domain/dungeon/party-evaluation";
import { averageEquippedItemLevel } from "../src/domain/equipment/item-level";
import type { GameState } from "../src/domain/game-state";
import { createNewGame } from "../src/domain/guild/new-game";
import { getExpeditionRunCapacity } from "../src/domain/guild/guild-upgrade-rules";
import { getMemberLevelCap } from "../src/domain/member/member-level-cap";
import { asBrandedId, type DungeonId, type MemberId } from "../src/domain/shared/ids";
import { LocalIdGenerator } from "../src/infrastructure/ids/local-id-generator";
import { SeededRandomSource } from "../src/infrastructure/random/seeded-random-source";
import type { NumericSummary } from "./progression-simulation";

const DAY_MS = 24 * 60 * 60 * 1_000;
const REASONABLE_CLEAR_PROBABILITY = 0.55;
const BOOST_CLEAR_PROBABILITY = 0.8;
const TARGET_DUNGEON_ID = asBrandedId<"DungeonId">("upper_blackrock_spire");
const GRADUATION_REWARD_ID = asBrandedId<"CollectionRewardId">("zulfarrak_level_45_graduation");
const QUEUE_UPGRADE_ID = asBrandedId<"GuildUpgradeId">("expedition_queue_5");
const ZULFARRAK_ID = asBrandedId<"DungeonId">("zulfarrak");
const ZULFARRAK_FINAL_ENCOUNTER_ID = asBrandedId<"EncounterId">("zulfarrak_chief_ukorz");
const LEGACY_DUNGEON_IDS = [
  "ragefire_chasm",
  "wailing_caverns",
  "deadmines",
  "shadowfang_keep",
  "blackfathom_deeps",
  "the_stockade",
  "gnomeregan",
  "razorfen_kraul",
  "scarlet_monastery_graveyard",
  "scarlet_monastery_library",
  "scarlet_monastery_armory",
  "scarlet_monastery_cathedral",
  "uldaman",
  "razorfen_downs",
  "zulfarrak",
].map((id) => asBrandedId<"DungeonId">(id));

export interface PostZulfarrakProgressionConfig {
  readonly seed: string;
  readonly managementActionsPerDay: number;
  readonly maxDays?: number;
}

export interface PostZulfarrakProgressionResult {
  readonly seed: string;
  readonly status: "target-reached" | "content-cap" | "day-limit";
  readonly managementActionsPerDay: number;
  readonly targetDungeonId: DungeonId;
  readonly targetReached: boolean;
  readonly daysElapsed: number;
  readonly daysToTarget: number | null;
  readonly levelCap: number;
  readonly highestAvailableRecommendedLevel: number;
  readonly startingCoreLevel: number;
  readonly minimumCoreLevel: number;
  readonly averageCoreLevel: number;
  readonly maximumCoreLevel: number;
  readonly activitiesStarted: number;
  readonly attemptedDungeonRuns: number;
  readonly completedDungeonRuns: number;
  readonly failedDungeonRuns: number;
  readonly recruitedMemberCount: number;
  readonly boostedRunCount: number;
  readonly lootAssignments: number;
  readonly lootSales: number;
  readonly startingFunds: number;
  readonly endingFunds: number;
  readonly unscheduledFundsDelta: number;
  readonly averageItemLevel: number;
  readonly attemptedDungeonIds: readonly DungeonId[];
}

interface DungeonCandidate {
  readonly dungeon: DungeonDefinition;
  readonly clearProbability: number;
}

export function simulatePostZulfarrakProgression(
  content: ContentRegistry,
  config: PostZulfarrakProgressionConfig,
): PostZulfarrakProgressionResult {
  const maxDays = config.maxDays ?? 30;
  validateConfig(config, maxDays);

  const state = createGraduatedState(content, config.seed);
  const coreMemberIds = Object.values(state.members).map((member) => member.id);
  const scheduler = createScheduler(content);
  const settlement = new SettlementService(content);
  const startingFunds = state.guild.funds;
  const fundsBeforeIdleTime = state.guild.funds;
  let currentTime = DAY_MS;
  const unscheduledFundsDelta = state.guild.funds - fundsBeforeIdleTime;
  let status: PostZulfarrakProgressionResult["status"] = "day-limit";
  let daysElapsed = 0;
  let activitiesStarted = 0;
  let attemptedDungeonRuns = 0;
  let completedDungeonRuns = 0;
  let failedDungeonRuns = 0;
  let recruitedMemberId: MemberId | undefined;
  let boostedRunCount = 0;
  let lootAssignments = 0;
  let lootSales = 0;
  const attemptedDungeonIds = new Set<DungeonId>();

  outer: for (let day = 1; day <= maxDays; day += 1) {
    if (targetCleared(state)) {
      status = "target-reached";
      break;
    }
    currentTime = Math.max(currentTime, day * DAY_MS);
    daysElapsed = day;
    for (let action = 0; action < config.managementActionsPerDay; action += 1) {
      if (!recruitedMemberId) recruitedMemberId = recruitNewcomer(state, content, currentTime);

      let participantIds = coreMemberIds;
      let dungeon: DungeonDefinition | null = null;
      if (recruitedMemberId && boostedRunCount === 0) {
        participantIds = boostParty(state, content, coreMemberIds, recruitedMemberId);
        dungeon = chooseBoostDungeon(state, content, participantIds, recruitedMemberId);
        if (dungeon) boostedRunCount += 1;
        else participantIds = coreMemberIds;
      }
      dungeon ??= chooseExperienceDungeon(state, content, coreMemberIds);
      if (!dungeon) {
        status = "content-cap";
        break outer;
      }

      const activity = startExpedition(
        state,
        content,
        scheduler,
        dungeon.id,
        participantIds,
        currentTime,
      );
      activitiesStarted += 1;
      attemptedDungeonIds.add(dungeon.id);
      const summary = settlement.settleDueActivities(state, Number.MAX_SAFE_INTEGER);
      if (summary.settled.length === 0 || !activity.completedAt) {
        throw new Error(`后祖尔法拉克进度模拟中的副本活动 ${activity.id} 未完成结算。`);
      }
      currentTime = activity.completedAt + 1;
      const attemptedRuns = activity.runPlans.filter((run) =>
        run.stages.some((stage) => stage.status !== "pending"),
      ).length;
      attemptedDungeonRuns += attemptedRuns;
      completedDungeonRuns += activity.completedRuns;
      if (activity.status === "failed") failedDungeonRuns += 1;
      const loot = autoAssignLoot(state, content);
      lootAssignments += loot.assigned;
      lootSales += loot.sold;
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
    targetDungeonId: TARGET_DUNGEON_ID,
    targetReached: status === "target-reached",
    daysElapsed,
    daysToTarget: status === "target-reached" ? daysElapsed : null,
    levelCap: getMemberLevelCap(state, content),
    highestAvailableRecommendedLevel: Math.max(
      ...state.guild.unlockedDungeonIds.map(
        (dungeonId) => content.dungeonById.get(dungeonId)?.recommendedLevel ?? 0,
      ),
    ),
    startingCoreLevel: 45,
    minimumCoreLevel: Math.min(...levels),
    averageCoreLevel: round(mean(levels)),
    maximumCoreLevel: Math.max(...levels),
    activitiesStarted,
    attemptedDungeonRuns,
    completedDungeonRuns,
    failedDungeonRuns,
    recruitedMemberCount: recruitedMemberId ? 1 : 0,
    boostedRunCount,
    lootAssignments,
    lootSales,
    startingFunds,
    endingFunds: state.guild.funds,
    unscheduledFundsDelta,
    averageItemLevel: round(
      mean(
        coreMemberIds.map((memberId) =>
          averageEquippedItemLevel(state.members[memberId]!, state.itemInstances, content),
        ),
      ),
    ),
    attemptedDungeonIds: [...attemptedDungeonIds].sort(),
  };
}

function createGraduatedState(content: ContentRegistry, seed: string): GameState {
  const ids = new LocalIdGenerator();
  const random = new SeededRandomSource(seed);
  const state = createNewGame({
    slotId: asBrandedId<"SaveSlotId">(`post_zulfarrak_${seed}`),
    content,
    contentVersion: asBrandedId<"ContentVersion">("classic-2019-phase-6"),
    clock: { now: () => 0 },
    ids,
    random,
  });
  for (const member of Object.values(state.members)) {
    member.progression.level = 45;
    member.progression.experience = 0;
  }
  state.collection.claimedRewardIds.push(GRADUATION_REWARD_ID);
  state.guild.purchasedUpgradeIds.push(QUEUE_UPGRADE_ID);
  for (const dungeonId of LEGACY_DUNGEON_IDS) {
    if (!content.dungeonById.has(dungeonId)) {
      throw new Error(`后祖尔法拉克起始存档缺少旧副本 ${dungeonId}。`);
    }
  }
  state.guild.unlockedDungeonIds = [...LEGACY_DUNGEON_IDS];
  state.guild.firstKillEncounterIds.push(ZULFARRAK_FINAL_ENCOUNTER_ID);
  state.history.encounterVictoryCounts[ZULFARRAK_FINAL_ENCOUNTER_ID] = 1;
  for (const dungeonId of LEGACY_DUNGEON_IDS) state.history.dungeonClearCounts[dungeonId] = 1;
  state.history.dungeonClearCounts[ZULFARRAK_ID] = 1;
  return state;
}

function targetCleared(state: GameState): boolean {
  return (state.history.dungeonClearCounts[TARGET_DUNGEON_ID] ?? 0) > 0;
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
  now: number,
): ExpeditionActivity {
  const ids = new LocalIdGenerator(state.ids);
  const random = new SeededRandomSource(state.random);
  const result = scheduler.start<StartExpeditionRequest, ExpeditionActivity>(
    state,
    {
      type: "expedition",
      dungeonId,
      participantIds,
      requestedRuns: getExpeditionRunCapacity(state, content),
      selectedOptionalNodeIds: [],
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

function chooseExperienceDungeon(
  state: GameState,
  content: ContentRegistry,
  memberIds: readonly MemberId[],
): DungeonDefinition | null {
  const candidates = state.guild.unlockedDungeonIds.flatMap((dungeonId) => {
    const dungeon = content.dungeonById.get(dungeonId);
    if (!dungeon || dungeon.minimumLevel > minimumLevel(state, memberIds)) return [];
    const totalExperience = Object.values(
      experienceFractions(state, content, dungeon.id, memberIds),
    ).reduce<number>((sum, fraction) => sum + (fraction ?? 0), 0);
    if (totalExperience <= 0) return [];
    const preview = evaluateExpeditionParty(state, content, dungeon.id, memberIds);
    if (!preview.ok) return [];
    return [{ dungeon, clearProbability: preview.preview.clearProbability }];
  });
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
  if (generated instanceof Promise) throw new Error("后祖尔法拉克模拟不支持异步招募命令。");
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
  const candidates: DungeonCandidate[] = state.guild.unlockedDungeonIds.flatMap((dungeonId) => {
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

function validateConfig(config: PostZulfarrakProgressionConfig, maxDays: number): void {
  if (!config.seed) throw new Error("后祖尔法拉克进度模拟种子不能为空。");
  for (const [label, value] of [
    ["每日管理次数", config.managementActionsPerDay],
    ["最大天数", maxDays],
  ] as const) {
    if (!Number.isInteger(value) || value <= 0) throw new Error(`${label}必须是正整数。`);
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

export interface PostZulfarrakScenarioSummary {
  readonly managementActionsPerDay: number;
  readonly outcomes: Readonly<Record<PostZulfarrakProgressionResult["status"], number>>;
  readonly daysElapsed: NumericSummary;
  readonly minimumCoreLevel: NumericSummary;
  readonly maximumCoreLevel: NumericSummary;
  readonly activitiesStarted: NumericSummary;
  readonly attemptedDungeonRuns: NumericSummary;
  readonly completedDungeonRuns: NumericSummary;
  readonly averageItemLevel: NumericSummary;
  readonly endingFunds: NumericSummary;
  readonly boostedRunCount: NumericSummary;
  readonly lootAssignments: NumericSummary;
  readonly lootSales: NumericSummary;
}

export interface PostZulfarrakProgressionBaseline {
  readonly schemaVersion: 1;
  readonly contentScope: "classic-2019-phase-6";
  readonly startingState: "zulfarrak-graduated-core-five-at-level-45";
  readonly target: { readonly type: "dungeon-first-clear"; readonly dungeonId: string };
  readonly maxDays: number;
  readonly sampleCount: number;
  readonly seedPrefix: string;
  readonly policy: {
    readonly levelCap: 60;
    readonly dungeonSelection: "highest-recommended-with-experience-at-55-percent-clear-otherwise-safest";
    readonly oldContent: "all-sixteen-previous-dungeons-remain-repeatable";
    readonly normalRecruitment: "one-random-newcomer-boosted-once";
    readonly lootHandling: "auto-assign-after-each-player-scheduled-activity";
    readonly offlineIncome: "none-outside-player-scheduled-activities";
    readonly expectedStop: "content-cap-after-sunken-temple-until-blackrock-depths-exists";
  };
  readonly highestAvailableRecommendedLevel: number;
  readonly scenarios: readonly PostZulfarrakScenarioSummary[];
}

export function buildPostZulfarrakProgressionBaseline(
  content: ContentRegistry,
  options: {
    readonly sampleCount?: number;
    readonly maxDays?: number;
    readonly seedPrefix?: string;
    readonly managementActionsPerDay?: readonly number[];
  } = {},
): PostZulfarrakProgressionBaseline {
  const sampleCount = options.sampleCount ?? 32;
  const maxDays = options.maxDays ?? 30;
  const seedPrefix = options.seedPrefix ?? "post-zulfarrak-baseline-v1";
  const schedules = options.managementActionsPerDay ?? [3, 4, 5, 6];
  if (!Number.isInteger(sampleCount) || sampleCount <= 0) {
    throw new Error("后祖尔法拉克进度基线样本数必须是正整数。");
  }
  const scenarios = schedules.map((managementActionsPerDay) => {
    const samples = Array.from({ length: sampleCount }, (_, index) =>
      simulatePostZulfarrakProgression(content, {
        seed: `${seedPrefix}:${managementActionsPerDay}:${index}`,
        managementActionsPerDay,
        maxDays,
      }),
    );
    return {
      managementActionsPerDay,
      outcomes: {
        "target-reached": samples.filter((sample) => sample.status === "target-reached").length,
        "content-cap": samples.filter((sample) => sample.status === "content-cap").length,
        "day-limit": samples.filter((sample) => sample.status === "day-limit").length,
      },
      daysElapsed: summarize(samples.map((sample) => sample.daysElapsed)),
      minimumCoreLevel: summarize(samples.map((sample) => sample.minimumCoreLevel)),
      maximumCoreLevel: summarize(samples.map((sample) => sample.maximumCoreLevel)),
      activitiesStarted: summarize(samples.map((sample) => sample.activitiesStarted)),
      attemptedDungeonRuns: summarize(samples.map((sample) => sample.attemptedDungeonRuns)),
      completedDungeonRuns: summarize(samples.map((sample) => sample.completedDungeonRuns)),
      averageItemLevel: summarize(samples.map((sample) => sample.averageItemLevel)),
      endingFunds: summarize(samples.map((sample) => sample.endingFunds)),
      boostedRunCount: summarize(samples.map((sample) => sample.boostedRunCount)),
      lootAssignments: summarize(samples.map((sample) => sample.lootAssignments)),
      lootSales: summarize(samples.map((sample) => sample.lootSales)),
    };
  });
  return {
    schemaVersion: 1,
    contentScope: "classic-2019-phase-6",
    startingState: "zulfarrak-graduated-core-five-at-level-45",
    target: { type: "dungeon-first-clear", dungeonId: TARGET_DUNGEON_ID },
    maxDays,
    sampleCount,
    seedPrefix,
    policy: {
      levelCap: 60,
      dungeonSelection: "highest-recommended-with-experience-at-55-percent-clear-otherwise-safest",
      oldContent: "all-sixteen-previous-dungeons-remain-repeatable",
      normalRecruitment: "one-random-newcomer-boosted-once",
      lootHandling: "auto-assign-after-each-player-scheduled-activity",
      offlineIncome: "none-outside-player-scheduled-activities",
      expectedStop: "content-cap-after-sunken-temple-until-blackrock-depths-exists",
    },
    highestAvailableRecommendedLevel: Math.max(
      ...content.dungeons.map((dungeon) => dungeon.recommendedLevel),
    ),
    scenarios,
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
