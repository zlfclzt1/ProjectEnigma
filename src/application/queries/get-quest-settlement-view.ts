import type { ContentRegistry } from "../../content/registry";
import type { GameState } from "../../domain/game-state";
import type { ItemInstance } from "../../domain/equipment/item-instance";
import { evaluateUpgrade } from "../../domain/equipment/upgrade-evaluation";
import type { ItemDefinitionId, ItemInstanceId, MemberId, QuestId } from "../../domain/shared/ids";

export interface QuestRewardChoiceView {
  readonly id: ItemDefinitionId;
  readonly name: string;
  readonly itemLevel: number;
  readonly recommended: boolean;
  readonly recommendationScore: number;
  readonly reasons: readonly string[];
}

export interface QuestSettlementEntryView {
  readonly key: string;
  readonly memberId: MemberId;
  readonly memberName: string;
  readonly specName: string;
  readonly questId: QuestId;
  readonly questName: string;
  readonly dungeonName: string;
  readonly fixedItemNames: readonly string[];
  readonly choices: readonly QuestRewardChoiceView[];
  readonly recommendedItemId?: ItemDefinitionId;
  readonly funds: number;
  readonly experienceFraction: number;
}

export interface QuestSettlementView {
  readonly entries: readonly QuestSettlementEntryView[];
  readonly memberCount: number;
}

export function getQuestSettlementView(
  state: GameState,
  content: ContentRegistry,
  memberIds: readonly MemberId[],
): QuestSettlementView {
  const scopedIds = new Set(memberIds);
  const entries = Object.values(state.members).flatMap((member): QuestSettlementEntryView[] => {
    if (!scopedIds.has(member.id)) return [];
    return Object.values(member.quests.entries).flatMap((progress) => {
      if (!progress || progress.status !== "completed") return [];
      const quest = content.questById.get(progress.questId);
      if (!quest) return [];
      const rankedChoices = quest.rewards.itemChoiceIds
        .map((itemId) => rankRewardChoice(state, content, member, progress.questId, itemId))
        .sort(
          (left, right) =>
            right.recommendationScore - left.recommendationScore ||
            left.name.localeCompare(right.name),
        );
      const recommendedItemId = rankedChoices[0]?.id;
      return [
        {
          key: `${member.id}:${quest.id}`,
          memberId: member.id,
          memberName: member.identity.name,
          specName: content.specById.get(member.progression.specId)?.name.zhCN ?? "未知专精",
          questId: quest.id,
          questName: quest.name.zhCN,
          dungeonName: content.dungeonById.get(quest.dungeonId)?.name.zhCN ?? quest.dungeonId,
          fixedItemNames: quest.rewards.fixedItemIds.map(
            (itemId) => content.itemById.get(itemId)?.name.zhCN ?? itemId,
          ),
          choices: rankedChoices.map((choice) => ({
            ...choice,
            recommended: choice.id === recommendedItemId,
          })),
          ...(recommendedItemId ? { recommendedItemId } : {}),
          funds: quest.rewards.funds,
          experienceFraction: quest.rewards.experienceFraction,
        },
      ];
    });
  });
  return {
    entries: entries.sort(
      (left, right) =>
        left.dungeonName.localeCompare(right.dungeonName) ||
        left.questName.localeCompare(right.questName) ||
        left.memberName.localeCompare(right.memberName),
    ),
    memberCount: new Set(entries.map((entry) => entry.memberId)).size,
  };
}

function rankRewardChoice(
  state: GameState,
  content: ContentRegistry,
  member: GameState["members"][MemberId],
  questId: QuestId,
  itemId: ItemDefinitionId,
): Omit<QuestRewardChoiceView, "recommended"> {
  const item = content.itemById.get(itemId)!;
  const candidate: ItemInstance = {
    id: `quest-recommendation:${member.id}:${questId}:${itemId}` as ItemInstanceId,
    definitionId: itemId,
    ownerMemberId: member.id,
    bound: true,
    acquiredAt: state.updatedAt,
    source: { type: "quest", questId, memberId: member.id },
    enchantmentIds: [],
  };
  const upgrade = evaluateUpgrade(
    member,
    candidate,
    { itemInstances: { ...state.itemInstances, [candidate.id]: candidate } },
    content,
  );
  const wishlist = member.wishlist.entries.some((entry) => entry.itemDefinitionId === itemId);
  const upgradeScore = upgrade.equippable ? upgrade.recommendationScore : -200_000;
  const reasons: string[] = [];
  if (wishlist) reasons.push("愿望单目标");
  if (upgrade.equippable && upgrade.primaryResponsibilityDelta > 0) {
    reasons.push(`当前专精主职责 +${upgrade.primaryResponsibilityDelta.toFixed(2)}`);
  } else if (upgrade.equippable) {
    reasons.push("当前专精可以使用，但不是即时提升");
  } else {
    reasons.push("当前专精无法直接使用");
  }
  return {
    id: item.id,
    name: item.name.zhCN,
    itemLevel: item.itemLevel,
    recommendationScore: (wishlist ? 100_000 : 0) + upgradeScore,
    reasons,
  };
}
