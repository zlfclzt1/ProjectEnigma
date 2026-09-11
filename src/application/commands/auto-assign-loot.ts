import type { GameCommand } from "../services/game-session";
import type { ContentRegistry } from "../../content/registry";
import { rankLootAssignment } from "../../domain/equipment/loot-assignment-ranking";
import type { GameState } from "../../domain/game-state";
import { assignLoot, assertLootUnlocked } from "./assign-loot";
import { sellLoot } from "./sell-loot";
import type { ActivityId, MemberId, PendingLootId } from "../../domain/shared/ids";

export interface AutoAssignLootEntryResult {
  readonly pendingLootId: PendingLootId;
  readonly action: "assign" | "sell";
  readonly memberId?: MemberId;
  readonly saleProceeds: number;
}

export interface AutoAssignLootResult {
  readonly assigned: number;
  readonly sold: number;
  readonly locked: number;
  readonly saleProceeds: number;
  readonly remainingFunds: number;
  readonly entries: readonly AutoAssignLootEntryResult[];
}

export function autoAssignLootCommand(
  content: ContentRegistry,
  activityId?: ActivityId,
): GameCommand<AutoAssignLootResult> {
  return {
    type: "auto-assign-loot",
    execute(draft) {
      return autoAssignLoot(draft, content, activityId);
    },
  };
}

export function autoAssignLoot(
  state: GameState,
  content: ContentRegistry,
  activityId?: ActivityId,
): AutoAssignLootResult {
  let assigned = 0;
  let sold = 0;
  let locked = 0;
  let saleProceeds = 0;
  const entries: AutoAssignLootEntryResult[] = [];
  const pendingLoot = Object.values(state.pendingLoot).sort(
    (left, right) => left.acquiredAt - right.acquiredAt || left.id.localeCompare(right.id),
  );
  for (const pending of pendingLoot) {
    if (activityId && pending.sourceActivityId !== activityId) continue;
    try {
      assertLootUnlocked(state, pending.sourceActivityId);
    } catch {
      locked += 1;
      continue;
    }
    const decision = rankLootAssignment(state, content, pending);
    if (decision.type === "assign") {
      const result = assignLoot(
        state,
        content,
        pending.id,
        decision.candidate.memberId,
        decision.candidate.replacementSlot,
      );
      saleProceeds += result.saleProceeds;
      entries.push({
        pendingLootId: pending.id,
        action: "assign",
        memberId: decision.candidate.memberId,
        saleProceeds: result.saleProceeds,
      });
      assigned += 1;
    } else {
      const proceeds = sellLoot(state, content, pending.id);
      saleProceeds += proceeds;
      entries.push({
        pendingLootId: pending.id,
        action: "sell",
        saleProceeds: proceeds,
      });
      sold += 1;
    }
  }
  return { assigned, sold, locked, saleProceeds, remainingFunds: state.guild.funds, entries };
}
