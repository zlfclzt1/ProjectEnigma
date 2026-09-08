import type { GameCommand } from "../services/game-session";
import type { MemberId } from "../../domain/shared/ids";

export function dismissMemberCommand(memberId: MemberId): GameCommand<boolean> {
  return {
    type: "dismiss-member",
    execute(draft) {
      const member = draft.members[memberId];
      if (!member) return false;
      if (member.activeActivityId) throw new Error("活动中的成员不能被移出公会。");

      delete draft.members[memberId];
      for (const instance of Object.values(draft.itemInstances)) {
        if (instance.ownerMemberId === memberId) delete draft.itemInstances[instance.id];
      }
      for (const pending of Object.values(draft.pendingLoot)) {
        pending.eligibleMemberIds = pending.eligibleMemberIds.filter((id) => id !== memberId);
      }
      return true;
    },
  };
}
