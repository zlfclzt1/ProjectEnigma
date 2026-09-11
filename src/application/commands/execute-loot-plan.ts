import type { ContentRegistry } from "../../content/registry";
import type { MemberId, PendingLootId } from "../../domain/shared/ids";
import type { GameCommand } from "../services/game-session";
import { assignLoot, assertLootUnlocked } from "./assign-loot";
import { sellLoot } from "./sell-loot";

export type LootPlanDecision =
  | {
      readonly pendingLootId: PendingLootId;
      readonly action: "assign";
      readonly memberId: MemberId;
    }
  | { readonly pendingLootId: PendingLootId; readonly action: "sell" };

export interface ExecuteLootPlanResult {
  readonly assigned: number;
  readonly sold: number;
  readonly replaced: number;
  readonly saleProceeds: number;
}

export function executeLootPlanCommand(
  content: ContentRegistry,
  decisions: readonly LootPlanDecision[],
): GameCommand<ExecuteLootPlanResult> {
  return {
    type: "execute-loot-plan",
    execute(draft) {
      const decisionById = new Map<PendingLootId, LootPlanDecision>();
      for (const decision of decisions) {
        if (decisionById.has(decision.pendingLootId)) {
          throw new Error("分配方案包含重复装备。");
        }
        decisionById.set(decision.pendingLootId, decision);
      }
      const unlocked = Object.values(draft.pendingLoot)
        .filter((pending) => {
          try {
            assertLootUnlocked(draft, pending.sourceActivityId);
            return true;
          } catch {
            return false;
          }
        })
        .sort(
          (left, right) => left.acquiredAt - right.acquiredAt || left.id.localeCompare(right.id),
        );
      if (
        unlocked.length !== decisions.length ||
        unlocked.some((pending) => !decisionById.has(pending.id))
      ) {
        throw new Error("必须为全部已解锁装备制定分配或出售方案。");
      }

      let assigned = 0;
      let sold = 0;
      let replaced = 0;
      let saleProceeds = 0;
      for (const pending of unlocked) {
        const decision = decisionById.get(pending.id)!;
        if (decision.action === "assign") {
          const result = assignLoot(draft, content, pending.id, decision.memberId);
          assigned += 1;
          replaced += result.soldItemInstanceIds.length;
          saleProceeds += result.saleProceeds;
        } else {
          sold += 1;
          saleProceeds += sellLoot(draft, content, pending.id);
        }
      }
      return { assigned, sold, replaced, saleProceeds };
    },
  };
}
