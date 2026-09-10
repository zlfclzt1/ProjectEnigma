import type { ContentRegistry } from "../../content/registry";
import type { GameState } from "../game-state";
import type { Member } from "../member/member";
import type { ItemDefinitionId, ItemInstanceId, MemberId, RandomSuffixId } from "../shared/ids";
import type { EquipmentSlot } from "./equipment-slot";
import type { PendingLoot } from "./item-instance";
import { resolveItemInstance } from "./resolve-item-instance";
import { evaluateUpgrade } from "./upgrade-evaluation";

export type WishlistMatch = "preferred" | "acceptable" | "none";

export interface LootAssignmentCandidate {
  readonly memberId: MemberId;
  readonly wishlistMatch: WishlistMatch;
  readonly primaryResponsibilityDelta: number;
  readonly currentSlotItemLevel: number;
  readonly joinedAt: number;
  readonly replacementSlot: EquipmentSlot;
  readonly displacedItemInstanceIds: readonly ItemInstanceId[];
  readonly reasons: readonly string[];
}

export type LootAssignmentDecision =
  | { readonly type: "assign"; readonly candidate: LootAssignmentCandidate }
  | { readonly type: "sell"; readonly reason: string };

const WISHLIST_PRIORITY: Readonly<Record<WishlistMatch, number>> = {
  preferred: 2,
  acceptable: 1,
  none: 0,
};

export function compareLootAssignmentCandidates(
  left: LootAssignmentCandidate,
  right: LootAssignmentCandidate,
): number {
  return (
    WISHLIST_PRIORITY[right.wishlistMatch] - WISHLIST_PRIORITY[left.wishlistMatch] ||
    right.primaryResponsibilityDelta - left.primaryResponsibilityDelta ||
    left.currentSlotItemLevel - right.currentSlotItemLevel ||
    left.joinedAt - right.joinedAt ||
    left.memberId.localeCompare(right.memberId)
  );
}

export function rankLootAssignment(
  state: GameState,
  content: ContentRegistry,
  pending: PendingLoot,
): LootAssignmentDecision {
  const instance = state.itemInstances[pending.itemInstanceId];
  if (!instance) throw new Error("战利品装备实例不存在。");
  const candidates = pending.eligibleMemberIds
    .map((memberId) => state.members[memberId])
    .filter((member): member is Member => member !== undefined)
    .flatMap((member): LootAssignmentCandidate[] => {
      const upgrade = evaluateUpgrade(member, instance, state, content);
      if (
        !upgrade.equippable ||
        upgrade.primaryResponsibilityDelta <= 1e-9 ||
        upgrade.recommendationScore <= 1e-9
      ) {
        return [];
      }
      return [
        {
          memberId: member.id,
          wishlistMatch: wishlistMatch(member, instance.definitionId, instance.randomSuffixId),
          primaryResponsibilityDelta: upgrade.primaryResponsibilityDelta,
          currentSlotItemLevel: displacedItemLevel(
            upgrade.displacedItemInstanceIds,
            state,
            content,
          ),
          joinedAt: member.joinedAt,
          replacementSlot: upgrade.replacementSlot,
          displacedItemInstanceIds: upgrade.displacedItemInstanceIds,
          reasons: upgrade.reasons,
        },
      ];
    })
    .sort(compareLootAssignmentCandidates);
  const candidate = candidates[0];
  return candidate
    ? { type: "assign", candidate }
    : { type: "sell", reason: "没有参战成员能从这件装备获得主职责提升。" };
}

function wishlistMatch(
  member: Member,
  itemDefinitionId: ItemDefinitionId,
  randomSuffixId: RandomSuffixId | undefined,
): WishlistMatch {
  const target = member.wishlist.entries.find(
    (entry) => entry.itemDefinitionId === itemDefinitionId,
  );
  if (!target) return "none";
  if (!target.preferredRandomSuffixId || target.preferredRandomSuffixId === randomSuffixId) {
    return "preferred";
  }
  return randomSuffixId && target.acceptableRandomSuffixIds.includes(randomSuffixId)
    ? "acceptable"
    : "none";
}

function displacedItemLevel(
  instanceIds: readonly ItemInstanceId[],
  state: GameState,
  content: ContentRegistry,
): number {
  if (instanceIds.length === 0) return 0;
  const levels = instanceIds.map((instanceId) => {
    const instance = state.itemInstances[instanceId];
    return instance ? resolveItemInstance(instance, content).definition.itemLevel : 0;
  });
  return levels.reduce((sum, level) => sum + level, 0) / levels.length;
}
