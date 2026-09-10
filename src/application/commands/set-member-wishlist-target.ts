import type { ContentRegistry } from "../../content/registry";
import { upsertWishlistTarget } from "../../domain/equipment/wishlist-rules";
import type { MemberWishlistEntry } from "../../domain/member/member";
import type { ItemDefinitionId, MemberId, RandomSuffixId } from "../../domain/shared/ids";
import type { GameCommand } from "../services/game-session";

export interface SetMemberWishlistTargetInput {
  readonly itemDefinitionId: ItemDefinitionId;
  readonly preferredRandomSuffixId?: RandomSuffixId;
  readonly acceptableRandomSuffixIds: readonly RandomSuffixId[];
}

export function setMemberWishlistTargetCommand(
  content: ContentRegistry,
  memberId: MemberId,
  input: SetMemberWishlistTargetInput,
): GameCommand<MemberWishlistEntry> {
  return {
    type: "set-member-wishlist-target",
    execute(draft) {
      const member = draft.members[memberId];
      if (!member) throw new Error("成员不存在。");
      const available = draft.guild.unlockedDungeonIds.some((dungeonId) => {
        const dungeon = content.dungeonById.get(dungeonId);
        return dungeon?.route.some(({ encounterId }) =>
          content
            .getLootTableForEncounter(encounterId)
            ?.items.some((entry) => entry.itemId === input.itemDefinitionId),
        );
      });
      if (!available) throw new Error("只能从已解锁副本的 Boss 掉落中选择愿望装备。");
      return upsertWishlistTarget(member, input, content);
    },
  };
}
