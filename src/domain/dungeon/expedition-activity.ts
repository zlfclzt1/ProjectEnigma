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
import { asBrandedId, type DungeonId, type DungeonRouteNodeId } from "../shared/ids";
import { SeededRandomSource } from "../../infrastructure/random/seeded-random-source";
import { evaluateExpeditionParty } from "./party-evaluation";
import { lockRareRouteSpawns, revealRareRouteNodes } from "./rare-route";
import { getExpeditionRunCapacity } from "../guild/guild-upgrade-rules";

export interface StartExpeditionRequest extends ActivityStartRequest {
  readonly type: "expedition";
  readonly dungeonId: DungeonId;
  readonly requestedRuns: number;
  readonly selectedOptionalNodeIds?: readonly DungeonRouteNodeId[];
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
      );
      if (!preview.ok) issues.push(...preview.issues);
      return issues.length === 0 ? { ok: true } : { ok: false, issues };
    },
    create(context, request) {
      const dungeon = content.dungeonById.get(request.dungeonId)!;
      const requestedOptionalIds = new Set(request.selectedOptionalNodeIds ?? []);
      const selectedOptionalNodeIds = dungeon.route
        .filter((node) => node.type === "optional" && requestedOptionalIds.has(node.id))
        .map((node) => node.id);
      const previewResult = evaluateExpeditionParty(
        context.state,
        content,
        request.dungeonId,
        request.participantIds,
        selectedOptionalNodeIds,
      );
      if (!previewResult.ok) throw new Error("通过校验的副本队伍无法生成预览。");
      const activityId = asBrandedId<"ActivityId">(context.ids.next("expedition"));
      const activitySeed = `${context.state.random.seed}:expedition:${activityId}:${context.random.next("expedition-seed")}`;
      const runPlans: ExpeditionRunPlan[] = [];
      for (let runNumber = 1; runNumber <= request.requestedRuns; runNumber += 1) {
        const runSeed = `${activitySeed}:run:${runNumber}:${context.random.next("run-seed")}`;
        const runRandom = new SeededRandomSource(runSeed);
        const rareNodeSpawns = lockRareRouteSpawns(dungeon.route, runRandom);
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
        revealRareRouteNodes(runPlan, dungeon.route, runPlan.stages[0]?.routeNodeId);
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
              requiredOptionalNodeIds: dungeon.route.flatMap((node) =>
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
): Partial<Record<ExpeditionMemberSnapshot["memberId"], number>> {
  const dungeon = content.dungeonById.get(dungeonId)!;
  return Object.fromEntries(
    memberIds.map((memberId) => {
      const member = state.members[memberId]!;
      if (
        member.progression.level >= 45 ||
        dungeon.recommendedLevel <= member.progression.level - 8
      ) {
        return [memberId, 0];
      }
      let fraction = Math.min(
        2,
        Math.max(0, 0.5 * (1 + 0.08 * (dungeon.recommendedLevel - member.progression.level))),
      );
      if (member.identity.personalityId === "diligent") fraction *= 1.15;
      if (member.identity.personalityId === "clever") fraction *= 0.9;
      return [memberId, Math.min(2, fraction)];
    }),
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
