import type { ContentRegistry } from "../../content/registry";
import type { DungeonQuestDefinition } from "../../content/schemas/quest";
import type { ExpeditionActivity, ExpeditionDevelopmentSnapshot } from "../activity/activity";
import type { GameState } from "../game-state";
import type {
  DungeonId,
  DungeonRouteNodeId,
  EncounterId,
  ItemDefinitionId,
  MemberId,
  QuestId,
} from "../shared/ids";

export interface DungeonCommissionProgress {
  questId: QuestId;
  status: "investigating" | "completed";
  discoveredAt: number;
  encounterVictoryIds: EncounterId[];
  completedAt?: number;
  completionEncounterId?: EncounterId;
}

export interface DungeonDevelopmentState {
  entries: Partial<Record<QuestId, DungeonCommissionProgress>>;
}

export interface DungeonDevelopmentSummary {
  readonly dungeonId: DungeonId;
  readonly points: number;
  readonly totalPoints: number;
  readonly level: number;
  readonly experienceMultiplier: number;
  readonly extraLootChance: number;
  readonly nextLevelPoints?: number;
}

export interface CommissionProgressEvent {
  readonly questId: QuestId;
  readonly discovered: boolean;
  readonly completed: boolean;
  readonly progress: number;
  readonly required: number;
}

export const DEVELOPMENT_LEVEL_RATIOS = [0.1, 0.25, 0.45, 0.7, 1] as const;
export const DEVELOPMENT_EXPERIENCE_BONUS_PER_LEVEL = 0.04;
export const DEVELOPMENT_EXTRA_LOOT_CHANCE_PER_LEVEL = 0.03;

export function createEmptyDungeonDevelopmentState(): DungeonDevelopmentState {
  return { entries: {} };
}

export function questDevelopmentPoints(quest: DungeonQuestDefinition): number {
  return Math.min(
    5,
    1 +
      Math.floor(quest.rewards.experienceFraction / 0.5) +
      Math.min(2, Math.floor(quest.rewards.funds / 100)),
  );
}

export function getDungeonDevelopmentSummary(
  state: Pick<GameState, "dungeonDevelopment">,
  content: ContentRegistry,
  dungeonId: DungeonId,
): DungeonDevelopmentSummary {
  const quests = content.quests.filter((quest) => quest.dungeonId === dungeonId);
  const totalPoints = quests.reduce((sum, quest) => sum + questDevelopmentPoints(quest), 0);
  const points = quests.reduce(
    (sum, quest) =>
      sum +
      (state.dungeonDevelopment.entries[quest.id]?.status === "completed"
        ? questDevelopmentPoints(quest)
        : 0),
    0,
  );
  const thresholds = DEVELOPMENT_LEVEL_RATIOS.map((ratio) => Math.ceil(totalPoints * ratio));
  const level = thresholds.filter((threshold) => points >= threshold && threshold > 0).length;
  return {
    dungeonId,
    points,
    totalPoints,
    level,
    experienceMultiplier: 1 + level * DEVELOPMENT_EXPERIENCE_BONUS_PER_LEVEL,
    extraLootChance: level * DEVELOPMENT_EXTRA_LOOT_CHANCE_PER_LEVEL,
    ...(level < DEVELOPMENT_LEVEL_RATIOS.length
      ? { nextLevelPoints: thresholds[level] ?? totalPoints }
      : {}),
  };
}

export function partyCanInvestigateQuest(
  state: Pick<GameState, "members">,
  quest: DungeonQuestDefinition,
  participantIds: readonly MemberId[],
): boolean {
  return participantIds.some((memberId) => {
    const member = state.members[memberId];
    if (!member || member.progression.level < quest.eligibility.minimumLevel) return false;
    return (
      quest.eligibility.allowedClassIds.length === 0 ||
      quest.eligibility.allowedClassIds.includes(member.identity.classId)
    );
  });
}

export function buildExpeditionDevelopmentSnapshot(
  state: Pick<GameState, "members" | "dungeonDevelopment">,
  content: ContentRegistry,
  dungeonId: DungeonId,
  participantIds: readonly MemberId[],
  includedEncounterIds: readonly EncounterId[],
  selectedOptionalNodeIds: readonly DungeonRouteNodeId[],
): ExpeditionDevelopmentSnapshot {
  const summary = getDungeonDevelopmentSummary(state, content, dungeonId);
  const included = new Set(includedEncounterIds);
  const selectedOptional = new Set(selectedOptionalNodeIds);
  const commissions = content.quests.flatMap((quest) => {
    if (state.dungeonDevelopment.entries[quest.id]?.status === "completed") return [];
    if (!partyCanInvestigateQuest(state, quest, participantIds)) return [];
    if (!questIsCoveredByRoute(quest, dungeonId, included, content)) return [];
    if (
      quest.completion.type === "encounter-victories" &&
      (quest.completion.excludedEncounterIds ?? []).some((encounterId) => included.has(encounterId))
    ) {
      return [];
    }
    const requiredOptionalNodeIds = requiredOptionalNodeIdsForQuest(quest, dungeonId, content);
    if (requiredOptionalNodeIds.some((nodeId) => !selectedOptional.has(nodeId))) return [];
    return [
      {
        questId: quest.id,
        completion: structuredClone(quest.completion),
        requiredOptionalNodeIds: [...requiredOptionalNodeIds],
      },
    ];
  });
  return {
    level: summary.level,
    experienceMultiplier: summary.experienceMultiplier,
    extraLootChance: summary.extraLootChance,
    unlockedItemIdsByEncounter: unlockedDevelopmentItemsByEncounter(state, content, dungeonId),
    commissions,
  };
}

export function questProgressesInDungeon(
  quest: DungeonQuestDefinition,
  dungeonId: DungeonId,
  content: ContentRegistry,
): boolean {
  if (quest.completion.type === "dungeon-clear") return quest.dungeonId === dungeonId;
  return quest.completion.encounterIds.some(
    (encounterId) => content.encounterById.get(encounterId)?.dungeonId === dungeonId,
  );
}

export function questIsCoveredByRoute(
  quest: DungeonQuestDefinition,
  dungeonId: DungeonId,
  includedEncounterIds: ReadonlySet<EncounterId>,
  content: ContentRegistry,
): boolean {
  if (!questProgressesInDungeon(quest, dungeonId, content)) return false;
  if (quest.completion.type === "dungeon-clear") return true;
  return quest.completion.encounterIds.some((encounterId) => includedEncounterIds.has(encounterId));
}

export function requiredOptionalNodeIdsForQuest(
  quest: DungeonQuestDefinition,
  dungeonId: DungeonId,
  content: ContentRegistry,
): readonly DungeonRouteNodeId[] {
  if (quest.completion.type === "dungeon-clear") return [];
  const encounterIds = quest.completion.encounterIds;
  const dungeon = content.dungeonById.get(dungeonId);
  return (
    dungeon?.route.flatMap((node) =>
      node.type === "optional" && encounterIds.includes(node.encounterId) ? [node.id] : [],
    ) ?? []
  );
}

export function unlockedDevelopmentItemsByEncounter(
  state: Pick<GameState, "dungeonDevelopment">,
  content: ContentRegistry,
  dungeonId: DungeonId,
): Partial<Record<EncounterId, ItemDefinitionId[]>> {
  const result: Partial<Record<EncounterId, ItemDefinitionId[]>> = {};
  for (const quest of content.quests) {
    const progress = state.dungeonDevelopment.entries[quest.id];
    if (progress?.status !== "completed") continue;
    const assignments = rewardEncounterAssignments(quest, content, progress.completionEncounterId);
    for (const [encounterId, itemIds] of assignments) {
      if (content.encounterById.get(encounterId)?.dungeonId !== dungeonId) continue;
      result[encounterId] = [...new Set([...(result[encounterId] ?? []), ...itemIds])];
    }
  }
  return result;
}

export function rewardEncounterAssignments(
  quest: DungeonQuestDefinition,
  content: ContentRegistry,
  completionEncounterId?: EncounterId,
): ReadonlyMap<EncounterId, readonly ItemDefinitionId[]> {
  const rewards = [...quest.rewards.fixedItemIds, ...quest.rewards.itemChoiceIds];
  if (quest.completion.type === "dungeon-clear") {
    const finalBoss = finalRequiredEncounterId(content, quest.dungeonId);
    return finalBoss ? new Map([[finalBoss, rewards]]) : new Map();
  }
  const dungeonIds = new Set(
    quest.completion.encounterIds.map(
      (encounterId) => content.encounterById.get(encounterId)?.dungeonId,
    ),
  );
  if (dungeonIds.size > 1) {
    const target = completionEncounterId ?? quest.completion.encounterIds.at(-1);
    return target ? new Map([[target, rewards]]) : new Map();
  }
  const targets = quest.completion.encounterIds;
  const assigned = new Map<EncounterId, ItemDefinitionId[]>();
  rewards.forEach((itemId, index) => {
    const encounterId = targets[index % targets.length]!;
    assigned.set(encounterId, [...(assigned.get(encounterId) ?? []), itemId]);
  });
  return assigned;
}

export function progressDevelopmentAfterEncounter(
  state: GameState,
  activity: ExpeditionActivity,
  encounterId: EncounterId,
  completedAt: number,
): readonly CommissionProgressEvent[] {
  const events: CommissionProgressEvent[] = [];
  for (const snapshot of activity.developmentSnapshot.commissions) {
    if (
      snapshot.completion.type !== "encounter-victories" ||
      !snapshot.completion.encounterIds.includes(encounterId)
    ) {
      continue;
    }
    const current = state.dungeonDevelopment.entries[snapshot.questId];
    if (current?.status === "completed") continue;
    const discovered = !current;
    const progress: DungeonCommissionProgress = current ?? {
      questId: snapshot.questId,
      status: "investigating",
      discoveredAt: completedAt,
      encounterVictoryIds: [],
    };
    if (!progress.encounterVictoryIds.includes(encounterId)) {
      progress.encounterVictoryIds.push(encounterId);
    }
    const completed = snapshot.completion.encounterIds.every((requiredId) =>
      progress.encounterVictoryIds.includes(requiredId),
    );
    if (completed) {
      progress.status = "completed";
      progress.completedAt = completedAt;
      progress.completionEncounterId = encounterId;
    }
    state.dungeonDevelopment.entries[snapshot.questId] = progress;
    events.push({
      questId: snapshot.questId,
      discovered,
      completed,
      progress: progress.encounterVictoryIds.filter((id) =>
        snapshot.completion.type === "encounter-victories"
          ? snapshot.completion.encounterIds.includes(id)
          : false,
      ).length,
      required: snapshot.completion.encounterIds.length,
    });
  }
  return events;
}

export function completeDevelopmentAfterDungeonClear(
  state: GameState,
  activity: ExpeditionActivity,
  completionEncounterId: EncounterId,
  completedAt: number,
): readonly CommissionProgressEvent[] {
  const events: CommissionProgressEvent[] = [];
  for (const snapshot of activity.developmentSnapshot.commissions) {
    if (snapshot.completion.type !== "dungeon-clear") continue;
    const current = state.dungeonDevelopment.entries[snapshot.questId];
    if (current?.status === "completed") continue;
    state.dungeonDevelopment.entries[snapshot.questId] = {
      questId: snapshot.questId,
      status: "completed",
      discoveredAt: current?.discoveredAt ?? completedAt,
      encounterVictoryIds: current?.encounterVictoryIds ?? [],
      completedAt,
      completionEncounterId,
    };
    events.push({
      questId: snapshot.questId,
      discovered: !current,
      completed: true,
      progress: 1,
      required: 1,
    });
  }
  return events;
}

function finalRequiredEncounterId(
  content: ContentRegistry,
  dungeonId: DungeonId,
): EncounterId | undefined {
  return content.dungeonById
    .get(dungeonId)
    ?.route.filter((node) => node.type === "required")
    .at(-1)?.encounterId;
}
