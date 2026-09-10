import type { ContentRegistry } from "../../content/registry";
import type { DungeonQuestDefinition } from "../../content/schemas/quest";
import type { GameState } from "../../domain/game-state";
import type { DungeonId, DungeonRouteNodeId, MemberId, QuestId } from "../../domain/shared/ids";
import { getDungeonQuestHallView } from "./get-dungeon-quest-hall-view";
import type { QuestPublisherView } from "./quest-narrative";

export interface ExpeditionQuestBriefEntryView {
  readonly questId: QuestId;
  readonly questName: string;
  readonly description: string;
  readonly objectiveLabel: string;
  readonly applicantMemberIds: readonly MemberId[];
  readonly applicantNames: readonly string[];
  readonly acceptedMemberIds: readonly MemberId[];
  readonly acceptedNames: readonly string[];
  readonly requiredOptionalNodeIds: readonly DungeonRouteNodeId[];
  readonly requiredOptionalBossNames: readonly string[];
  readonly publisher: QuestPublisherView;
  readonly representativeApplicationLine?: string;
}

export interface ExpeditionQuestBriefView {
  readonly dungeonId: DungeonId;
  readonly dungeonName: string;
  readonly entries: readonly ExpeditionQuestBriefEntryView[];
  readonly applicationCount: number;
  readonly acceptedCount: number;
  readonly requiredOptionalNodeIds: readonly DungeonRouteNodeId[];
}

export function getExpeditionQuestBriefView(
  state: GameState,
  content: ContentRegistry,
  dungeonId: DungeonId,
  participantIds: readonly MemberId[],
): ExpeditionQuestBriefView | null {
  const dungeon = content.dungeonById.get(dungeonId);
  if (!dungeon) return null;
  const hall = getDungeonQuestHallView(state, content, participantIds);
  const entries = hall.quests.flatMap((quest): ExpeditionQuestBriefEntryView[] => {
    const definition = content.questById.get(quest.id)!;
    if (!questProgressesInDungeon(definition, dungeonId, content)) return [];
    const applicants = quest.members.filter((member) => member.status === "available");
    const accepted = quest.members.filter(
      (member) => member.status === "accepted" && !member.trackingPaused,
    );
    if (applicants.length === 0 && accepted.length === 0) return [];
    const encounterIds =
      definition.completion.type === "encounter-victories"
        ? definition.completion.encounterIds
        : [];
    const requiredNodes = dungeon.route.filter(
      (node) => node.type === "optional" && encounterIds.includes(node.encounterId),
    );
    return [
      {
        questId: quest.id,
        questName: quest.name,
        description: quest.description,
        objectiveLabel: quest.objective.label,
        applicantMemberIds: applicants.map((member) => member.id),
        applicantNames: applicants.map((member) => member.name),
        acceptedMemberIds: accepted.map((member) => member.id),
        acceptedNames: accepted.map((member) => member.name),
        requiredOptionalNodeIds: requiredNodes.map((node) => node.id),
        requiredOptionalBossNames: requiredNodes.map(
          (node) => content.encounterById.get(node.encounterId)?.name.zhCN ?? node.encounterId,
        ),
        publisher: quest.publisher,
        ...(applicants[0]?.applicationLine
          ? { representativeApplicationLine: applicants[0].applicationLine }
          : {}),
      },
    ];
  });
  return {
    dungeonId,
    dungeonName: dungeon.name.zhCN,
    entries,
    applicationCount: entries.reduce((sum, entry) => sum + entry.applicantMemberIds.length, 0),
    acceptedCount: entries.reduce((sum, entry) => sum + entry.acceptedMemberIds.length, 0),
    requiredOptionalNodeIds: [
      ...new Set(entries.flatMap((entry) => entry.requiredOptionalNodeIds)),
    ],
  };
}

function questProgressesInDungeon(
  quest: DungeonQuestDefinition,
  dungeonId: DungeonId,
  content: ContentRegistry,
): boolean {
  if (quest.completion.type === "dungeon-clear") return quest.dungeonId === dungeonId;
  return quest.completion.encounterIds.some(
    (encounterId) => content.encounterById.get(encounterId)?.dungeonId === dungeonId,
  );
}
