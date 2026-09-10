import type { ContentRegistry } from "../../content/registry";
import {
  getDungeonDevelopmentSummary,
  partyCanInvestigateQuest,
  questProgressesInDungeon,
  requiredOptionalNodeIdsForQuest,
} from "../../domain/dungeon/dungeon-development";
import type { GameState } from "../../domain/game-state";
import type {
  DungeonId,
  DungeonRouteNodeId,
  DungeonRouteVariantId,
  ItemDefinitionId,
  MemberId,
  QuestId,
} from "../../domain/shared/ids";
import { routeForVariant } from "../../domain/dungeon/dungeon-route";

export interface ExpeditionCommissionBriefEntryView {
  readonly questId: QuestId;
  readonly status: "clue" | "investigating";
  readonly name: string;
  readonly description: string;
  readonly objectiveLabel: string;
  readonly progressLabel: string;
  readonly routeCovered: boolean;
  readonly willComplete: boolean;
  readonly requiredOptionalNodeIds: readonly DungeonRouteNodeId[];
  readonly requiredOptionalBossNames: readonly string[];
  readonly rewardItems: readonly {
    readonly id: ItemDefinitionId;
    readonly name: string;
    readonly itemLevel: number;
  }[];
}

export interface ExpeditionQuestBriefView {
  readonly dungeonId: DungeonId;
  readonly dungeonName: string;
  readonly entries: readonly ExpeditionCommissionBriefEntryView[];
  readonly advanceCount: number;
  readonly firstDevelopmentCount: number;
  readonly developmentCacheItemCount: number;
  readonly currentLevel: number;
  readonly currentExperienceBonusPercent: number;
  readonly currentExtraLootPercent: number;
}

export function getExpeditionQuestBriefView(
  state: GameState,
  content: ContentRegistry,
  dungeonId: DungeonId,
  participantIds: readonly MemberId[],
  selectedOptionalNodeIds: readonly DungeonRouteNodeId[] = [],
  routeVariantId?: DungeonRouteVariantId,
): ExpeditionQuestBriefView | null {
  const dungeon = content.dungeonById.get(dungeonId);
  if (!dungeon) return null;
  const selectedOptional = new Set(selectedOptionalNodeIds);
  const route = routeForVariant(dungeon, routeVariantId);
  const includedEncounterIds = new Set(
    route.flatMap((node) =>
      node.type === "required" || (node.type === "optional" && selectedOptional.has(node.id))
        ? [node.encounterId]
        : [],
    ),
  );
  const entries = content.quests.flatMap((quest): ExpeditionCommissionBriefEntryView[] => {
    const progress = state.dungeonDevelopment.entries[quest.id];
    if (progress?.status === "completed") return [];
    if (!questProgressesInDungeon(quest, dungeonId, content)) return [];
    if (!partyCanInvestigateQuest(state, quest, participantIds)) return [];
    if (
      quest.completion.type === "encounter-victories" &&
      (quest.completion.excludedEncounterIds ?? []).some((id) => includedEncounterIds.has(id))
    ) {
      return [];
    }
    const optionalIds = requiredOptionalNodeIdsForQuest(quest, dungeonId, content);
    const routeCovered =
      quest.completion.type === "dungeon-clear"
        ? true
        : quest.completion.encounterIds.some((id) => includedEncounterIds.has(id)) &&
          optionalIds.every((id) => selectedOptional.has(id));
    const completedEncounterIds = new Set([
      ...(progress?.encounterVictoryIds ?? []),
      ...includedEncounterIds,
    ]);
    const willComplete =
      routeCovered &&
      (quest.completion.type === "dungeon-clear" ||
        quest.completion.encounterIds.every((id) => completedEncounterIds.has(id)));
    const encounterCompletion =
      quest.completion.type === "encounter-victories" ? quest.completion : null;
    const relevantProgress =
      progress && encounterCompletion
        ? progress.encounterVictoryIds.filter((id) => encounterCompletion.encounterIds.includes(id))
            .length
        : 0;
    const encounterNames =
      quest.completion.type === "encounter-victories"
        ? quest.completion.encounterIds.map((id) => content.encounterById.get(id)?.name.zhCN ?? id)
        : [];
    const discovered = Boolean(progress);
    return [
      {
        questId: quest.id,
        status: discovered ? "investigating" : "clue",
        name: discovered ? quest.name.zhCN : "尚未查明的远征线索",
        description: discovered
          ? quest.description.zhCN
          : `${dungeon.name.zhCN}中存在尚未确认的装备线索。`,
        objectiveLabel: discovered
          ? quest.completion.type === "dungeon-clear"
            ? `完整通关${dungeon.name.zhCN}`
            : `击败${encounterNames.join("、")}`
          : `可能线索：${dungeon.name.zhCN}`,
        progressLabel:
          quest.completion.type === "dungeon-clear"
            ? "等待完整通关"
            : `${relevantProgress}/${encounterCompletion!.encounterIds.length} 项线索`,
        routeCovered,
        willComplete,
        requiredOptionalNodeIds: optionalIds,
        requiredOptionalBossNames: optionalIds.map((nodeId) => {
          const node = dungeon.route.find((entry) => entry.id === nodeId);
          return node
            ? (content.encounterById.get(node.encounterId)?.name.zhCN ?? node.encounterId)
            : nodeId;
        }),
        rewardItems: discovered
          ? [...quest.rewards.fixedItemIds, ...quest.rewards.itemChoiceIds].map((itemId) => {
              const item = content.itemById.get(itemId)!;
              return { id: item.id, name: item.name.zhCN, itemLevel: item.itemLevel };
            })
          : [],
      },
    ];
  });
  const completing = entries.filter((entry) => entry.willComplete);
  const optionalCompletions = completing.filter((entry) =>
    entry.requiredOptionalNodeIds.some((id) => selectedOptional.has(id)),
  ).length;
  const candidateItemCount = new Set(
    completing.flatMap((entry) => {
      const quest = content.questById.get(entry.questId)!;
      return [...quest.rewards.fixedItemIds, ...quest.rewards.itemChoiceIds];
    }),
  ).size;
  const summary = getDungeonDevelopmentSummary(state, content, dungeonId);
  return {
    dungeonId,
    dungeonName: dungeon.name.zhCN,
    entries,
    advanceCount: entries.filter((entry) => entry.routeCovered).length,
    firstDevelopmentCount: completing.length,
    developmentCacheItemCount:
      completing.length > 0 ? Math.min(candidateItemCount, 1 + optionalCompletions) : 0,
    currentLevel: summary.level,
    currentExperienceBonusPercent: Math.round((summary.experienceMultiplier - 1) * 100),
    currentExtraLootPercent: Math.round(summary.extraLootChance * 100),
  };
}
