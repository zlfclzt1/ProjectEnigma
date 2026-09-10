import type { ContentRegistry } from "../../content/registry";
import {
  getDungeonDevelopmentSummary,
  questDevelopmentPoints,
  rewardEncounterAssignments,
} from "../../domain/dungeon/dungeon-development";
import type { GameState } from "../../domain/game-state";
import type { DungeonId, ItemDefinitionId, QuestId } from "../../domain/shared/ids";

export interface DungeonDevelopmentCommissionView {
  readonly id: QuestId;
  readonly status: "clue" | "investigating" | "completed";
  readonly statusLabel: string;
  readonly name: string;
  readonly description: string;
  readonly objectiveLabel: string;
  readonly progressLabel: string;
  readonly points: number;
  readonly classRequirement: string | null;
  readonly rewardItems: readonly {
    readonly id: ItemDefinitionId;
    readonly name: string;
    readonly itemLevel: number;
    readonly bossName: string;
  }[];
}

export interface DungeonDevelopmentEntryView {
  readonly id: DungeonId;
  readonly name: string;
  readonly unlocked: boolean;
  readonly level: number;
  readonly points: number;
  readonly totalPoints: number;
  readonly nextLevelPoints?: number;
  readonly experienceBonusPercent: number;
  readonly extraLootPercent: number;
  readonly completedCount: number;
  readonly totalCount: number;
  readonly commissions: readonly DungeonDevelopmentCommissionView[];
}

export interface DungeonDevelopmentArchiveView {
  readonly dungeons: readonly DungeonDevelopmentEntryView[];
  readonly completedCommissionCount: number;
  readonly totalCommissionCount: number;
}

export function getDungeonDevelopmentView(
  state: GameState,
  content: ContentRegistry,
): DungeonDevelopmentArchiveView {
  const dungeons = content.dungeons
    .map((dungeon): DungeonDevelopmentEntryView => {
      const summary = getDungeonDevelopmentSummary(state, content, dungeon.id);
      const quests = content.quests.filter((quest) => quest.dungeonId === dungeon.id);
      const commissions = quests.map((quest, index): DungeonDevelopmentCommissionView => {
        const progress = state.dungeonDevelopment.entries[quest.id];
        const status = progress?.status ?? "clue";
        const encounterNames =
          quest.completion.type === "encounter-victories"
            ? quest.completion.encounterIds.map(
                (id) => content.encounterById.get(id)?.name.zhCN ?? id,
              )
            : [];
        const encounterCompletion =
          quest.completion.type === "encounter-victories" ? quest.completion : null;
        const relevantVictories =
          progress && encounterCompletion
            ? progress.encounterVictoryIds.filter((id) =>
                encounterCompletion.encounterIds.includes(id),
              ).length
            : 0;
        const required = encounterCompletion ? encounterCompletion.encounterIds.length : 1;
        const assignments = rewardEncounterAssignments(
          quest,
          content,
          progress?.completionEncounterId,
        );
        const rewardItems = [...assignments.entries()].flatMap(([encounterId, itemIds]) =>
          itemIds.map((itemId) => {
            const item = content.itemById.get(itemId)!;
            return {
              id: itemId,
              name: item.name.zhCN,
              itemLevel: item.itemLevel,
              bossName: content.encounterById.get(encounterId)?.name.zhCN ?? encounterId,
            };
          }),
        );
        const classNames = quest.eligibility.allowedClassIds.map(
          (classId) => content.classById.get(classId)?.name.zhCN ?? classId,
        );
        return {
          id: quest.id,
          status,
          statusLabel: {
            clue: "尚未调查",
            investigating: "调查中",
            completed: "已开发",
          }[status],
          name: status === "clue" ? `未查明的远征线索 ${index + 1}` : quest.name.zhCN,
          description:
            status === "clue"
              ? `${dungeon.name.zhCN}中仍有一项未确认的装备线索。选择合适路线探索后会逐步揭示。`
              : quest.description.zhCN,
          objectiveLabel:
            status === "clue"
              ? `可能线索：${dungeon.name.zhCN}`
              : quest.completion.type === "dungeon-clear"
                ? `完整通关${dungeon.name.zhCN}`
                : `击败${encounterNames.join("、")}`,
          progressLabel:
            status === "completed"
              ? "调查完成"
              : quest.completion.type === "dungeon-clear"
                ? "等待完整通关"
                : `${relevantVictories}/${required} 项线索`,
          points: questDevelopmentPoints(quest),
          classRequirement:
            classNames.length > 0
              ? `${quest.eligibility.minimumLevel}级 ${classNames.join(" / ")}`
              : null,
          rewardItems: status === "clue" ? [] : rewardItems,
        };
      });
      return {
        id: dungeon.id,
        name: dungeon.name.zhCN,
        unlocked: state.guild.unlockedDungeonIds.includes(dungeon.id),
        level: summary.level,
        points: summary.points,
        totalPoints: summary.totalPoints,
        ...(summary.nextLevelPoints === undefined
          ? {}
          : { nextLevelPoints: summary.nextLevelPoints }),
        experienceBonusPercent: Math.round((summary.experienceMultiplier - 1) * 100),
        extraLootPercent: Math.round(summary.extraLootChance * 100),
        completedCount: commissions.filter((entry) => entry.status === "completed").length,
        totalCount: commissions.length,
        commissions,
      };
    })
    .filter((dungeon) => dungeon.totalCount > 0)
    .sort(
      (left, right) =>
        Number(right.unlocked) - Number(left.unlocked) || left.name.localeCompare(right.name),
    );
  return {
    dungeons,
    completedCommissionCount: dungeons.reduce((sum, dungeon) => sum + dungeon.completedCount, 0),
    totalCommissionCount: dungeons.reduce((sum, dungeon) => sum + dungeon.totalCount, 0),
  };
}
