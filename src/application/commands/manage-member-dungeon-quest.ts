import type { Clock } from "../ports/clock";
import type { GameCommand } from "../services/game-session";
import {
  abandonMemberQuest,
  setMemberQuestTrackingPaused,
} from "../../domain/member/member-quest-state";
import type { MemberQuestProgress } from "../../domain/member/member";
import type { MemberId, QuestId } from "../../domain/shared/ids";

export function setMemberDungeonQuestTrackingCommand(
  clock: Clock,
  memberId: MemberId,
  questId: QuestId,
  paused: boolean,
): GameCommand<MemberQuestProgress> {
  return {
    type: paused ? "pause-member-dungeon-quest" : "resume-member-dungeon-quest",
    execute(draft) {
      const member = draft.members[memberId];
      if (!member) throw new Error("成员不存在。");
      return setMemberQuestTrackingPaused(member.quests, questId, paused, clock.now());
    },
  };
}

export function abandonMemberDungeonQuestCommand(
  memberId: MemberId,
  questId: QuestId,
): GameCommand<MemberQuestProgress> {
  return {
    type: "abandon-member-dungeon-quest",
    execute(draft) {
      const member = draft.members[memberId];
      if (!member) throw new Error("成员不存在。");
      return abandonMemberQuest(member.quests, questId);
    },
  };
}
