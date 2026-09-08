import type { ContentRegistry } from "../../content/registry";
import { evaluateUpgrade } from "../../domain/equipment/upgrade-evaluation";
import { equipmentSellValue } from "../../domain/equipment/item-value";
import type { GameStateV2 } from "../../domain/game-state";
import type { MemberId, PendingLootId } from "../../domain/shared/ids";
import { getEquippedItemView, type EquippedItemView } from "./get-members-view";

export interface LootCandidateView {
  readonly memberId: MemberId;
  readonly name: string;
  readonly className: string;
  readonly specName: string;
  readonly roleName: string;
  readonly equippable: boolean;
  readonly reasons: readonly string[];
  readonly replacementSlot?: string;
  readonly recommendationScore?: number;
  readonly primaryBefore?: number;
  readonly primaryAfter?: number;
  readonly primaryDelta?: number;
  readonly capabilityChanges?: {
    readonly survivability: number;
    readonly threat: number;
    readonly healing: number;
    readonly damage: number;
  };
}

export interface PendingLootView {
  readonly id: PendingLootId;
  readonly item: EquippedItemView;
  readonly dungeonName: string;
  readonly encounterName: string;
  readonly locked: boolean;
  readonly lockReason?: string;
  readonly saleValue: number;
  readonly candidates: readonly LootCandidateView[];
}

export interface LootView {
  readonly pending: readonly PendingLootView[];
  readonly unlockedCount: number;
  readonly lockedCount: number;
}

export function getLootView(state: GameStateV2, content: ContentRegistry): LootView {
  const pending = Object.values(state.pendingLoot)
    .sort((left, right) => left.acquiredAt - right.acquiredAt || left.id.localeCompare(right.id))
    .flatMap((entry): PendingLootView[] => {
      const instance = state.itemInstances[entry.itemInstanceId];
      const definition = instance ? content.itemById.get(instance.definitionId) : undefined;
      if (!instance || !definition) return [];
      const activity = state.activities[entry.sourceActivityId];
      const source = instance.source.type === "encounter" ? instance.source : undefined;
      const locked = activity?.status === "active" || activity?.status === "scheduled";
      const candidates = entry.eligibleMemberIds.flatMap((memberId): LootCandidateView[] => {
        const member = state.members[memberId];
        if (!member) return [];
        const spec = content.specById.get(member.progression.specId);
        const evaluation = evaluateUpgrade(member, instance, state, content);
        const base = {
          memberId,
          name: member.identity.name,
          className: content.classById.get(member.identity.classId)?.name.zhCN ?? "未知职业",
          specName: spec?.name.zhCN ?? "未知专精",
          roleName: spec ? (content.roleById.get(spec.role)?.name.zhCN ?? spec.role) : "未知定位",
          equippable: evaluation.equippable,
          reasons: evaluation.reasons,
        };
        if (!evaluation.equippable) return [base];
        return [
          {
            ...base,
            replacementSlot: evaluation.replacementSlot,
            recommendationScore: evaluation.recommendationScore,
            primaryBefore: evaluation.primaryResponsibilityBefore,
            primaryAfter: evaluation.primaryResponsibilityAfter,
            primaryDelta: evaluation.primaryResponsibilityDelta,
            capabilityChanges: { ...evaluation.capabilityChanges },
          },
        ];
      });
      return [
        {
          id: entry.id,
          item: getEquippedItemView(instance, definition, content),
          dungeonName: source
            ? (content.dungeonById.get(source.dungeonId)?.name.zhCN ?? source.dungeonId)
            : "其他来源",
          encounterName: source
            ? (content.encounterById.get(source.encounterId)?.name.zhCN ?? source.encounterId)
            : "未知来源",
          locked,
          ...(locked ? { lockReason: "该队伍的连续副本尚未结束。" } : {}),
          saleValue: equipmentSellValue(definition),
          candidates: candidates.sort(
            (left, right) =>
              Number(right.equippable) - Number(left.equippable) ||
              (right.recommendationScore ?? Number.NEGATIVE_INFINITY) -
                (left.recommendationScore ?? Number.NEGATIVE_INFINITY) ||
              left.name.localeCompare(right.name),
          ),
        },
      ];
    });
  return {
    pending,
    unlockedCount: pending.filter((entry) => !entry.locked).length,
    lockedCount: pending.filter((entry) => entry.locked).length,
  };
}
