import type { ContentRegistry } from "../../content/registry";
import { equipmentSellValue } from "../../domain/equipment/item-value";
import {
  rankLootAssignment,
  type WishlistMatch,
} from "../../domain/equipment/loot-assignment-ranking";
import { resolveItemInstance } from "../../domain/equipment/resolve-item-instance";
import type { GameState } from "../../domain/game-state";
import type { MemberId, PendingLootId } from "../../domain/shared/ids";
import { assignLoot, assertLootUnlocked } from "../commands/assign-loot";
import { sellLoot } from "../commands/sell-loot";

export interface AutoLootPreviewEntry {
  readonly pendingLootId: PendingLootId;
  readonly itemName: string;
  readonly action: "assign" | "sell";
  readonly memberId?: MemberId;
  readonly memberName?: string;
  readonly wishlistMatch: WishlistMatch;
  readonly replacedItemNames: readonly string[];
  readonly primaryResponsibilityDelta?: number;
  readonly saleValue: number;
  readonly reasons: readonly string[];
}

export interface AutoLootPreview {
  readonly entries: readonly AutoLootPreviewEntry[];
  readonly assignedCount: number;
  readonly soldCount: number;
  readonly lockedCount: number;
  readonly projectedSaleProceeds: number;
}

export function getAutoLootPreview(state: GameState, content: ContentRegistry): AutoLootPreview {
  const simulated = structuredClone(state);
  const entries: AutoLootPreviewEntry[] = [];
  let lockedCount = 0;
  let projectedSaleProceeds = 0;
  const pendingLoot = Object.values(simulated.pendingLoot).sort(
    (left, right) => left.acquiredAt - right.acquiredAt || left.id.localeCompare(right.id),
  );
  for (const pending of pendingLoot) {
    try {
      assertLootUnlocked(simulated, pending.sourceActivityId);
    } catch {
      lockedCount += 1;
      continue;
    }
    const instance = simulated.itemInstances[pending.itemInstanceId];
    if (!instance) throw new Error("战利品装备实例不存在。");
    const definition = resolveItemInstance(instance, content).definition;
    const decision = rankLootAssignment(simulated, content, pending);
    if (decision.type === "sell") {
      const saleValue = equipmentSellValue(definition);
      entries.push({
        pendingLootId: pending.id,
        itemName: definition.name.zhCN,
        action: "sell",
        wishlistMatch: "none",
        replacedItemNames: [],
        saleValue,
        reasons: [decision.reason],
      });
      projectedSaleProceeds += sellLoot(simulated, content, pending.id);
      continue;
    }

    const member = simulated.members[decision.candidate.memberId]!;
    const replacedItemNames = decision.candidate.displacedItemInstanceIds.flatMap((instanceId) => {
      const replaced = simulated.itemInstances[instanceId];
      return replaced ? [resolveItemInstance(replaced, content).definition.name.zhCN] : [];
    });
    const result = assignLoot(
      simulated,
      content,
      pending.id,
      member.id,
      decision.candidate.replacementSlot,
    );
    projectedSaleProceeds += result.saleProceeds;
    entries.push({
      pendingLootId: pending.id,
      itemName: definition.name.zhCN,
      action: "assign",
      memberId: member.id,
      memberName: member.identity.name,
      wishlistMatch: decision.candidate.wishlistMatch,
      replacedItemNames,
      primaryResponsibilityDelta: decision.candidate.primaryResponsibilityDelta,
      saleValue: result.saleProceeds,
      reasons: decision.candidate.reasons,
    });
  }
  return {
    entries,
    assignedCount: entries.filter((entry) => entry.action === "assign").length,
    soldCount: entries.filter((entry) => entry.action === "sell").length,
    lockedCount,
    projectedSaleProceeds,
  };
}
