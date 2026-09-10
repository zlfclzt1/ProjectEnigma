import type { ItemDefinitionId, MemberId } from "../../domain/shared/ids";
import type { GameCommand } from "../services/game-session";

export function removeMemberWishlistTargetCommand(
  memberId: MemberId,
  itemDefinitionId: ItemDefinitionId,
): GameCommand<boolean> {
  return {
    type: "remove-member-wishlist-target",
    execute(draft) {
      const member = draft.members[memberId];
      if (!member) throw new Error("成员不存在。");
      const index = member.wishlist.entries.findIndex(
        (entry) => entry.itemDefinitionId === itemDefinitionId,
      );
      if (index < 0) return false;
      member.wishlist.entries.splice(index, 1);
      return true;
    },
  };
}
