import type { Clock } from "../ports/clock";
import type { ContentRegistry } from "../../content/registry";
import type { ItemDefinitionId, MemberId, QuestId } from "../../domain/shared/ids";
import type { GameCommand } from "../services/game-session";
import {
  claimMemberDungeonQuestCommand,
  type ClaimMemberDungeonQuestResult,
} from "./claim-member-dungeon-quest";

export interface MemberDungeonQuestClaim {
  readonly memberId: MemberId;
  readonly questId: QuestId;
  readonly itemDefinitionId?: ItemDefinitionId;
}

export function claimMemberDungeonQuestsCommand(
  dependencies: { readonly content: ContentRegistry; readonly clock: Clock },
  claims: readonly MemberDungeonQuestClaim[],
): GameCommand<readonly ClaimMemberDungeonQuestResult[]> {
  return {
    type: "claim-member-dungeon-quests",
    async execute(draft) {
      if (claims.length === 0) throw new Error("没有可结算的成员任务。");
      const uniqueKeys = new Set<string>();
      for (const claim of claims) {
        const key = `${claim.memberId}:${claim.questId}`;
        if (uniqueKeys.has(key)) throw new Error("任务结算单中存在重复成员。");
        uniqueKeys.add(key);
        const member = draft.members[claim.memberId];
        const quest = dependencies.content.questById.get(claim.questId);
        if (!member) throw new Error("成员不存在。");
        if (!quest) throw new Error("副本任务不存在。");
        if (member.quests.entries[claim.questId]?.status !== "completed") {
          throw new Error(`${member.identity.name}的“${quest.name.zhCN}”尚不可结算。`);
        }
        if (quest.rewards.itemChoiceIds.length > 0 && !claim.itemDefinitionId) {
          throw new Error(`${member.identity.name}尚未选择“${quest.name.zhCN}”的奖励。`);
        }
        if (
          claim.itemDefinitionId &&
          !quest.rewards.itemChoiceIds.includes(claim.itemDefinitionId)
        ) {
          throw new Error(`${member.identity.name}选择了不属于“${quest.name.zhCN}”的奖励。`);
        }
        if (quest.rewards.itemChoiceIds.length === 0 && claim.itemDefinitionId) {
          throw new Error(`“${quest.name.zhCN}”没有需要选择的装备奖励。`);
        }
      }
      const results: ClaimMemberDungeonQuestResult[] = [];
      for (const claim of claims) {
        results.push(
          await claimMemberDungeonQuestCommand(
            dependencies,
            claim.memberId,
            claim.questId,
            claim.itemDefinitionId,
          ).execute(draft),
        );
      }
      return results;
    },
  };
}
