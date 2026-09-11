import type { ContentRegistry } from "../../content/registry";
import { evaluateUpgrade } from "../../domain/equipment/upgrade-evaluation";
import { equipmentSellValue } from "../../domain/equipment/item-value";
import type { GameState } from "../../domain/game-state";
import type { ActivityId, EncounterId, MemberId, PendingLootId } from "../../domain/shared/ids";
import { getEquippedItemView, type EquippedItemView } from "./get-members-view";
import { resolveItemInstance } from "../../domain/equipment/resolve-item-instance";

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
  readonly primaryPercent?: number;
  readonly capabilityChanges?: {
    readonly survivability: number;
    readonly threat: number;
    readonly healing: number;
    readonly damage: number;
  };
  readonly replacedItemNames?: readonly string[];
}

export interface PendingLootView {
  readonly id: PendingLootId;
  readonly activityId: ActivityId;
  readonly encounterId?: EncounterId;
  readonly acquiredAt: number;
  readonly item: EquippedItemView;
  readonly activityName: string;
  readonly dungeonName: string;
  readonly encounterName: string;
  readonly activityOrder: number;
  readonly encounterOrder: number;
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

export function getLootView(state: GameState, content: ContentRegistry): LootView {
  const pending = Object.values(state.pendingLoot)
    .flatMap((entry): PendingLootView[] => {
      const instance = state.itemInstances[entry.itemInstanceId];
      if (!instance) return [];
      const definition = resolveItemInstance(instance, content).definition;
      const activity = state.activities[entry.sourceActivityId];
      const source = instance.source.type === "encounter" ? instance.source : undefined;
      const activityOrder = activity?.createdAt ?? entry.acquiredAt;
      const encounterOrder =
        activity && activity.type === "expedition" && source
          ? activity.runPlans.reduce((best, run, runIndex) => {
              const stageIndex = run.stages.findIndex(
                (stage) => stage.encounterId === source.encounterId,
              );
              return stageIndex >= 0 ? Math.min(best, runIndex * 10_000 + stageIndex) : best;
            }, Number.POSITIVE_INFINITY)
          : entry.acquiredAt;
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
            primaryPercent: evaluation.primaryResponsibilityPercent,
            capabilityChanges: { ...evaluation.capabilityChanges },
            replacedItemNames: evaluation.displacedItemInstanceIds.flatMap((instanceId) => {
              const displaced = state.itemInstances[instanceId];
              return displaced
                ? [resolveItemInstance(displaced, content).definition.name.zhCN]
                : [];
            }),
          },
        ];
      });
      return [
        {
          id: entry.id,
          activityId: entry.sourceActivityId,
          ...(source ? { encounterId: source.encounterId } : {}),
          acquiredAt: entry.acquiredAt,
          item: getEquippedItemView(instance, content),
          activityName: source
            ? (content.dungeonById.get(source.dungeonId)?.name.zhCN ?? source.dungeonId)
            : "本次活动",
          dungeonName: source
            ? (content.dungeonById.get(source.dungeonId)?.name.zhCN ?? source.dungeonId)
            : "其他来源",
          encounterName: source
            ? (content.encounterById.get(source.encounterId)?.name.zhCN ?? source.encounterId)
            : "未知来源",
          activityOrder,
          encounterOrder: Number.isFinite(encounterOrder) ? encounterOrder : entry.acquiredAt,
          locked,
          ...(locked ? { lockReason: "该队伍的连续副本尚未结束。" } : {}),
          saleValue: equipmentSellValue(definition),
          candidates: candidates.sort(
            (left, right) =>
              Number(right.equippable) - Number(left.equippable) ||
              (right.primaryPercent ?? Number.NEGATIVE_INFINITY) -
                (left.primaryPercent ?? Number.NEGATIVE_INFINITY) ||
              left.name.localeCompare(right.name),
          ),
        },
      ];
    })
    .sort(
      (left, right) =>
        left.activityOrder - right.activityOrder ||
        left.encounterOrder - right.encounterOrder ||
        left.acquiredAt - right.acquiredAt ||
        left.item.name.localeCompare(right.item.name) ||
        left.id.localeCompare(right.id),
    );
  return {
    pending,
    unlockedCount: pending.filter((entry) => !entry.locked).length,
    lockedCount: pending.filter((entry) => entry.locked).length,
  };
}
