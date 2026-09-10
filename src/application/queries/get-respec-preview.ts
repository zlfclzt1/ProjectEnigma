import type { ContentRegistry } from "../../content/registry";
import { evaluateWishlistTarget } from "../../domain/equipment/wishlist-rules";
import type { GameState } from "../../domain/game-state";
import type { ItemDefinitionId, MemberId, SpecId } from "../../domain/shared/ids";

export interface RespecWishlistRemovalView {
  readonly itemDefinitionId: ItemDefinitionId;
  readonly itemName: string;
}

export interface RespecPreviewView {
  readonly memberId: MemberId;
  readonly currentSpecId: SpecId;
  readonly targetSpecId: SpecId;
  readonly targetSpecName: string;
  readonly invalidWishlistItems: readonly RespecWishlistRemovalView[];
}

export function getRespecPreview(
  state: GameState,
  content: ContentRegistry,
  memberId: MemberId,
  targetSpecId: SpecId,
): RespecPreviewView | null {
  const member = state.members[memberId];
  if (!member) return null;
  const targetSpec = content.specById.get(targetSpecId);
  if (!targetSpec || targetSpec.classId !== member.identity.classId) return null;
  const prospective = structuredClone(member);
  prospective.progression.specId = targetSpec.id;
  const invalidWishlistItems = member.wishlist.entries
    .filter((entry) => !evaluateWishlistTarget(prospective, entry, content).allowed)
    .map((entry) => ({
      itemDefinitionId: entry.itemDefinitionId,
      itemName: content.itemById.get(entry.itemDefinitionId)?.name.zhCN ?? entry.itemDefinitionId,
    }));
  return {
    memberId,
    currentSpecId: member.progression.specId,
    targetSpecId: targetSpec.id,
    targetSpecName: targetSpec.name.zhCN,
    invalidWishlistItems,
  };
}
