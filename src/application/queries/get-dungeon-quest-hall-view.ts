import type { ContentRegistry } from "../../content/registry";
import type { DungeonQuestDefinition } from "../../content/schemas/quest";
import type { GameState } from "../../domain/game-state";
import type { MemberId, QuestId } from "../../domain/shared/ids";
import {
  getMemberDungeonQuestsView,
  type MemberDungeonQuestView,
} from "./get-member-dungeon-quests-view";
import {
  memberQuestApplicationLine,
  questPublisherView,
  type QuestPublisherView,
} from "./quest-narrative";

export interface DungeonQuestHallMemberView {
  readonly id: MemberId;
  readonly name: string;
  readonly level: number;
  readonly status: MemberDungeonQuestView["status"];
  readonly statusLabel: string;
  readonly canAccept: boolean;
  readonly trackingPaused: boolean;
  readonly personalityName: string;
  readonly applicationLine: string;
  readonly blockedReasons: readonly string[];
}

export interface DungeonQuestHallQuestView extends Omit<
  MemberDungeonQuestView,
  "status" | "statusLabel" | "canAccept" | "trackingPaused" | "blockedReasons"
> {
  readonly members: readonly DungeonQuestHallMemberView[];
  readonly publisher: QuestPublisherView;
  readonly counts: {
    readonly available: number;
    readonly accepted: number;
    readonly completed: number;
    readonly claimed: number;
    readonly locked: number;
    readonly paused: number;
  };
}

export interface DungeonQuestHallView {
  readonly memberCount: number;
  readonly quests: readonly DungeonQuestHallQuestView[];
  readonly totals: {
    readonly pendingApproval: number;
    readonly inProgress: number;
    readonly pendingClaim: number;
  };
}

export function getDungeonQuestHallView(
  state: GameState,
  content: ContentRegistry,
  memberIds: readonly MemberId[],
): DungeonQuestHallView {
  const scopedMembers = [...new Set(memberIds)]
    .map((memberId) => state.members[memberId])
    .filter((member): member is NonNullable<typeof member> => Boolean(member));
  const views = scopedMembers.map((member) =>
    getMemberDungeonQuestsView(state, content, member.id)!,
  );
  const representative = scopedMembers[0] ?? Object.values(state.members)[0];
  const representativeView = representative
    ? getMemberDungeonQuestsView(state, content, representative.id)
    : null;

  const quests = content.quests.map((definition): DungeonQuestHallQuestView => {
    const projected = representativeView?.quests.find((quest) => quest.id === definition.id);
    const quest = projected
      ? withoutMemberStatus(projected)
      : projectCatalogQuest(state, content, definition);
    const members = scopedMembers.map((member): DungeonQuestHallMemberView => {
      const memberQuest = views
        .find((view) => view.memberId === member.id)!
        .quests.find((entry) => entry.id === definition.id)!;
      return {
        id: member.id,
        name: member.identity.name,
        level: member.progression.level,
        status: memberQuest.status,
        statusLabel: memberQuest.statusLabel,
        canAccept: memberQuest.canAccept,
        trackingPaused: memberQuest.trackingPaused,
        personalityName:
          content.personalityById.get(member.identity.personalityId)?.name.zhCN ?? "未知性格",
        applicationLine: memberQuestApplicationLine(member, content, definition.name.zhCN),
        blockedReasons: memberQuest.blockedReasons,
      };
    });
    return {
      ...quest,
      publisher: questPublisherView(content, definition),
      members,
      counts: countStatuses(members),
    };
  });

  return {
    memberCount: scopedMembers.length,
    quests,
    totals: {
      pendingApproval: quests.reduce((sum, quest) => sum + quest.counts.available, 0),
      inProgress: quests.reduce((sum, quest) => sum + quest.counts.accepted, 0),
      pendingClaim: quests.reduce((sum, quest) => sum + quest.counts.completed, 0),
    },
  };
}

function withoutMemberStatus(projected: MemberDungeonQuestView) {
  const {
    status: _status,
    statusLabel: _statusLabel,
    canAccept: _canAccept,
    trackingPaused: _trackingPaused,
    blockedReasons: _blockedReasons,
    ...quest
  } = projected;
  void _status;
  void _statusLabel;
  void _canAccept;
  void _trackingPaused;
  void _blockedReasons;
  return quest;
}

function projectCatalogQuest(
  state: GameState,
  content: ContentRegistry,
  quest: DungeonQuestDefinition,
): Omit<
  MemberDungeonQuestView,
  "status" | "statusLabel" | "canAccept" | "trackingPaused" | "blockedReasons"
> {
  const dungeon = content.dungeonById.get(quest.dungeonId)!;
  const encounterIds =
    quest.completion.type === "encounter-victories" ? quest.completion.encounterIds : [];
  const encounterNames = encounterIds.map(
    (encounterId) => content.encounterById.get(encounterId)?.name.zhCN ?? encounterId,
  );
  return {
    id: quest.id,
    name: quest.name.zhCN,
    description: quest.description.zhCN,
    dungeonId: quest.dungeonId,
    dungeonName: dungeon.name.zhCN,
    dungeonUnlocked: state.guild.unlockedDungeonIds.includes(quest.dungeonId),
    minimumLevel: quest.eligibility.minimumLevel,
    allowedClassNames: quest.eligibility.allowedClassIds.map(
      (classId) => content.classById.get(classId)?.name.zhCN ?? classId,
    ),
    objective: {
      type: quest.completion.type,
      label:
        quest.completion.type === "dungeon-clear"
          ? `完整通关${dungeon.name.zhCN}`
          : `击败${encounterNames.join("、")}`,
      encounterNames,
      requiredOptionalNodeIds: content.dungeons.flatMap((candidateDungeon) =>
        candidateDungeon.route.flatMap((node) =>
          node.type === "optional" && encounterIds.includes(node.encounterId) ? [node.id] : [],
        ),
      ),
    },
    rewards: {
      experienceFraction: quest.rewards.experienceFraction,
      funds: quest.rewards.funds,
      fixedItems: quest.rewards.fixedItemIds.map((itemId) => {
        const item = content.itemById.get(itemId)!;
        return {
          id: item.id,
          name: item.name.zhCN,
          itemLevel: item.itemLevel,
          quality: item.quality,
        };
      }),
      itemChoices: quest.rewards.itemChoiceIds.map((itemId) => {
        const item = content.itemById.get(itemId)!;
        return {
          id: item.id,
          name: item.name.zhCN,
          itemLevel: item.itemLevel,
          quality: item.quality,
        };
      }),
    },
  };
}

function countStatuses(members: readonly DungeonQuestHallMemberView[]) {
  const counts = { available: 0, accepted: 0, completed: 0, claimed: 0, locked: 0, paused: 0 };
  for (const member of members) {
    counts[member.status] += 1;
    if (member.trackingPaused) counts.paused += 1;
  }
  return counts;
}

export function questIdsWithAvailableMembers(view: DungeonQuestHallView): readonly QuestId[] {
  return view.quests.filter((quest) => quest.counts.available > 0).map((quest) => quest.id);
}
