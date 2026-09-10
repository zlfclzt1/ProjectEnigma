import type { Clock } from "../ports/clock";
import type { ContentRegistry } from "../../content/registry";
import { acceptMemberQuest } from "../../domain/member/member-quest-state";
import type { MemberQuestProgress } from "../../domain/member/member";
import type { MemberId, QuestId } from "../../domain/shared/ids";
import type { GameCommand } from "../services/game-session";

export interface MemberDungeonQuestAcceptance {
  readonly memberId: MemberId;
  readonly questId: QuestId;
}

export function acceptMemberDungeonQuestsCommand(
  dependencies: { readonly content: ContentRegistry; readonly clock: Clock },
  acceptances: readonly MemberDungeonQuestAcceptance[],
): GameCommand<readonly MemberQuestProgress[]> {
  return {
    type: "accept-member-dungeon-quests",
    execute(draft) {
      if (acceptances.length === 0) throw new Error("请至少选择一项成员任务。");
      const uniqueKeys = new Set<string>();

      for (const acceptance of acceptances) {
        const key = `${acceptance.memberId}:${acceptance.questId}`;
        if (uniqueKeys.has(key)) throw new Error("批量任务申请中存在重复成员。");
        uniqueKeys.add(key);

        const member = draft.members[acceptance.memberId];
        if (!member) throw new Error("成员不存在。");
        const quest = dependencies.content.questById.get(acceptance.questId);
        if (!quest) throw new Error("副本任务不存在。");
        if (!draft.guild.unlockedDungeonIds.includes(quest.dungeonId)) {
          throw new Error(`“${quest.name.zhCN}”所属副本尚未解锁。`);
        }
        if (member.progression.level < quest.eligibility.minimumLevel) {
          throw new Error(
            `${member.identity.name}等级不足，需要达到 ${quest.eligibility.minimumLevel} 级。`,
          );
        }
        if (
          quest.eligibility.allowedClassIds.length > 0 &&
          !quest.eligibility.allowedClassIds.includes(member.identity.classId)
        ) {
          throw new Error(`${member.identity.name}的职业不能接取“${quest.name.zhCN}”。`);
        }
        if (member.quests.entries[quest.id]) {
          throw new Error(`${member.identity.name}已经接取或完成过“${quest.name.zhCN}”。`);
        }
      }

      const acceptedAt = dependencies.clock.now();
      return acceptances.map(({ memberId, questId }) =>
        acceptMemberQuest(draft.members[memberId]!.quests, questId, acceptedAt),
      );
    },
  };
}
