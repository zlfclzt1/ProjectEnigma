import type { ContentRegistry } from "../../content/registry";
import type { DungeonQuestDefinition } from "../../content/schemas/quest";
import type { GameState } from "../../domain/game-state";
import type { DungeonRouteNodeId, MemberId, QuestId } from "../../domain/shared/ids";

export interface MemberDungeonQuestView {
  readonly id: QuestId;
  readonly name: string;
  readonly description: string;
  readonly dungeonId: DungeonQuestDefinition["dungeonId"];
  readonly dungeonName: string;
  readonly dungeonUnlocked: boolean;
  readonly minimumLevel: number;
  readonly allowedClassNames: readonly string[];
  readonly status: "available" | "accepted" | "completed" | "claimed" | "locked";
  readonly statusLabel: string;
  readonly canAccept: boolean;
  readonly blockedReasons: readonly string[];
  readonly objective: {
    readonly type: DungeonQuestDefinition["completion"]["type"];
    readonly label: string;
    readonly encounterNames: readonly string[];
    readonly requiredOptionalNodeIds: readonly DungeonRouteNodeId[];
  };
  readonly rewards: {
    readonly experienceFraction: number;
    readonly funds: number;
    readonly fixedItems: readonly {
      readonly id: string;
      readonly name: string;
      readonly itemLevel: number;
      readonly quality: string;
    }[];
    readonly itemChoices: readonly {
      readonly id: string;
      readonly name: string;
      readonly itemLevel: number;
      readonly quality: string;
    }[];
  };
}

export interface MemberDungeonQuestsView {
  readonly memberId: MemberId;
  readonly memberName: string;
  readonly quests: readonly MemberDungeonQuestView[];
}

export function getMemberDungeonQuestsView(
  state: GameState,
  content: ContentRegistry,
  memberId: MemberId,
): MemberDungeonQuestsView | null {
  const member = state.members[memberId];
  if (!member) return null;
  return {
    memberId: member.id,
    memberName: member.identity.name,
    quests: content.quests.map((quest) => projectQuest(state, content, member, quest)),
  };
}

function projectQuest(
  state: GameState,
  content: ContentRegistry,
  member: GameState["members"][MemberId],
  quest: DungeonQuestDefinition,
): MemberDungeonQuestView {
  const dungeon = content.dungeonById.get(quest.dungeonId)!;
  const dungeonUnlocked = state.guild.unlockedDungeonIds.includes(quest.dungeonId);
  const levelReady = member.progression.level >= quest.eligibility.minimumLevel;
  const classReady =
    quest.eligibility.allowedClassIds.length === 0 ||
    quest.eligibility.allowedClassIds.includes(member.identity.classId);
  const progress = member.quests.entries[quest.id];
  const blockedReasons: string[] = [];
  if (!dungeonUnlocked) blockedReasons.push(`${dungeon.name.zhCN}尚未解锁`);
  if (!levelReady) blockedReasons.push(`需要 ${quest.eligibility.minimumLevel} 级`);
  if (!classReady) blockedReasons.push("职业不符合任务要求");
  if (progress) blockedReasons.push("该成员已经接取或完成过此任务");
  const status = progress?.status ?? (blockedReasons.length > 0 ? "locked" : "available");
  const encounterIds =
    quest.completion.type === "encounter-victories" ? quest.completion.encounterIds : [];
  const encounterNames = encounterIds.map(
    (encounterId) => content.encounterById.get(encounterId)?.name.zhCN ?? encounterId,
  );
  const requiredOptionalNodeIds = content.dungeons.flatMap((candidateDungeon) =>
    candidateDungeon.route.flatMap((node) =>
      node.type === "optional" && encounterIds.includes(node.encounterId) ? [node.id] : [],
    ),
  );
  return {
    id: quest.id,
    name: quest.name.zhCN,
    description: quest.description.zhCN,
    dungeonId: quest.dungeonId,
    dungeonName: dungeon.name.zhCN,
    dungeonUnlocked,
    minimumLevel: quest.eligibility.minimumLevel,
    allowedClassNames: quest.eligibility.allowedClassIds.map(
      (classId) => content.classById.get(classId)?.name.zhCN ?? classId,
    ),
    status,
    statusLabel: {
      available: "可接取",
      accepted: "进行中",
      completed: "可领取",
      claimed: "已领取",
      locked: "未满足",
    }[status],
    canAccept: status === "available",
    blockedReasons,
    objective: {
      type: quest.completion.type,
      label:
        quest.completion.type === "dungeon-clear"
          ? `完整通关${dungeon.name.zhCN}`
          : `击败${encounterNames.join("、")}`,
      encounterNames,
      requiredOptionalNodeIds,
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
