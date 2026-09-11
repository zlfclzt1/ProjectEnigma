import type { ContentRegistry } from "../../content/registry";
import type { GameState } from "../game-state";
import type { Member } from "../member/member";
import type { ItemInstanceId, MemberId } from "../shared/ids";
import type { EquipmentSlot } from "./equipment-slot";
import type { PendingLoot } from "./item-instance";
import { evaluateUpgrade } from "./upgrade-evaluation";

export interface LootAssignmentCandidate {
  readonly memberId: MemberId;
  readonly primaryResponsibilityDelta: number;
  readonly primaryResponsibilityPercent: number;
  readonly replacementSlot: EquipmentSlot;
  readonly displacedItemInstanceIds: readonly ItemInstanceId[];
  readonly reasons: readonly string[];
}

export type LootAssignmentDecision =
  | { readonly type: "assign"; readonly candidate: LootAssignmentCandidate }
  | { readonly type: "sell"; readonly reason: string };

export function compareLootAssignmentCandidates(
  left: LootAssignmentCandidate,
  right: LootAssignmentCandidate,
): number {
  return (
    right.primaryResponsibilityPercent - left.primaryResponsibilityPercent ||
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
      if (!upgrade.equippable || upgrade.primaryResponsibilityPercent <= 1e-9) {
        return [];
      }
      return [
        {
          memberId: member.id,
          primaryResponsibilityDelta: upgrade.primaryResponsibilityDelta,
          primaryResponsibilityPercent: upgrade.primaryResponsibilityPercent,
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
