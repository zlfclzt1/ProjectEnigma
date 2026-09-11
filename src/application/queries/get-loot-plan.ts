import type { ContentRegistry } from "../../content/registry";
import { rankLootAssignment } from "../../domain/equipment/loot-assignment-ranking";
import type { GameState } from "../../domain/game-state";
import type { ActivityId, MemberId, PendingLootId } from "../../domain/shared/ids";
import { assignLoot } from "../commands/assign-loot";
import { sellLoot } from "../commands/sell-loot";
import { getLootView, type LootCandidateView, type PendingLootView } from "./get-loot-view";

export type LootPlanOverride =
  | {
      readonly pendingLootId: PendingLootId;
      readonly action: "assign";
      readonly memberId: MemberId;
    }
  | { readonly pendingLootId: PendingLootId; readonly action: "sell" };

export interface LootPlanEntryView {
  readonly pendingLootId: PendingLootId;
  readonly activityId: PendingLootView["activityId"];
  readonly encounterId?: PendingLootView["encounterId"];
  readonly acquiredAt: number;
  readonly item: PendingLootView["item"];
  readonly activityName: string;
  readonly dungeonName: string;
  readonly encounterName: string;
  readonly activityOrder: number;
  readonly encounterOrder: number;
  readonly saleValue: number;
  readonly recommendedAction: "assign" | "sell";
  readonly recommendedMemberId?: MemberId;
  readonly action: "assign" | "sell";
  readonly memberId?: MemberId;
  readonly manuallyChanged: boolean;
  readonly candidates: readonly LootCandidateView[];
  readonly selectedCandidate?: LootCandidateView;
  readonly replacedItemNames: readonly string[];
  readonly replacementSaleProceeds: number;
  readonly proceeds: number;
  readonly reasons: readonly string[];
}

export interface LootPlanView {
  readonly entries: readonly LootPlanEntryView[];
  readonly locked: readonly PendingLootView[];
  readonly assignedCount: number;
  readonly soldCount: number;
  readonly replacedCount: number;
  readonly projectedSaleProceeds: number;
  readonly immediateNoUpgradeCount: number;
  readonly immediateNoUpgradeSaleValue: number;
}

export function getLootPlanView(
  state: GameState,
  content: ContentRegistry,
  overrides: readonly LootPlanOverride[] = [],
  activityId?: ActivityId,
): LootPlanView {
  const initial = getLootView(state, content);
  const scopedPending = activityId
    ? initial.pending.filter((entry) => entry.activityId === activityId)
    : initial.pending;
  const immediateNoUpgrade = scopedPending.filter(
    (entry) =>
      !entry.locked &&
      !entry.candidates.some(
        (candidate) => candidate.equippable && (candidate.primaryPercent ?? 0) > 1e-9,
      ),
  );
  const overrideById = new Map(overrides.map((entry) => [entry.pendingLootId, entry]));
  const simulated = structuredClone(state);
  const entries: LootPlanEntryView[] = [];
  let replacedCount = 0;
  let projectedSaleProceeds = 0;

  const pendingIds = Object.values(state.pendingLoot)
    .filter((entry) => !activityId || entry.sourceActivityId === activityId)
    .sort((left, right) => left.acquiredAt - right.acquiredAt || left.id.localeCompare(right.id))
    .map((entry) => entry.id);

  for (const pendingLootId of pendingIds) {
    const pending = simulated.pendingLoot[pendingLootId];
    if (!pending) continue;
    const current = getLootView(simulated, content).pending.find(
      (entry) => entry.id === pendingLootId,
    );
    if (!current || current.locked) continue;
    const decision = rankLootAssignment(simulated, content, pending);
    const recommendedAction = decision.type;
    const recommendedMemberId =
      decision.type === "assign" ? decision.candidate.memberId : undefined;
    const override = overrideById.get(pendingLootId);
    const action = override?.action ?? recommendedAction;
    const memberId =
      action === "assign"
        ? override?.action === "assign"
          ? override.memberId
          : recommendedMemberId
        : undefined;
    const selectedCandidate = memberId
      ? current.candidates.find((candidate) => candidate.memberId === memberId)
      : undefined;
    if (action === "assign" && (!memberId || !selectedCandidate?.equippable)) {
      throw new Error(`装备 ${current.item.name} 的草稿分配对象已经无法装备该物品。`);
    }

    const replacedItemNames = selectedCandidate?.replacedItemNames ?? [];
    let replacementSaleProceeds = 0;
    let proceeds: number;
    if (action === "assign") {
      const result = assignLoot(simulated, content, pendingLootId, memberId!);
      replacementSaleProceeds = result.saleProceeds;
      proceeds = result.saleProceeds;
      replacedCount += result.soldItemInstanceIds.length;
    } else {
      proceeds = sellLoot(simulated, content, pendingLootId);
    }
    projectedSaleProceeds += proceeds;
    entries.push({
      pendingLootId,
      activityId: current.activityId,
      ...(current.encounterId ? { encounterId: current.encounterId } : {}),
      acquiredAt: current.acquiredAt,
      item: current.item,
      activityName: current.activityName,
      dungeonName: current.dungeonName,
      encounterName: current.encounterName,
      activityOrder: current.activityOrder,
      encounterOrder: current.encounterOrder,
      saleValue: current.saleValue,
      recommendedAction,
      ...(recommendedMemberId ? { recommendedMemberId } : {}),
      action,
      ...(memberId ? { memberId } : {}),
      manuallyChanged:
        override !== undefined &&
        (override.action !== recommendedAction ||
          (override.action === "assign" && override.memberId !== recommendedMemberId)),
      candidates: current.candidates,
      ...(selectedCandidate ? { selectedCandidate } : {}),
      replacedItemNames,
      replacementSaleProceeds,
      proceeds,
      reasons:
        action === "assign"
          ? (selectedCandidate?.reasons ?? [])
          : [
              decision.type === "sell"
                ? decision.reason
                : "玩家选择出售这件仍可带来主职责提升的装备。",
            ],
    });
  }

  return {
    entries,
    locked: scopedPending.filter((entry) => entry.locked),
    assignedCount: entries.filter((entry) => entry.action === "assign").length,
    soldCount: entries.filter((entry) => entry.action === "sell").length,
    replacedCount,
    projectedSaleProceeds,
    immediateNoUpgradeCount: immediateNoUpgrade.length,
    immediateNoUpgradeSaleValue: immediateNoUpgrade.reduce(
      (sum, entry) => sum + entry.saleValue,
      0,
    ),
  };
}
