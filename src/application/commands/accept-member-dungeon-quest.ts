import type { Clock } from "../ports/clock";
import type { ContentRegistry } from "../../content/registry";
import { acceptMemberQuest } from "../../domain/member/member-quest-state";
import type { MemberQuestProgress } from "../../domain/member/member";
import type { MemberId, QuestId } from "../../domain/shared/ids";
import type { GameCommand } from "../services/game-session";

export function acceptMemberDungeonQuestCommand(
  dependencies: { readonly content: ContentRegistry; readonly clock: Clock },
  memberId: MemberId,
  questId: QuestId,
): GameCommand<MemberQuestProgress> {
  return {
    type: "accept-member-dungeon-quest",
    execute(draft) {
      const member = draft.members[memberId];
      if (!member) throw new Error("成员不存在。");
      const quest = dependencies.content.questById.get(questId);
      if (!quest) throw new Error("副本任务不存在。");
      if (!draft.guild.unlockedDungeonIds.includes(quest.dungeonId)) {
        throw new Error("该任务所属副本尚未解锁。");
      }
      if (member.progression.level < quest.eligibility.minimumLevel) {
        throw new Error(`成员等级不足，需要达到 ${quest.eligibility.minimumLevel} 级。`);
      }
      if (
        quest.eligibility.allowedClassIds.length > 0 &&
        !quest.eligibility.allowedClassIds.includes(member.identity.classId)
      ) {
        throw new Error("该成员的职业不能接取这个任务。");
      }
      return acceptMemberQuest(member.quests, quest.id, dependencies.clock.now());
    },
  };
}
