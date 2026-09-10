import type { ContentRegistry } from "../../content/registry";
import type { ActivityHandler, ActivityStartRequest } from "../activity/activity-handler";
import type {
  ExpeditionActivity,
  ExpeditionEquipmentSnapshot,
  ExpeditionMemberSnapshot,
  ExpeditionRunPlan,
} from "../activity/activity";
import type { CombatProfile } from "../combat/combat-profile";
import type { GameState } from "../game-state";
import {
  asBrandedId,
  type DungeonId,
  type DungeonRouteNodeId,
  type DungeonRouteVariantId,
} from "../shared/ids";
import { SeededRandomSource } from "../../infrastructure/random/seeded-random-source";
import { evaluateExpeditionParty } from "./party-evaluation";
import { lockRareRouteSpawns, revealRareRouteNodes } from "./rare-route";
import { getExpeditionRunCapacity } from "../guild/guild-upgrade-rules";
import { applyMemberExperience, getMemberLevelCap } from "../member/member-level-cap";
import { routeForVariant } from "./dungeon-route";

export interface DungeonExperienceConfig {
  readonly baseFraction: number;
  readonly recommendedLevelBonusPerLevel: number;
  readonly overlevelZeroThreshold: number;
  readonly maximumFractionPerRun: number;
  readonly boost: {
    readonly graceLevelSpread: number;
    readonly penaltyPerExcessLevel: number;
    readonly minimumMultiplier: number;
  };
}

export const DEFAULT_DUNGEON_EXPERIENCE_CONFIG: DungeonExperienceConfig = {
  baseFraction: 0.5,
  recommendedLevelBonusPerLevel: 0.08,
  overlevelZeroThreshold: 8,
  maximumFractionPerRun: 2,
  boost: {
    graceLevelSpread: 15,
    penaltyPerExcessLevel: 0.015,
    minimumMultiplier: 0.5,
  },
};

export interface MemberExperienceProjection {
  readonly memberId: ExpeditionMemberSnapshot["memberId"];
  readonly experienceFraction: number;
  readonly boostMultiplier: number;
  readonly projectedLevel: number;
  readonly projectedExperience: number;
}

export interface StartExpeditionRequest extends ActivityStartRequest {
  readonly type: "expedition";
  readonly dungeonId: DungeonId;
  readonly requestedRuns: number;
  readonly selectedOptionalNodeIds?: readonly DungeonRouteNodeId[];
  readonly routeVariantId?: DungeonRouteVariantId;
}

export function createExpeditionActivityHandler(
  content: ContentRegistry,
): ActivityHandler<StartExpeditionRequest, ExpeditionActivity> {
  return {
    type: "expedition",
    validateStart(context, request) {
      const dungeon = content.dungeonById.get(request.dungeonId);
      if (!dungeon) {
        return { ok: false, issues: [{ code: "dungeon.not-found", message: "找不到该副本。" }] };
      }
      const issues = [];
      const selectedOptionalNodeIds = request.selectedOptionalNodeIds ?? [];
      const selectedIds = new Set<DungeonRouteNodeId>();
      for (const nodeId of selectedOptionalNodeIds) {
        const node = dungeon.route.find((candidate) => candidate.id === nodeId);
        if (selectedIds.has(nodeId)) {
          issues.push({ code: "route.optional-duplicate", message: "同一可选首领不能重复选择。" });
        } else if (!node) {
          issues.push({
            code: "route.optional-not-found",
            message: "选择了不属于当前副本的可选首领。",
          });
        } else if (node.type !== "optional") {
          issues.push({
            code: "route.not-optional",
            message: "必打或稀有首领不能作为普通可选首领提交。",
          });
        }
        selectedIds.add(nodeId);
      }
      if (!context.state.guild.unlockedDungeonIds.includes(request.dungeonId)) {
        issues.push({ code: "dungeon.locked", message: `${dungeon.name.zhCN}尚未解锁。` });
      }
      const maximumRuns = getExpeditionRunCapacity(context.state, content);
      if (
        !Number.isInteger(request.requestedRuns) ||
        request.requestedRuns < 1 ||
        request.requestedRuns > maximumRuns
      ) {
        issues.push({
          code: "runs.invalid",
          message: `连续副本次数必须为 1–${maximumRuns} 次。`,
        });
      }
      if (request.participantIds.length < dungeon.members.minimum) {
        issues.push({
          code: "party.too-small",
          message: `${dungeon.name.zhCN}至少需要 ${dungeon.members.minimum} 人。`,
        });
      }
      if (request.participantIds.length > dungeon.members.maximum) {
        issues.push({
          code: "party.too-large",
          message: `${dungeon.name.zhCN}最多允许 ${dungeon.members.maximum} 人。`,
        });
      }
      const preview = evaluateExpeditionParty(
        context.state,
        content,
        request.dungeonId,
        request.participantIds,
        selectedOptionalNodeIds,
        [],
        request.routeVariantId,
      );
      if (!preview.ok) issues.push(...preview.issues);
      return issues.length === 0 ? { ok: true } : { ok: false, issues };
    },
    create(context, request) {
      const dungeon = content.dungeonById.get(request.dungeonId)!;
      const requestedOptionalIds = new Set(request.selectedOptionalNodeIds ?? []);
      const activeRoute = routeForVariant(dungeon, request.routeVariantId);
      const selectedOptionalNodeIds = activeRoute
        .filter((node) => node.type === "optional" && requestedOptionalIds.has(node.id))
        .map((node) => node.id);
      const previewResult = evaluateExpeditionParty(
        context.state,
        content,
        request.dungeonId,
        request.participantIds,
        selectedOptionalNodeIds,
        [],
        request.routeVariantId,
      );
      if (!previewResult.ok) throw new Error("通过校验的副本队伍无法生成预览。");
      const activityId = asBrandedId<"ActivityId">(context.ids.next("expedition"));
      const activitySeed = `${context.state.random.seed}:expedition:${activityId}:${context.random.next("expedition-seed")}`;
      const runPlans: ExpeditionRunPlan[] = [];
      for (let runNumber = 1; runNumber <= request.requestedRuns; runNumber += 1) {
        const runSeed = `${activitySeed}:run:${runNumber}:${context.random.next("run-seed")}`;
        const runRandom = new SeededRandomSource(runSeed);
        const rareNodeSpawns = lockRareRouteSpawns(activeRoute, runRandom);
        const includedRareNodeIds = Object.entries(rareNodeSpawns).flatMap(([nodeId, spawned]) =>
          spawned ? [asBrandedId<"DungeonRouteNodeId">(nodeId)] : [],
        );
        const runPreview = evaluateExpeditionParty(
          context.state,
          content,
          request.dungeonId,
          request.participantIds,
          selectedOptionalNodeIds,
          includedRareNodeIds,
          request.routeVariantId,
        );
        if (!runPreview.ok) throw new Error("稀有首领路线无法使用当前队伍生成。");
        const runPlan: ExpeditionRunPlan = {
          runNumber,
          seed: runSeed,
          experienceFractionByMember:
            runNumber === 1
              ? experienceFractions(
                  context.state,
                  content,
                  request.dungeonId,
                  request.participantIds,
                )
              : {},
          maximumExperiencePerMember: DEFAULT_DUNGEON_EXPERIENCE_CONFIG.maximumFractionPerRun,
          experienceAwardedByMember: {},
          stages: runPreview.preview.encounters.map((encounter) => ({
            routeNodeId: encounter.routeNodeId,
            routeNodeType: encounter.routeNodeType,
            encounterId: encounter.encounterId,
            probability: encounter.probability,
            rawRatios: { ...encounter.rawRatios },
            durationSeconds: encounter.durationSeconds,
            mechanics: structuredClone(encounter.mechanics),
            successRoll: runRandom.next(`success:${encounter.encounterId}`),
            lootSeed: `${runSeed}:loot:${encounter.encounterId}:${runRandom.next(`loot:${encounter.encounterId}`)}`,
            status: "pending",
          })),
          rareNodeSpawns,
          rareNodeReveals: {},
          mainRouteCompleted: false,
        };
        revealRareRouteNodes(runPlan, activeRoute, runPlan.stages[0]?.routeNodeId);
        runPlans.push(runPlan);
      }
      const firstStage = runPlans[0]!.stages[0]!;
      const questSnapshots = request.participantIds.flatMap((memberId) => {
        const member = context.state.members[memberId]!;
        return Object.values(member.quests.entries).flatMap((progress) => {
          if (!progress || progress.status !== "accepted") return [];
          const quest = content.questById.get(progress.questId);
          if (!quest || !questProgressesInDungeon(quest, request.dungeonId, content)) return [];
          const encounterIds =
            quest.completion.type === "encounter-victories" ? quest.completion.encounterIds : [];
          return [
            {
              memberId,
              questId: quest.id,
              completion: structuredClone(quest.completion),
              requiredOptionalNodeIds: activeRoute.flatMap((node) =>
                node.type === "optional" && encounterIds.includes(node.encounterId)
                  ? [node.id]
                  : [],
              ),
            },
          ];
        });
      });
      return {
        id: activityId,
        type: "expedition",
        participantIds: [...request.participantIds],
        status: "active",
        createdAt: context.now,
        startedAt: context.now,
        nextSettlementAt: context.now + firstStage.durationSeconds * 1_000,
        seed: activitySeed,
        contentVersion: context.state.contentVersion,
        dungeonId: request.dungeonId,
        ...(request.routeVariantId ? { routeVariantId: request.routeVariantId } : {}),
        selectedOptionalNodeIds,
        requestedRuns: request.requestedRuns,
        completedRuns: 0,
        activeRunIndex: 0,
        activeEncounterIndex: 0,
        partySnapshot: {
          formulaVersion: previewResult.preview.formulaVersion,
          members: request.participantIds.map((memberId) =>
            snapshotMember(
              context.state,
              memberId,
              previewResult.preview.memberProfiles.find(
                (profile) => profile.memberId === memberId,
              )!,
            ),
          ),
          contribution: { ...previewResult.preview.contribution },
          clearProbability: previewResult.preview.clearProbability,
          durationSeconds: previewResult.preview.durationSeconds,
          capabilities: previewResult.preview.capabilities,
        },
        runPlans,
        questSnapshots,
      };
    },
  };
}

function questProgressesInDungeon(
  quest: ContentRegistry["quests"][number],
  dungeonId: StartExpeditionRequest["dungeonId"],
  content: ContentRegistry,
): boolean {
  if (quest.completion.type === "dungeon-clear") return quest.dungeonId === dungeonId;
  return quest.completion.encounterIds.some(
    (encounterId) => content.encounterById.get(encounterId)?.dungeonId === dungeonId,
  );
}

export function experienceFractions(
  state: GameState,
  content: ContentRegistry,
  dungeonId: StartExpeditionRequest["dungeonId"],
  memberIds: readonly ExpeditionMemberSnapshot["memberId"][],
  config: DungeonExperienceConfig = DEFAULT_DUNGEON_EXPERIENCE_CONFIG,
): Partial<Record<ExpeditionMemberSnapshot["memberId"], number>> {
  const dungeon = content.dungeonById.get(dungeonId)!;
  const levels = memberIds.flatMap((memberId) => {
    const member = state.members[memberId];
    return member ? [member.progression.level] : [];
  });
  const levelSpread = levels.length > 1 ? Math.max(...levels) - Math.min(...levels) : 0;
  const boostMultiplier = boostExperienceMultiplier(levelSpread, config);
  const levelCap = getMemberLevelCap(state, content);
  return Object.fromEntries(
    memberIds.map((memberId) => {
      const member = state.members[memberId]!;
      if (
        member.progression.level >= levelCap ||
        dungeon.recommendedLevel <= member.progression.level - config.overlevelZeroThreshold
      ) {
        return [memberId, 0];
      }
      let fraction = Math.min(
        config.maximumFractionPerRun,
        Math.max(
          0,
          config.baseFraction *
            (1 +
              config.recommendedLevelBonusPerLevel *
                (dungeon.recommendedLevel - member.progression.level)),
        ),
      );
      if (member.identity.personalityId === "diligent") fraction *= 1.15;
      if (member.identity.personalityId === "clever") fraction *= 0.9;
      fraction *= boostMultiplier;
      return [memberId, Math.min(config.maximumFractionPerRun, fraction)];
    }),
  );
}

export function projectExpeditionExperience(
  state: GameState,
  content: ContentRegistry,
  dungeonId: StartExpeditionRequest["dungeonId"],
  memberIds: readonly ExpeditionMemberSnapshot["memberId"][],
  routeExperienceShare: number,
  requestedRuns: number,
  config: DungeonExperienceConfig = DEFAULT_DUNGEON_EXPERIENCE_CONFIG,
): readonly MemberExperienceProjection[] {
  const projectedState = structuredClone(state);
  const initialLevels = new Map(
    memberIds.map((memberId) => {
      const member = projectedState.members[memberId]!;
      return [memberId, member.progression.level] as const;
    }),
  );
  const initialProgress = new Map(
    memberIds.map((memberId) => {
      const member = projectedState.members[memberId]!;
      return [memberId, member.progression.level + member.progression.experience] as const;
    }),
  );
  const initialSpread = levelSpread(projectedState, memberIds);
  const boostMultiplier = boostExperienceMultiplier(initialSpread, config);
  const levelCap = getMemberLevelCap(projectedState, content);

  for (let run = 0; run < requestedRuns; run += 1) {
    const fractions = experienceFractions(projectedState, content, dungeonId, memberIds, config);
    for (const memberId of memberIds) {
      const member = projectedState.members[memberId]!;
      applyMemberExperience(
        member,
        Math.min(config.maximumFractionPerRun, (fractions[memberId] ?? 0) * routeExperienceShare),
        levelCap,
      );
    }
  }

  return memberIds.map((memberId) => {
    const member = projectedState.members[memberId]!;
    const gained =
      member.progression.level +
      member.progression.experience -
      (initialProgress.get(memberId) ?? 0);
    return {
      memberId,
      experienceFraction: Math.max(0, gained),
      boostMultiplier,
      projectedLevel: Math.max(initialLevels.get(memberId) ?? 1, member.progression.level),
      projectedExperience: member.progression.experience,
    };
  });
}

function levelSpread(
  state: GameState,
  memberIds: readonly ExpeditionMemberSnapshot["memberId"][],
): number {
  const levels = memberIds.map((memberId) => state.members[memberId]!.progression.level);
  return levels.length > 1 ? Math.max(...levels) - Math.min(...levels) : 0;
}

function boostExperienceMultiplier(levelSpread: number, config: DungeonExperienceConfig): number {
  const excessLevels = Math.max(0, levelSpread - config.boost.graceLevelSpread);
  return Math.max(
    config.boost.minimumMultiplier,
    1 - excessLevels * config.boost.penaltyPerExcessLevel,
  );
}

function snapshotMember(
  state: GameState,
  memberId: ExpeditionMemberSnapshot["memberId"],
  profile: CombatProfile,
): ExpeditionMemberSnapshot {
  const member = state.members[memberId]!;
  const equipment: ExpeditionMemberSnapshot["equipment"] = {};
  for (const [slot, instanceId] of Object.entries(member.equipment)) {
    const instance = state.itemInstances[instanceId]!;
    equipment[slot as keyof typeof equipment] = {
      itemInstanceId: instance.id,
      itemDefinitionId: instance.definitionId,
    } satisfies ExpeditionEquipmentSnapshot;
  }
  return {
    memberId,
    classId: member.identity.classId,
    specId: member.progression.specId,
    personalityId: member.identity.personalityId,
    level: member.progression.level,
    equipment,
    combat: {
      formulaVersion: profile.formulaVersion,
      role: profile.role,
      capabilities: { ...profile.capabilities },
      utility: { ...profile.utility },
    },
  };
}
